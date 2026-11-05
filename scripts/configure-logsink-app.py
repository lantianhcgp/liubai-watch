#!/usr/bin/env python3
"""Transform only public app.js config literals locally, preserving provenance."""
import argparse
import hashlib
import io
import json
import os
from pathlib import Path
import re
import zipfile

ENDPOINT = 'https://example.invalid/LIUBAI_LOG_ENDPOINT_PLACEHOLDER'
WRITE_KEY = 'LIUBAI_WRITE_KEY_PLACEHOLDER_20261105'
APP_JS = 'assets/js/MainAbility/app.js'
APP_MAP = APP_JS + '.map'


def rewrite(data, transform):
    out = io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(data)) as src, zipfile.ZipFile(out, 'w') as dst:
        assert src.testzip() is None, 'ZIP CRC mismatch'
        assert len(src.namelist()) == len(set(src.namelist())), 'Duplicate ZIP paths'
        for info in src.infolist():
            dst.writestr(info, transform(info.filename, src.read(info)))
    return out.getvalue()


def files(data):
    with zipfile.ZipFile(io.BytesIO(data)) as z:
        return {n:z.read(n) for n in z.namelist() if not n.endswith('/')}


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('source', type=Path); ap.add_argument('output', type=Path)
    ap.add_argument('--runtime-config', type=Path, required=True)
    ap.add_argument('--report', type=Path)
    a = ap.parse_args()
    try:
        assert not a.output.exists(), 'Refusing existing output'
        runtime = json.loads(a.runtime_config.expanduser().read_text())
        endpoint, wk, rk = (runtime[k] for k in ('endpoint', 'write_key', 'read_key'))
        assert endpoint.startswith('https://') and len(wk) >= 16 and rk and wk != rk, 'Runtime invalid (suppressed)'
        data = a.source.read_bytes(); outer = files(data)
        names = [n for n in outer if n.endswith('.hap')]
        assert len(names) == 1, 'Exactly one compiler HAP required'
        name = names[0]; before = files(outer[name])
        assert not any(n.endswith('.bc') for n in before), 'Bytecode cannot be patched locally; require inspected JS-only compiler output'
        cfg = json.loads(before['config.json'])
        assert cfg['app']['bundleName'] == 'liubai.nexus.by71x'
        assert cfg['app']['version'] == {'code':8,'name':'0.2.6'}
        js = before[APP_JS].decode()
        assert ENDPOINT in js and WRITE_KEY in js, 'Compiled public config placeholders absent'
        replacements = {ENDPOINT:endpoint, WRITE_KEY:wk}
        def patch(n, b):
            if n == APP_JS:
                text = b.decode()
                for old, value in replacements.items():
                    replacement = json.dumps(value,ensure_ascii=True)[1:-1]
                    text = text.replace(old,replacement)
                return text.encode()
            if n == APP_MAP:
                def walk(value):
                    if isinstance(value, str):
                        for old,new in replacements.items(): value=value.replace(old,new)
                        return value
                    if isinstance(value,list): return [walk(x) for x in value]
                    if isinstance(value,dict): return {k:walk(v) for k,v in value.items()}
                    return value
                return json.dumps(walk(json.loads(b)),ensure_ascii=True,separators=(',', ':')).encode()
            return b
        inner = rewrite(outer[name], patch); after = files(inner)
        assert set(before) == set(after)
        changed = [n for n in before if before[n] != after[n]]
        assert APP_JS in changed and set(changed) <= {APP_JS,APP_MAP}
        assert all(before[n] == after[n] for n in before if n not in changed)
        assert endpoint.encode() in after[APP_JS] and wk.encode() in after[APP_JS], 'Runtime embedding mismatch (suppressed)'
        assert not any(rk.encode() in b for b in after.values()), 'Read credential leak (suppressed)'
        assert not any(old.encode() in b for old in replacements for b in after.values()), 'Placeholder remains'
        assert not any(re.search(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----',b) for b in after.values()), 'Private key leak (suppressed)'
        result = rewrite(data, lambda n,b:inner if n==name else b)
        assert all(files(result)[n] == b for n,b in outer.items() if n != name)
        a.output.parent.mkdir(parents=True,exist_ok=True)
        with a.output.open('xb') as f: f.write(result);f.flush();os.fsync(f.fileno())
        report = {'source':str(a.source),'output':str(a.output),'source_sha256':hashlib.sha256(data).hexdigest(),'configured_sha256':hashlib.sha256(result).hexdigest(),'changed_paths':changed,'all_other_files_identical':True,'read_key_absent':True,'private_key_absent':True,'bytes':len(result),'files':[{'path':n,'before_sha256':hashlib.sha256(b).hexdigest(),'after_sha256':hashlib.sha256(after[n]).hexdigest()} for n,b in before.items()]}
        if a.report:
            a.report.parent.mkdir(parents=True,exist_ok=True);a.report.write_text(json.dumps(report,indent=2)+'\n')
        print(json.dumps({k:v for k,v in report.items() if k!='files'}))
    except (AssertionError,OSError,KeyError,ValueError,zipfile.BadZipFile):
        raise SystemExit('FAIL local config/provenance gate (credential details suppressed)')


if __name__ == '__main__':
    main()
