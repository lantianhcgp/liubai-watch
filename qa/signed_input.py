#!/usr/bin/env python3
"""Reconstruct resources read back from a verified HAP, never its signing envelope.
Only the explicitly verified bundleName/config bytes may differ from compiler input.
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
        assert outer.testzip() is None, 'Invalid compiler ZIP checksum'
        names = outer.namelist()
        assert len(names) == len(set(names)), 'Duplicate compiler ZIP name'
        haps = [name for name in names if name.endswith('.hap')]
        assert len(haps) == 1, 'One complete Lite HAP required'
        with zipfile.ZipFile(io.BytesIO(outer.read(haps[0]))) as inner:
            assert inner.testzip() is None, 'Invalid compiler HAP checksum'
            files = [name for name in inner.namelist() if not name.endswith('/')]
            assert len(files) == len(set(files)), 'Duplicate payload name'
            assert all(name.isascii() and not name.startswith('/') and '\\' not in name
                       and all(part not in ('.', '..', '') for part in name.split('/'))
                       for name in files), 'Unsafe payload path'
            return haps[0], {name: inner.read(name) for name in files}


def validate_native_identity(config, expected):
    assert expected == 'com.hcbiu.liubai' or re.fullmatch(r'liubai\.nexus\.[a-z0-9]{5}', expected), 'Malformed expected identity'
    assert config['app']['bundleName'] == expected, 'Native input install identity drift'
    assert config['module']['package'] == 'com.hcbiu.liubai', 'Native developer package drift'


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
    for key in ('compilerAppSha256', 'signedHapSha256'):
        assert re.fullmatch(r'[0-9a-f]{64}', fixture[key]), 'Malformed digest: ' + key
    assert sha(original) == fixture['compilerAppSha256'], 'Compiler artifact identity mismatch'
    assert re.fullmatch(r'liubai\.nexus\.[a-z0-9]{5}', fixture['bundle']), 'Malformed install bundle'
    assert not output.exists() and output.resolve() != compiler.resolve(), 'Refusing overwrite'
    hap_name, source = records(original)
    signed_config = base64.b64decode(fixture['signedConfigBase64'], validate=True)
    before = json.loads(source['config.json'])
    after = json.loads(signed_config)
    assert before['app']['bundleName'] == 'com.hcbiu.liubai'
    before['app']['bundleName'] = fixture['bundle']
    assert before == after, 'Signing change is not limited to app.bundleName'
    exact = dict(source, **{'config.json': signed_config})
    expected = fixture['records']
    assert set(exact) == set(expected), 'Signed record inventory drift'
    for name, blob in exact.items():
        assert expected[name] == {'bytes': len(blob), 'sha256': sha(blob)}, 'Signed record drift: ' + name
    with zipfile.ZipFile(io.BytesIO(original)) as outer:
        inner = rewrite(outer.read(hap_name), {'config.json': signed_config})
    prepared = rewrite(original, {hap_name: inner})
    assert records(prepared)[1] == exact, 'Repacked resources drifted'
    proof = {
        'schema': 1, 'compilerAppSha256': sha(original),
        'signedHapSha256': fixture['signedHapSha256'], 'nativeInputAppSha256': sha(prepared),
        'bundle': fixture['bundle'], 'files': len(exact), 'signedRecordsByteExact': True,
        'configOnlyChanged': True, 'signedEnvelopeInstallationTested': False,
        'scope': 'Exact records from a locally verified signed.bin, not a watch installation test'
    }
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
    assert not args.report.exists(), 'Refusing proof overwrite'
    proof = prepare(args.compiler, json.loads(args.fixture.read_text()), args.output)
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(proof, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(proof))


if __name__ == '__main__':
    main()
