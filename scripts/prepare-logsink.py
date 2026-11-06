#!/usr/bin/env python3
"""Generate only public placeholders; credentials never go to Actions."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ENDPOINT = 'https://example.invalid/LIUBAI_LOG_ENDPOINT_PLACEHOLDER'
WRITE_KEY = 'LIUBAI_WRITE_KEY_PLACEHOLDER_20261105'
CANONICAL_SHA256 = '6810b5f9ff34fe4dd6cf4655f75a89172c248dd01bb40ade94937e567cefbe77'


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('--project', type=Path, default=ROOT)
    args = ap.parse_args()
    data = (ROOT / 'vendor/logsink.js').read_bytes()
    assert hashlib.sha256(data).hexdigest() == CANONICAL_SHA256, 'Pinned logger drift'
    assert len(data) <= 3072 and b'.test(' not in data, 'Logger source gate'
    common = args.project / 'entry/src/main/js/MainAbility/common'
    targets = [common/'logsink.js', common/'log-config.js']
    if any(p.exists() for p in targets):
        raise SystemExit('Refusing existing generated module/runtime config')
    config = {'endpoint':ENDPOINT, 'key':WRITE_KEY, 'app':'liubai', 'ver':'0.2.6'}
    common.mkdir(parents=True, exist_ok=True)
    with targets[0].open('xb') as f:
        f.write(data)
    with targets[1].open('x') as f:
        f.write('// Public CI placeholder. Configure only after local download.\nexport default '+json.dumps(config,separators=(',', ':'))+';\n')
    print('PASS pinned logger 2921B; public placeholders generated, no real credentials')


if __name__ == '__main__':
    main()
