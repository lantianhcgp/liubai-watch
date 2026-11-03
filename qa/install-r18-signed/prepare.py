#!/usr/bin/env python3
"""Reproduce the exact locally verified signed records, without uploading signing material.
The official previewer runs resources, not the signed.bin installation envelope.
"""
import argparse
import base64
import copy
import hashlib
import io
import json
from pathlib import Path
import re
import zipfile


def sha(blob):
    return hashlib.sha256(blob).hexdigest()


def records(blob):
    with zipfile.ZipFile(io.BytesIO(blob)) as outer:
        assert outer.testzip() is None
        names = outer.namelist()
        assert len(names) == len(set(names))
        haps = [n for n in names if n.endswith('.hap')]
        assert len(haps) == 1
        with zipfile.ZipFile(io.BytesIO(outer.read(haps[0]))) as inner:
            assert inner.testzip() is None
            files = [n for n in inner.namelist() if not n.endswith('/')]
            assert len(files) == len(set(files))
            assert all(n.isascii() and not n.startswith('/') and
                       all(p not in ('.', '..') for p in n.split('/')) for n in files)
            return haps[0], {n: inner.read(n) for n in files}


def rewrite(blob, changes):
    output = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(blob)) as source, zipfile.ZipFile(output, 'w') as target:
        for item in source.infolist():
            target.writestr(copy.copy(item), changes.get(item.filename, source.read(item)))
    return output.getvalue()


def prepare(compiler, fixture, output):
    compiler, output = Path(compiler), Path(output)
    original = compiler.read_bytes()
    assert fixture['schema'] == 1
    for name in ('compilerAppSha256', 'signedHapSha256'):
        assert re.fullmatch(r'[0-9a-f]{64}', fixture[name]), 'Malformed digest: ' + name
    assert sha(original) == fixture['compilerAppSha256'], 'Wrong compiler APP'
    assert re.fullmatch(r'liubai\.nexus\.[a-z0-9]{5}', fixture['bundle'])
    assert not output.exists() and output.resolve() != compiler.resolve(), 'Refusing overwrite'
    hap_name, source = records(original)
    signed_config = base64.b64decode(fixture['signedConfigBase64'], validate=True)
    before = json.loads(source['config.json'])
    after = json.loads(signed_config)
    assert before['app']['bundleName'] == 'com.hcbiu.liubai'
    before['app']['bundleName'] = fixture['bundle']
    assert before == after, 'Only signed bundleName may change'
    exact = dict(source, **{'config.json': signed_config})
    expected = fixture['records']
    assert set(exact) == set(expected), 'Signed record inventory mismatch'
    for name, blob in exact.items():
        assert expected[name] == {'bytes': len(blob), 'sha256': sha(blob)}, name
    with zipfile.ZipFile(io.BytesIO(original)) as outer:
        inner = rewrite(outer.read(hap_name), {'config.json': signed_config})
    prepared = rewrite(original, {hap_name: inner})
    assert records(prepared)[1] == exact, 'Repacked record mismatch'
    proof = {'schema': 1, 'compilerAppSha256': sha(original),
             'signedHapSha256': fixture['signedHapSha256'], 'nativeInputAppSha256': sha(prepared),
             'bundle': fixture['bundle'], 'files': len(exact),
             'signedRecordsByteExact': True, 'configOnlyChanged': True,
             'signedEnvelopeInstallationTested': False,
             'scope': 'exact files read back from locally verified signed.bin, not an install test'}
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(prepared)
    return proof


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler', type=Path, required=True)
    parser.add_argument('--fixture', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--report', type=Path, required=True)
    args = parser.parse_args()
    assert not args.report.exists(), 'Refusing report overwrite'
    proof = prepare(args.compiler, json.loads(args.fixture.read_text()), args.output)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(proof, indent=2) + '\n')
    print(json.dumps(proof))


if __name__ == '__main__':
    main()
