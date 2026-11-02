#!/usr/bin/env python3
"""Single-variable native experiment: only the four string date-label replace calls."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
import zipfile

HERE = Path(__file__).parent

class DateControlTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location('diagnostic_capture', HERE / 'diagnostic_capture.py')
        assert spec and spec.loader
        cls.d = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.d)
        with zipfile.ZipFile(HERE / 'r16-exact-payload.zip') as z:
            cls.original = z.read('assets/js/MainAbility/pages/index/index.js')

    def test_changes_only_date_labels_and_keeps_native_router(self):
        changed = self.d.date_control(self.original)
        original = self.original.decode()
        expected = original.replace("m.date.slice(5).replace('-', ' / ')", "m.date.slice(5, 7) + ' / ' + m.date.slice(8)")
        expected = expected.replace("p.today.slice(5).replace('-', ' / ')", "p.today.slice(5, 7) + ' / ' + p.today.slice(8)")
        expected = expected.replace("p.month.replace('-', \" \\u5E74 \")", "p.month.slice(0, 4) + \" \\u5E74 \" + p.month.slice(5)")
        self.assertNotEqual(changed, self.original)
        self.assertEqual(changed.decode(), expected)
        self.assertEqual(changed.count(b'.replace('), 1, 'Native router.replace must remain')
        self.assertIn(b'_system2["default"].replace({', changed)
        with tempfile.TemporaryDirectory() as td:
            f = Path(td) / 'index.js'
            f.write_bytes(changed)
            result = subprocess.run(['node', '--check', str(f)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_wrong_payload_is_rejected(self):
        with self.assertRaises(AssertionError):
            self.d.date_control(b'different bundle')

if __name__ == '__main__':
    unittest.main()
