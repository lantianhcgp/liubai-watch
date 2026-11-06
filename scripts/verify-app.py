#!/usr/bin/env python3
"""Strict verification / sanitizing of REAL unsigned compiler archives."""
import argparse
import io
import json
import os
from pathlib import Path
import subprocess
import tempfile
import zipfile

EXPECTED = ['pages/' + p + '/' + p for p in ['index', 'read', 'edit', 'menu', 'history', 'day', 'trash']]
SCANNER = Path(__file__).with_name('scan-regexp.cjs')

def scan_js_members(files):
    """Fail closed on every packaged .js, including other abilities/rawfile.

    Acorn ES5 AST handles regexp-vs-division context, escapes, strings/comments;
    a text needle alone cannot guarantee zero actual regexp literals.
    """
    sources = {}
    for name, data in sorted(files.items()):
        if name.endswith('.js'):
            try:
                sources[name] = data.decode('utf-8')
            except UnicodeDecodeError:
                raise AssertionError('Invalid UTF-8 packaged JS: ' + name) from None
    try:
        proc = subprocess.run(['node', str(SCANNER)], input=json.dumps(sources),
                              text=True, capture_output=True, timeout=60, check=False)
        assert proc.returncode == 0, 'Zero-regexp parser unavailable/failed (source suppressed)'
        result = json.loads(proc.stdout)
        assert result['parser'] == 'acorn@8.19.0/es5', 'Unexpected zero-regexp parser'
        rows = result['rows']
        assert len(rows) == len(sources) and {r['file'] for r in rows} == set(sources), 'Incomplete zero-regexp parser result'
    except (OSError, ValueError, KeyError, TypeError, subprocess.TimeoutExpired):
        raise AssertionError('Zero-regexp parser unavailable/invalid result (source suppressed)') from None
    parse_errors = [r['file'] + ' at ' + str(r['parse_error']['line']) + ':' + str(r['parse_error']['column'])
                    for r in rows if 'parse_error' in r]
    assert not parse_errors, 'Non-ES5/invalid packaged JS: ' + ', '.join(parse_errors)
    test_calls = {name: files[name].count(b'.test(') for name in sources}
    report = {'members': len(sources), 'test_call_count': sum(test_calls.values()),
              'regexp_literal_count': sum(len(r['regexp_literals']) for r in rows),
              'regexp_reference_count': sum(len(r['regexp_references']) for r in rows),
              'parser': result['parser']}
    failures = [name + ' (' + str(n) + ')' for name, n in test_calls.items() if n]
    for row in rows:
        for kind in ('regexp_literals', 'regexp_references'):
            if row[kind]:
                positions = ','.join(str(p['line']) + ':' + str(p['column']) for p in row[kind])
                failures.append(row['file'] + ' (' + kind + '=' + str(len(row[kind])) + ' at ' + positions + ')')
    assert not failures, 'Install-34: forbidden regexp/.test( in packaged JS: ' + '; '.join(failures)
    return report

def rewrite(data, transform):
    out = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(data)) as source, zipfile.ZipFile(out, 'w') as dest:
        assert source.testzip() is None, 'ZIP integrity error'
        for info in source.infolist():
            dest.writestr(info, transform(info.filename, source.read(info)))
    return out.getvalue()

def fix(name, data):
    if name != 'config.json':
        return data
    config = json.loads(data.decode('utf-8-sig'))
    app = config['app']
    app.pop('appEnvironments', None)
    for key in ['compileSdkVersion', 'compileSdkType']:
        app.get('apiVersion', {}).pop(key, None)
    default = config.get('deviceConfig', {}).get('default', {})
    default.pop('debug', None)
    if not default:
        config.get('deviceConfig', {}).pop('default', None)
    mod = config['module']
    if mod.get('package', '').startswith('com.example'):
        mod['package'] = app['bundleName']
    return json.dumps(config, ensure_ascii=False, separators=(',', ':')).encode('utf-8')

def verify(data):
    reports = []
    with zipfile.ZipFile(io.BytesIO(data)) as outer:
        assert outer.testzip() is None
        assert len(outer.namelist()) == len(set(outer.namelist())), 'Duplicate APP paths'
        outer_js = {n: outer.read(n) for n in outer.namelist() if n.endswith('.js')}
        if outer_js:
            scan_js_members(outer_js)
        haps = [n for n in outer.namelist() if n.endswith('.hap')]
        assert haps, 'No HAP in APP'
        for name in haps:
            with zipfile.ZipFile(io.BytesIO(outer.read(name))) as hap:
                assert hap.testzip() is None
                assert len(hap.namelist()) == len(set(hap.namelist())), 'Duplicate HAP paths'
                assert 'config.json' in hap.namelist(), 'No root Lite config.json'
                raw = hap.read('config.json')
                assert not raw.startswith(b'\xef\xbb\xbf'), 'BOM in packaged config'
                cfg = json.loads(raw)
                assert cfg['app']['bundleName'] == 'liubai.nexus.by71x', 'Wrong bundle identity'
                assert cfg['app']['version'] == {'code': 8, 'name': '0.2.6'}, 'Wrong version'
                assert cfg['module']['deviceType'] == ['liteWearable']
                assert cfg['module']['js'][0]['pages'] == EXPECTED
                assert 'appEnvironments' not in cfg['app']
                assert not {'compileSdkVersion', 'compileSdkType'} & set(cfg['app'].get('apiVersion', {}))
                names = hap.namelist()
                bytecodes = sorted(n for n in names if n.endswith('.bc'))
                assert not bytecodes, 'JS-only compiler output contains forbidden bytecode: ' + ', '.join(bytecodes)
                pages = []
                for p in EXPECTED:
                    matches = [n for n in names if n.endswith('/' + p + '.js') or n == p + '.js']
                    assert matches, 'Missing compiled page: ' + p
                    for m in matches:
                        size = len(hap.read(m))
                        print(json.dumps({'compiled_page': m, 'bytes': size, 'limit': 49152}), flush=True)
                        assert 0 < size <= 49152, 'Empty/over-budget compiled page: ' + m
                        pages.append({'path': m, 'bytes': size})
                assert any(n.endswith('/app.js') or n == 'app.js' for n in names), 'Missing application lifecycle'
                js_scan = scan_js_members({m: hap.read(m) for m in names if m.endswith('.js')})
                print(json.dumps({'hap': name, 'js_scan': js_scan}), flush=True)
                reports.append({'hap': name, 'pages': pages, 'bundle': cfg['app']['bundleName'], 'js_scan': js_scan})
    return reports

def main():
    args = argparse.ArgumentParser()
    args.add_argument('--sanitize', action='store_true')
    args.add_argument('apps', nargs='+')
    opts = args.parse_args()
    for filename in opts.apps:
        path = Path(filename)
        assert path.is_file() and path.suffix == '.app', 'Real compiler .app missing: ' + filename
        data = path.read_bytes()
        if opts.sanitize:
            data = rewrite(data, lambda n, d: rewrite(d, fix) if n.endswith('.hap') else d)
        report = verify(data)
        if opts.sanitize:
            fd, temp = tempfile.mkstemp(dir=path.parent)
            try:
                with os.fdopen(fd, 'wb') as f:
                    f.write(data); f.flush(); os.fsync(f.fileno())
                os.replace(temp, path)
            finally:
                if os.path.exists(temp): os.unlink(temp)
            assert verify(path.read_bytes()) == report
        print(json.dumps({'app': filename, 'verified': report}, ensure_ascii=False))

if __name__ == '__main__':
    main()
