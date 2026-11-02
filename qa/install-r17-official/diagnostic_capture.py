#!/usr/bin/env python3
"""Diagnostic-only logging of exact r16 index bundle on the official engine.
Original baseline remains immutable; native APIs, state, params and UI not replaced.
Any exception is logged and rethrown. This altered payload is NOT a release candidate.
"""
import argparse
import importlib.util
import json
from pathlib import Path
import sys

HERE = Path(__file__).parent
spec = importlib.util.spec_from_file_location('official_capture', HERE / 'official_capture.py')
assert spec and spec.loader
native = importlib.util.module_from_spec(spec)
spec.loader.exec_module(native)


def once(text, old, new):
    assert text.count(old) == 1, 'Compiled diagnostic anchor does not match once: ' + old[:80]
    return text.replace(old, new, 1)


def instrument_index(data):
    text = data.decode('utf-8')
    text = once(text, '/******/ (function() {',
                '/******/ (function() {\nconsole.info("LBQA index.bundle.enter");\n' +
                'console.info("LBQA native.types string.slice="+typeof String.prototype.slice+" string.substring="+typeof String.prototype.substring+" array.slice="+typeof Array.prototype.slice);\n' +
                'try{console.info("LBQA native.slice.result "+"2026-11-02".slice(0,7));}catch(e){console.info("LBQA native.slice.error "+String(e));}\n' +
                'try{console.info("LBQA native.substring.result "+"2026-11-02".substring(0,7));}catch(e){console.info("LBQA native.substring.error "+String(e));}\n' +
                'try{console.info("LBQA native.replace.result "+"2026-11-02".replace("-"," / "));}catch(e){console.info("LBQA native.replace.error "+String(e));}')
    text = once(text, 'module.exports=new ViewModel(options);', '''
console.info("LBQA index.vm.enter");
var __qa_render=options.render;
options.render=function(){
  console.info("LBQA index.render.enter ready="+this.ready+" msg="+this.message);
  try{var result=__qa_render.apply(this,arguments);console.info("LBQA index.render.exit");return result;}
  catch(e){console.info("LBQA index.render.error "+String(e)+" name="+e.name+" message="+e.message);throw e;}
};
try{module.exports=new ViewModel(options);console.info("LBQA index.vm.exit");}
catch(e){console.info("LBQA index.vm.error "+String(e)+" name="+e.name+" message="+e.message);throw e;}
''')
    text = once(text, '''  onInit: function onInit() {
    _listPage["default"].init(this, 'index');
  },''', '''  onInit: function onInit() {
    console.info("LBQA index.onInit.enter");
    try{_listPage["default"].init(this, 'index');console.info("LBQA index.onInit.exit ready="+this.ready+" message="+this.message);}
    catch(e){console.info("LBQA index.onInit.error "+String(e)+" name="+e.name+" message="+e.message);throw e;}
  },''')
    text = once(text, 'function init(p, kind) {',
                'function init(p, kind) {\n  console.info("LBQA list.init.enter");')
    text = once(text, '  var q = _shell["default"].params(p);',
                '  console.info("LBQA list.params.before");\n  var q = _shell["default"].params(p);\n  console.info("LBQA list.params.after");')
    text = once(text, '  p.today = today();',
                '  console.info("LBQA list.today.before");\n  p.today = today();\n  console.info("LBQA list.today.after "+p.today);')
    text = once(text, '  p.day = q.day || \'\';',
                '  console.info("LBQA list.day.before q="+typeof q+" today="+typeof p.today+" slice="+typeof p.today.slice);\n  p.day = q.day || \'\';\n  console.info("LBQA list.day.after");')
    text = once(text, '  p.month = q.month || p.today.slice(0, 7);',
                '  console.info("LBQA list.month.before");\n  p.month = q.month || p.today.slice(0, 7);\n  console.info("LBQA list.month.after "+p.month);')
    for label, statement in [
        ('filter', "  p.filter = kind === 'trash' ? 'trash' : kind === 'day' ? 'day' : kind === 'history' ? 'month' : 'all';"),
        ('validateMonth', '    validMonth(p.month);'),
        ('emptyIcon', "  p.emptyIcon = kind === 'trash' ? 'restore' : 'book';"),
        ('dateLabel', "  p.dateLabel = p.today.slice(5).replace('-', ' / ');")
    ]:
        text = once(text, statement, '  console.info("LBQA list.' + label + '.before");\n' + statement + '\n  console.info("LBQA list.' + label + '.after");')
    # Restrict anchors to init; toggle and pagination also assign these fields.
    lo, hi = text.index('function init(p, kind) {'), text.index('function next(p) {')
    init_block = text[lo:hi]
    for label in ['emptyPrompt', 'headerTitle', 'sectionTitle', 'emptyText', 'monthLabel']:
        lines = [line for line in init_block.splitlines() if line.startswith('  p.' + label + ' =')]
        assert len(lines) == 1, label
        statement = lines[0]
        init_block = once(init_block, statement, '  console.info("LBQA list.' + label + '.before");\n' + statement + '\n  console.info("LBQA list.' + label + '.after");')
    text = text[:lo] + init_block + text[hi:]
    text = once(text, '  _shell["default"].init(p, function (info) {',
                '  console.info("LBQA list.device.before");\n  _shell["default"].init(p, function (info) {\n    console.info("LBQA list.device.callback "+info.windowWidth+"x"+info.windowHeight+" shape="+info.screenShape);')
    text = once(text, '    geometry(p, info, kind);',
                '    geometry(p, info, kind);\n    console.info("LBQA list.geometry.after");')
    text = once(text, 'function init(p, cb) {',
                'function init(p, cb) {\n  console.info("LBQA shell.init.enter");')
    text = once(text, '  _system["default"].getInfo({',
                '  console.info("LBQA shell.getInfo.before");\n  _system["default"].getInfo({')
    text = once(text, '    success: function success(d) {',
                '    success: function success(d) {\n      console.info("LBQA shell.getInfo.success "+d.windowWidth+"x"+d.windowHeight+" shape="+d.screenShape);')
    text = once(text, '    fail: function fail() {',
                '    fail: function fail() {\n      console.info("LBQA shell.getInfo.fail");')
    text = once(text, '        p.ready = false;\n        p.message = "\\u8BBE\\u5907\\u5C3A\\u5BF8\\u65E0\\u6548\\uFF0C\\u70B9\\u6309\\u91CD\\u8BD5";',
                '        console.info("LBQA shell.device.callback.error "+String(e));\n        p.ready = false;\n        p.message = "\\u8BBE\\u5907\\u5C3A\\u5BF8\\u65E0\\u6548\\uFF0C\\u70B9\\u6309\\u91CD\\u8BD5";')
    return text.encode('utf-8')


