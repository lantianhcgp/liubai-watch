#!/usr/bin/env python3
"""Loopback-only archived hmlwsim host; persistent offline @system.file callbacks."""
import argparse
import errno
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import json
import os
from pathlib import Path, PurePosixPath
import re
import shutil
import tempfile
from urllib.parse import urlsplit

BASE = Path(__file__).resolve().parent
SIM = Path(os.environ.get('LIUBAI_SIM_DIR', str(Path.home() / 'liubai-watch-sim'))).resolve()
STATE = BASE / '.state' / 'fs'

class FileError(Exception):
    def __init__(self, text, code=202):
        self.code = code
        super().__init__(text)

def resolve(bundle, uri):
    if not isinstance(bundle, str) or not re.fullmatch(r'[A-Za-z0-9_.-]{1,120}', bundle) or '..' in bundle:
        raise FileError('Invalid bundle namespace')
    if not isinstance(uri, str) or not uri.startswith('internal://app/'):
        raise FileError('Only internal://app/ is supported')
    relative = uri[len('internal://app/'):]
    if '\\' in relative or '\x00' in relative or any(p in ('.', '..') for p in relative.split('/')):
        raise FileError('Unsafe file URI')
    if relative.startswith('rawfile/'):
        raise FileError('Packaged rawfile is read-only; use imported VirtualFS', 202)
    root = STATE / bundle
    root.mkdir(parents=True, exist_ok=True)
    p = root.joinpath(*PurePosixPath(relative).parts)
    if not p.resolve().is_relative_to(root.resolve()):
        raise FileError('Outside application sandbox')
    for ancestor in [p, *p.parents]:
        if ancestor == root.parent: break
        if ancestor.is_symlink(): raise FileError('Symlink not allowed')
    return root, p

def metadata(p, uri):
    s = p.stat()
    return {'uri': uri, 'type': 'dir' if p.is_dir() else 'file', 'length': s.st_size if p.is_file() else 0, 'lastModifiedTime': int(s.st_mtime * 1000)}

def perform(body):
    args = body.get('args', {})
    bundle, method = body.get('bundle'), body.get('method')
    root, p = resolve(bundle, args.get('uri', args.get('srcUri')))
    uri = args.get('uri', args.get('srcUri'))
    if method == 'mkdir':
        p.mkdir(parents=bool(args.get('recursive', False)), exist_ok=False)
        return None
    if method == 'get': return metadata(p, uri)
    if method == 'readText':
        raw = p.read_bytes()
        start = args.get('position', 0)
        size = args.get('length', len(raw))
        if not isinstance(start, int) or not isinstance(size, int) or start < 0 or size < 0:
            raise FileError('Invalid byte range')
        return {'text': raw[start:start + size].decode('utf-8')}
    if method == 'writeText':
        text = args.get('text')
        if not isinstance(text, str): raise FileError('text must be string')
        if not p.parent.is_dir(): raise FileNotFoundError('Parent directory missing')
        data = text.encode('utf-8')
        if args.get('append', False) and p.exists(): data = p.read_bytes() + data
        fd, tmp = tempfile.mkstemp(dir=p.parent)
        try:
            with os.fdopen(fd, 'wb') as f:
                f.write(data); f.flush(); os.fsync(f.fileno())
            os.replace(tmp, p)
        finally:
            if os.path.exists(tmp): os.unlink(tmp)
        return None
    if method == 'delete':
        if p == root: raise FileError('Cannot delete namespace root')
        p.unlink()
        return None
    if method == 'rmdir':
        if p == root: raise FileError('Cannot delete namespace root')
        if args.get('recursive', False): shutil.rmtree(p)
        else: p.rmdir()
        return None
    if method == 'list':
        return {'fileList': [metadata(x, uri.rstrip('/') + '/' + x.name) for x in sorted(p.iterdir())]}
    if method in ('move', 'copy'):
        _, dest = resolve(bundle, args.get('dstUri'))
        if not p.is_file(): raise FileNotFoundError('Source missing')
        if not dest.parent.is_dir(): raise FileNotFoundError('Destination parent missing')
        if method == 'copy': shutil.copyfile(p, dest)
        else: os.replace(p, dest)
        return {'uri': args['dstUri']}
    raise FileError('Unsupported file method: ' + str(method))

class Handler(SimpleHTTPRequestHandler):
    def allowed(self):
        expected = '127.0.0.1:' + str(self.server.server_port)
        return self.headers.get('Host') == expected and self.headers.get('Origin', 'http://' + expected) == 'http://' + expected

    def send_bytes(self, data, content='application/json', status=200):
        self.send_response(status)
        self.send_header('Content-Type', content)
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if not self.allowed(): return self.send_bytes(b'Forbidden', 'text/plain', 403)
        name = urlsplit(self.path).path
        if name == '/__health': return self.send_bytes(b'{"host":"liubai","persistent":true}')
        if name == '/qa/fs-host.js': return self.send_bytes((BASE / 'fs-host.js').read_bytes(), 'text/javascript')
        if name.startswith('/vendor/'):
            path = BASE / 'vendor' / Path(name).name
            if not path.is_file(): return self.send_error(404)
            return self.send_bytes(path.read_bytes(), 'text/javascript')
        if name == '/' or name == '/index.html':
            s = (SIM / 'index.html').read_text()
            s = s.replace('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js', '/vendor/jszip.min.js')
            s = s.replace('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js', '/vendor/html2canvas.min.js')
            needle = '<script src="js/runtime/api-registry.js"></script>'
            assert needle in s, 'Missing injection slot in archived simulator'
            s = s.replace(needle, '<script src="/qa/fs-host.js"></script>\n' + needle)
            return self.send_bytes(s.encode('utf-8'), 'text/html; charset=utf-8')
        return super().do_GET()

    def do_POST(self):
        if not self.allowed(): return self.send_bytes(b'Forbidden', 'text/plain', 403)
        if self.path != '/__fs': return self.send_error(404)
        try:
            size = int(self.headers.get('Content-Length', '0'))
            if not 0 < size <= 1048576: raise FileError('Invalid payload length')
            body = json.loads(self.rfile.read(size))
            result = {'ok': True, 'value': perform(body)}
        except FileError as e: result = {'ok': False, 'error': str(e), 'code': e.code}
        except FileNotFoundError as e: result = {'ok': False, 'error': str(e), 'code': 301}
        except FileExistsError as e: result = {'ok': False, 'error': str(e), 'code': 300}
        except OSError as e: result = {'ok': False, 'error': str(e), 'code': 202 if e.errno == errno.ENOSPC else 300}
        except (ValueError, TypeError, UnicodeError) as e: result = {'ok': False, 'error': str(e), 'code': 202}
        self.send_bytes(json.dumps(result, ensure_ascii=False).encode('utf-8'))

if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8791)
    args = parser.parse_args()
    assert SIM.is_dir(), 'Independent simulator archive missing'
    for lib in ['jszip.min.js', 'html2canvas.min.js']:
        assert (BASE / 'vendor' / lib).is_file(), 'Local library missing: run qa/start-sim.sh'
    server = ThreadingHTTPServer(('127.0.0.1', args.port), partial(Handler, directory=str(SIM)))
    print('Liubai offline host http://127.0.0.1:' + str(args.port), flush=True)
    server.serve_forever()
