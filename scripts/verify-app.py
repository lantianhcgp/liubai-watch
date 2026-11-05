#!/usr/bin/env python3
"""Strict verification / sanitizing of REAL unsigned compiler archives."""
import argparse
import io
import json
import os
from pathlib import Path
import tempfile
import zipfile

EXPECTED = ['pages/' + p + '/' + p for p in ['index', 'read', 'edit', 'menu', 'history', 'day', 'trash']]

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
        haps = [n for n in outer.namelist() if n.endswith('.hap')]
        assert haps, 'No HAP in APP'
        for name in haps:
            with zipfile.ZipFile(io.BytesIO(outer.read(name))) as hap:
                assert hap.testzip() is None
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
                js_members = [m for m in names if m.startswith('assets/js/') and m.endswith('.js')]
                test_calls = {m: hap.read(m).count(b'.test(') for m in js_members}
                hits = [m + ' (' + str(n) + ')' for m, n in sorted(test_calls.items()) if n]
                assert not hits, 'Install-34: forbidden .test( in packaged JS: ' + ', '.join(hits)
                js_scan = {'members': len(js_members), 'test_call_count': sum(test_calls.values())}
                print(json.dumps({'hap': name, 'js_scan': js_scan}), flush=True)
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
