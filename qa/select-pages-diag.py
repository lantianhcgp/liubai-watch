#!/usr/bin/env python3
"""Select a coherent STARTUP-ONLY diagnostic subset of a real compiler APP.

Retained compiled JS, source maps and assets stay byte-for-byte identical.
Both page lists are narrowed together. This is NOT a functional release:
controls that route outside the selected pages must not be used.
"""
import argparse
import copy
import hashlib
import io
import json
from pathlib import Path
import zipfile

PREFIX = 'assets/js/MainAbility/'
MANIFEST = PREFIX + 'manifest.json'


def select_hap(data, keep):
    assert keep and len(keep) == len(set(keep)), 'Empty/duplicate selected pages'
    with zipfile.ZipFile(io.BytesIO(data)) as source:
        assert source.testzip() is None, 'Source ZIP integrity failure'
        infos = source.infolist()
        names = [i.filename for i in infos]
        assert len(names) == len(set(names)), 'Duplicate source paths'
        config = json.loads(source.read('config.json'))
        manifest = json.loads(source.read(MANIFEST))
        assert len(config['module']['js']) == 1, 'Expected one JS ability'
        registered = config['module']['js'][0]['pages']
        assert registered == manifest['pages'], 'Source page lists disagree'
        actual = {n[len(PREFIX):-3] for n in names
                  if n.startswith(PREFIX + 'pages/') and n.endswith('.js')}
        assert actual == set(registered), 'Source registered/actual page files disagree'
        assert set(keep).issubset(actual), 'Unknown selected page'
        config['module']['js'][0]['pages'] = list(keep)
        manifest['pages'] = list(keep)
        replacements = {
            'config.json': json.dumps(config, ensure_ascii=False, separators=(',', ':')).encode(),
            MANIFEST: json.dumps(manifest, ensure_ascii=False, separators=(',', ':')).encode(),
        }
        dropped = []
        changed = []
        out = io.BytesIO()
        with zipfile.ZipFile(out, 'w') as target:
            for info in infos:
                name = info.filename
                should_drop = any(name == PREFIX + p + suffix
                                  for p in registered if p not in keep
                                  for suffix in ('.js', '.js.map', '.bc'))
                if should_drop:
                    dropped.append(name)
                    continue
                payload = source.read(info)
                current = replacements.get(name, payload)
                if current != payload:
                    changed.append(name)
                target.writestr(copy.copy(info), current)
        result = out.getvalue()
        with zipfile.ZipFile(io.BytesIO(result)) as selected:
            assert selected.testzip() is None
            assert json.loads(selected.read('config.json'))['module']['js'][0]['pages'] == keep
            assert json.loads(selected.read(MANIFEST))['pages'] == keep
            actual = {n[len(PREFIX):-3] for n in selected.namelist()
                      if n.startswith(PREFIX + 'pages/') and n.endswith('.js')}
            assert actual == set(keep)
            for name in selected.namelist():
                if name not in replacements:
                    assert selected.read(name) == source.read(name), 'Retained payload changed: ' + name
    return result, {'keptPages': list(keep), 'changed': changed,
                    'removed': dropped, 'retainedPayloadExact': True,
                    'scope': 'startup-only diagnostic; nonselected page routes unavailable'}


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument('input', type=Path)
    args.add_argument('output', type=Path)
    args.add_argument('--pages', nargs='+', required=True)
    args.add_argument('--report', type=Path, required=True)
    opts = args.parse_args()
    assert opts.input.resolve() != opts.output.resolve(), 'Do not overwrite source artifact'
    source_bytes = opts.input.read_bytes()
    out = io.BytesIO()
    report = []
    with zipfile.ZipFile(io.BytesIO(source_bytes)) as source, zipfile.ZipFile(out, 'w') as target:
        assert source.testzip() is None
        haps = [n for n in source.namelist() if n.endswith('.hap')]
        assert len(haps) == 1, 'Expected one Lite HAP'
        for info in source.infolist():
            payload = source.read(info)
            if info.filename == haps[0]:
                payload, entry = select_hap(payload, opts.pages)
                report.append(entry)
            target.writestr(copy.copy(info), payload)
    opts.output.parent.mkdir(parents=True, exist_ok=True)
    opts.output.write_bytes(out.getvalue())
    assert opts.input.read_bytes() == source_bytes
    with zipfile.ZipFile(opts.output) as result:
        assert result.testzip() is None
    result = {'source': str(opts.input.resolve()), 'output': str(opts.output.resolve()),
              'sourceSha256': hashlib.sha256(source_bytes).hexdigest(),
              'outputSha256': hashlib.sha256(opts.output.read_bytes()).hexdigest(),
              'entries': report}
    opts.report.parent.mkdir(parents=True, exist_ok=True)
    opts.report.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(result, ensure_ascii=False))


if __name__ == '__main__':
    main()