def date_control(data):
    """Counterfactual, not a release patch: remove only four proven-failing String.replace calls."""
    text = data.decode('utf-8')
    text = once(text, "m.date.slice(5).replace('-', ' / ')",
                "m.date.slice(5, 7) + ' / ' + m.date.slice(8)")
    text = once(text, "p.today.slice(5).replace('-', ' / ')",
                "p.today.slice(5, 7) + ' / ' + p.today.slice(8)")
    old = 'p.month.replace(\'-\', " \\u5E74 ")'
    assert text.count(old) == 2
    text = text.replace(old, 'p.month.slice(0, 4) + " \\u5E74 " + p.month.slice(5)')
    assert text.count('.replace(') == 1, 'Native Router.replace must be the only remaining replace call'
    return text.encode('utf-8')


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--sim', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    a = p.parse_args()
    records = native.verified_records(HERE / 'r16-exact-payload.zip', HERE / 'payload-provenance.json')
    key = 'assets/js/MainAbility/pages/index/index.js'
    changed = dict(records)
    changed[key] = instrument_index(records[key])
    root = a.sim / 'apps/liubai-r16-diagnostic'
    assert not root.exists(), 'Fresh diagnostic extraction required'
    for name, data in changed.items():
        q = root / name
        q.parent.mkdir(parents=True, exist_ok=True)
        q.write_bytes(data)
    a.out.mkdir(parents=True, exist_ok=True)
    proof = {'diagnosticOnly': True, 'noInstallablePackageProduced': True,
             'changeScope': 'Only logging wrappers in the index compiled JS; exceptions rethrown.',
             'changedRecords': [{'path': key, 'originalSha256': native.sha(records[key]),
                                 'diagnosticSha256': native.sha(changed[key]),
                                 'originalBytes': len(records[key]), 'diagnosticBytes': len(changed[key])}],
             'unchangedRecordCount': len(records) - 1}
    (a.out / 'diagnostic-provenance.json').write_text(json.dumps(proof, indent=2) + '\n')
    # Diagnostic JS is attached for independent review, never SDK or signing material.
    (a.out / 'diagnostic-index.js').write_bytes(changed[key])
    row = native.run_one(a.sim, a.out, 'r16-logged', root, 3)
    (a.out / 'diagnostic-report.json').write_text(json.dumps(row, ensure_ascii=False, indent=2) + '\n')
    assert all(row['cleanup'].values()), 'Diagnostic engine not cleaned up'
    control = dict(records)
    control[key] = date_control(records[key])
    control_root = a.sim / 'apps/liubai-date-control'
    assert not control_root.exists(), 'Fresh single-variable control required'
    for name, data in control.items():
        q = control_root / name
        q.parent.mkdir(parents=True, exist_ok=True)
        q.write_bytes(data)
    (a.out / 'date-control-index.js').write_bytes(control[key])
    date_row = native.run_one(a.sim, a.out, 'r16-date-control', control_root, 4)
    date_row['diagnosticOnly'] = True
    date_row['changedRecords'] = [key]
    date_row['indexSha256'] = native.sha(control[key])
    (a.out / 'date-control-report.json').write_text(json.dumps(date_row, ensure_ascii=False, indent=2) + '\n')
    assert all(date_row['cleanup'].values()), 'Date control engine not cleaned up'
    if not row['nativeGate'] or not date_row['nativeGate']:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
