#!/usr/bin/env python3
"""Fail if the pinned release compiler adapter did not actually execute."""
import json
from pathlib import Path
import sys

reports = [json.loads(line) for line in Path(sys.argv[1]).read_text().splitlines() if line.strip()]
assert reports, 'JS-only compiler adapter did not execute'
for report in reports:
    assert report['loader_sha256'] == '7c22ea2478cf1ca83e40fe2289b1f9d350f35cd456152504d92b1ca46f3c5af6'
    assert report['buildMode'] == 'release' and report['mode'] == 'production'
    assert report['minimize'] is True and report['snapshot_plugins_removed'] == 1
print('PASS real JS-only compiler adapter:', len(reports), 'release configuration(s)')
