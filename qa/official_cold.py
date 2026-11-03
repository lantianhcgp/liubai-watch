#!/usr/bin/env python3
"""Official cold process restart with preserved native disk; original pinned APP only."""
import argparse
import hashlib
import json
from pathlib import Path
import re
import shutil
import subprocess


def pinned_input(path, expected):
    actual = hashlib.sha256(Path(path).read_bytes()).hexdigest()
    if actual != expected:
        raise ValueError('Expected original artifact SHA mismatch')
    return actual


def exact_record(root, record_id, text):
    if not re.fullmatch(r'r[A-Za-z0-9_-]+', record_id):
        raise ValueError('Invalid record id')
    matches = [p for p in Path(root).glob(record_id + '_*.txt') if p.read_text() == text]
    if not matches:
        raise ValueError('Actual native disk has no exact saved body for ' + record_id)
    file = matches[-1]
    return {'id': record_id, 'bodyFile': file.name, 'bodySha256': hashlib.sha256(file.read_bytes()).hexdigest(), 'bodyBytes': file.stat().st_size, 'textMatched': True}


def main():
    import official
    p = argparse.ArgumentParser()
    p.add_argument('--app', type=Path, required=True)
    p.add_argument('--sim', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    p.add_argument('--expected-sha', required=True)
    p.add_argument('--expected-bundle', default='com.hcbiu.liubai')
    a = p.parse_args()
    app_sha = pinned_input(a.app, a.expected_sha)
    a.sim = a.sim.resolve()
    a.out = a.out.resolve()
    a.out.mkdir(parents=True, exist_ok=True)
    records = official.read_app(a.app)
    config = json.loads(records['config.json'])
    manifest = json.loads(records['assets/js/MainAbility/manifest.json'])
    from signed_input import validate_native_identity
    validate_native_identity(config, a.expected_bundle)
    assert manifest['pages'] == official.PAGES
    root = a.sim / 'apps/liubai-final-cold'
    assert not root.exists()
    for key, value in records.items():
        assert '..' not in key.split('/') and not key.startswith('/')
        target = root / key
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(value)
    sandbox = a.sim / 'sdk/openharmony/previewer/liteWearable/bin/file_system/app/ace/data' / manifest.get('bundleName', 'undefined')
    assert not sandbox.exists(), 'Fresh official sandbox required, do not clear arbitrary existing user data'
    shutil.copytree(root / 'assets/entry/resources/rawfile', sandbox / 'rawfile')
    geom, events = official.plan('rect', 412, 484)
    # Actual taps type 你 + a + LF, then save. No data/API injection.
    initial = [event for event in events if event['name'] in ['cold-index', 'new', 'key-pan', 'key-n', 'key-i', 'choose-han', 'lowercase', 'letter-0', 'newline-0', 'save']]
    first = official.run(a.sim, a.out / 'first', root, 'rect', 412, 484, initial, 10)
    assert first['ok'] and all(first['cleanup'].values()), 'Initial genuine input/save did not finish cleanly'
    record_id = first['values']['id']
    proof_before = exact_record(sandbox / 'lb2', record_id, '你a\n')
    h = geom['h']
    cold = [
        {'name': 'restart-index', 'expect': r'LB2 APP create[\s\S]*?LB2 LIST index rows=1 offset=0'},
        {'name': 'restart-read', 'expect': r'LB2 READ id=' + re.escape(record_id) + r' version=1 .*font=normal', 'point': [h['contentX'] + h['contentW'] / 2, h['listY'] + h['rowH'] / 2]},
    ]
    second = official.run(a.sim, a.out / 'restart', root, 'rect', 412, 484, cold, 11)
    assert second['ok'] and all(second['cleanup'].values()), 'Restart/read original saved id failed'
    proof_after = exact_record(sandbox / 'lb2', record_id, '你a\n')
    assert proof_before == proof_after
    report = {'ok': True, 'appSha256': app_sha, 'bundle': a.expected_bundle, 'record': proof_after, 'scope': 'Original APP on official unmodified Huawei Simulator, real pointer input/save, native disk retained across terminated processes; not target-watch power-loss proof', 'noInjectedAppStateOrApi': True, 'noNotesSeeded': True, 'steps': len(first['steps']) + len(second['steps']), 'first': first, 'restart': second}
    (a.out / 'cold-acceptance.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({'ok': True, 'appSha256': app_sha, 'steps': report['steps'], 'exactNativeDiskBody': proof_after, 'processRestartVerified': True}), flush=True)


if __name__ == '__main__':
    main()
