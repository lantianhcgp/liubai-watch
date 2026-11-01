#!/usr/bin/env python3
"""Read-only build prerequisites. Never edits business code."""
import json
from pathlib import Path
import struct

ROOT = Path(__file__).resolve().parents[1]

def load(name):
    return json.loads((ROOT / name).read_text(encoding='utf-8-sig'))

config = load('entry/src/main/config.json')
assert config['app']['bundleName'] == 'com.hcbiu.liubai'
assert config['app']['version'] == {'code': 1, 'name': '0.1.0'}
assert config['module']['deviceType'] == ['liteWearable']
expected = ['pages/' + p + '/' + p for p in ['index', 'read', 'edit', 'menu', 'history', 'day', 'trash']]
assert config['module']['js'][0]['pages'] == expected
for page in expected:
    for suffix in ['.js', '.hml', '.css']:
        name = ROOT / ('entry/src/main/js/MainAbility/' + page + suffix)
        assert name.is_file() and name.stat().st_size > 0, 'Missing page source: ' + str(name)
for icon, size in [('icon.png', 48), ('icon-small.png', 32)]:
    data = (ROOT / 'entry/src/main/resources/base/media' / icon).read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    assert struct.unpack('>II', data[16:24]) == (size, size)
profile = load('build-profile.json5')['app']['products'][0]
assert profile['compileSdkVersion'] == profile['targetSdkVersion'] == '6.1.1(24)'
assert profile['compatibleSdkVersion'] == '4.0.0(10)'
assert load('oh-package.json5')['modelVersion'] == '6.1.1'
assert load('hvigor/hvigor-config.json5')['modelVersion'] == '6.1.1'
assert load('entry/build-profile.json5')['apiType'] == 'faMode'
print('PASS source prerequisites: 7 page triples, identity/version, 48/32 PNG, FA CLT settings')
