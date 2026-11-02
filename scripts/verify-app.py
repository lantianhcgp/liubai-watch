#!/usr/bin/env python3
"""Strict verification / sanitizing of REAL unsigned compiler archives."""
import argparse
import io
import json
import os
from pathlib import Path
import tempfile
import zipfile

EXPECTED = ['pages/' + p + '/' + p for p in ['boot', 'index', 'read', 'edit', 'menu', 'history', 'day', 'trash']]

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

def verify(data, diagnostic=False):
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
                assert cfg['app']['bundleName'] == 'com.hcbiu.liubai', 'Wrong bundle identity'
                assert cfg['app']['version'] == {'code': 1, 'name': '0.1.0'}, 'Wrong version'
                assert cfg['module']['deviceType'] == ['liteWearable']
                assert cfg['module']['js'][0]['pages'] == EXPECTED
                assert 'appEnvironments' not in cfg['app']
                assert not {'compileSdkVersion', 'compileSdkType'} & set(cfg['app'].get('apiVersion', {}))
                assert 'debug' not in cfg.get('deviceConfig', {}).get('default', {}), 'Debug config injection'
                names = hap.namelist()
                pages = []
                for p in EXPECTED:
                    matches = [n for n in names if n.endswith('/' + p + '.js') or n == p + '.js']
                    assert matches, 'Missing compiled page: ' + p
                    for m in matches:
                        size = len(hap.read(m))
                        assert size > 0, 'Empty compiled page: ' + m
                        if not diagnostic:
                            assert size <= 49152, 'Empty/over-budget compiled page: ' + m
                        pages.append({'path': m, 'bytes': size})
                app_matches = [n for n in names if n.endswith('/app.js') or n == 'app.js']
                assert app_matches, 'Missing application lifecycle'
                # Conservative project budget, not a proven device quota.
                # Explicit diagnostic mode records risks without deleting code.
                app_bytes = max(len(hap.read(m)) for m in app_matches)
                over_budget = []
                for entry in pages:
                    combined = app_bytes + entry['bytes']
                    if entry['bytes'] > 49152 or combined > 49152:
                        over_budget.append({**entry, 'appPlusPage': combined})
                    if not diagnostic:
                        assert combined <= 49152, 'app.js + page over project 48KB budget: ' + entry['path']
                reports.append({'hap': name, 'pages': pages, 'appJs': app_bytes,
                                'bundle': cfg['app']['bundleName'], 'diagnostic': diagnostic,
                                'overBudget': over_budget,
                                'bytecode': [n for n in names if n.endswith('.bc')],
                                'sourceMaps': sum(n.endswith('.map') for n in names)})
    return reports

def main():
    args = argparse.ArgumentParser()
    args.add_argument('--sanitize', action='store_true')
    args.add_argument('--diagnostic', action='store_true',
                      help='Report size risks without treating this package as a release')
    args.add_argument('apps', nargs='+')
    opts = args.parse_args()
    for filename in opts.apps:
        path = Path(filename)
        assert path.is_file() and path.suffix == '.app', 'Real compiler .app missing: ' + filename
        data = path.read_bytes()
        if opts.sanitize:
            data = rewrite(data, lambda n, d: rewrite(d, fix) if n.endswith('.hap') else d)
        report = verify(data, diagnostic=opts.diagnostic)
        if opts.sanitize:
            fd, temp = tempfile.mkstemp(dir=path.parent)
            try:
                with os.fdopen(fd, 'wb') as f:
                    f.write(data); f.flush(); os.fsync(f.fileno())
                os.replace(temp, path)
            finally:
                if os.path.exists(temp): os.unlink(temp)
            assert verify(path.read_bytes(), diagnostic=opts.diagnostic) == report
        print(json.dumps({'app': filename, 'verified': report}, ensure_ascii=False))

if __name__ == '__main__':
    main()
