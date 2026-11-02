#!/usr/bin/env python3
"""Run this exact SDK's Lite parser on exact compiler JS and tiny controls."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess


def sha(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--sdk', required=True, type=Path)
    parser.add_argument('--output', required=True, type=Path)
    args = parser.parse_args()
    here = Path(__file__).resolve().parent
    provenance = json.loads((here / 'provenance.json').read_text())
    for item in provenance['fixtures']:
        assert sha((here / item['fixture']).read_bytes()) == item['sha256'], item['fixture']
    candidates = sorted(p for p in args.sdk.rglob('jerry') if p.is_file() and p.parent.name == 'bin')
    assert candidates, 'SDK has no bin/jerry; cannot invent a parser result'
    chosen = [p for p in candidates if 'ace-loader' in str(p)]
    assert len(chosen) == 1, f'Expected one ace-loader engine, found {len(chosen)}'
    jerry = chosen[0]
    args.output.mkdir(parents=True, exist_ok=True)
    inventory = [{'path': str(p), 'bytes': p.stat().st_size, 'sha256': sha(p.read_bytes())}
                 for p in sorted(jerry.parent.iterdir()) if p.is_file()]
    (args.output / 'sdk-native-bin-inventory.json').write_text(json.dumps(inventory, indent=2) + '\n')
    help_result = subprocess.run([str(jerry), '--help'], capture_output=True, text=True, timeout=20)
    help_text = help_result.stdout + help_result.stderr
    (args.output / 'jerry-help.txt').write_text(help_text)
    assert '--parse-only' in help_text, 'Native SDK binary does not advertise --parse-only'
    probes = {
        'minimal-no-regexp.js': "var value = 'abc'; value.indexOf('b');\n",
        'minimal-regexp.js': "var value = /a/;\n",
        'minimal-dead-regexp.js': "var value = false && /a/.test('a');\n",
    }
    for name, text in probes.items():
        (args.output / name).write_text(text)
    targets = [(here / item['fixture'], item['fixture'], 'exact-original') for item in provenance['fixtures']]
    targets += [(args.output / name, name, 'minimal') for name in probes]
    variants = here / 'variants'
    if variants.exists():
        targets += [(p, 'variants/' + p.name, 'regexp-only-transform') for p in sorted(variants.glob('*.js'))]
    records = []
    for filename, name, group in targets:
        command = [str(jerry), '--parse-only', str(filename)]
        result = subprocess.run(command, capture_output=True, text=True, timeout=25)
        text = result.stdout + result.stderr
        record = {'file': name, 'group': group, 'sha256': sha(filename.read_bytes()),
                  'bytes': filename.stat().st_size, 'returncode': result.returncode,
                  'parsePass': result.returncode == 0 and 'Script Error' not in text,
                  'output': text[:8000]}
        records.append(record)
        print(json.dumps({key: record[key] for key in ('file', 'returncode', 'parsePass')}))
        if text:
            print(text[:700].strip())
    report = {'scope': 'SDK native parse only; NOT device installation or full app runtime',
              'sdk': str(args.sdk), 'engine': str(jerry), 'engineSha256': sha(jerry.read_bytes()),
              'engineHelpReturncode': help_result.returncode, 'fixturesVerified': True,
              'records': records}
    (args.output / 'native-parser.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    original = [r for r in records if r['group'] == 'exact-original' and r['file'].startswith('original/liubai-')]
    minimal = {r['file']: r for r in records if r['group'] == 'minimal'}
    assert minimal['minimal-no-regexp.js']['parsePass'], 'Native parser cannot parse no-regexp control'
    assert any(r['parsePass'] for r in original), 'All real Liubai fixtures fail: inspect infrastructure before attribution'
    if variants.exists():
        variant_records = [r for r in records if r['group'] == 'regexp-only-transform']
        assert variant_records and all(r['parsePass'] for r in variant_records), 'A transformed page still fails the exact SDK parser'


if __name__ == '__main__':
    main()
