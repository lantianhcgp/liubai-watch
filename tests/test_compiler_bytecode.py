"""Compiler archive seam: bytecode must fail before public artifact upload."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('verify_bytecode_archive', ROOT / 'scripts/verify-app.py')
gate = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gate)


def archive(bytecodes=()):
    config = {'app': {'bundleName': 'liubai.nexus.by71x', 'version': {'code': 8, 'name': '0.2.6'}},
              'module': {'deviceType': ['liteWearable'], 'js': [{'pages': gate.EXPECTED}]}}
    inner = io.BytesIO()
    with zipfile.ZipFile(inner, 'w') as z:
        z.writestr('config.json', json.dumps(config))
        for page in gate.EXPECTED:
            z.writestr('assets/js/MainAbility/' + page + '.js', 'var page = 1;')
        z.writestr('assets/js/MainAbility/app.js', 'var app = 1;')
        for name, data in bytecodes:
            z.writestr(name, data)
    outer = io.BytesIO()
    with zipfile.ZipFile(outer, 'w') as z:
        z.writestr('entry-default.hap', inner.getvalue())
    return outer.getvalue()


class BytecodeCompilerGate(unittest.TestCase):
    def verify(self, data):
        with contextlib.redirect_stdout(io.StringIO()):
            return gate.verify(data)

    def test_js_only_archive_remains_accepted(self):
        self.assertTrue(self.verify(archive()))

    def test_six_snapshot_members_with_full_same_name_js_are_rejected(self):
        bytecodes = [('assets/js/MainAbility/pages/' + p + '/' + p + '.bc', b'JRRY' + bytes(24))
                     for p in ('read', 'trash', 'menu', 'index', 'history', 'day')]
        with self.assertRaisesRegex(AssertionError, 'JS-only.*bytecode'):
            self.verify(archive(bytecodes))

    def test_empty_bytecode_outside_the_primary_ability_is_also_rejected(self):
        with self.assertRaisesRegex(AssertionError, 'JS-only.*bytecode'):
            self.verify(archive([('assets/js/OtherAbility/extra.bc', b'')]))
