#!/usr/bin/env python3
"""Tests for diagnostic-only wrappers; they must not substitute APIs or fix app behavior."""
import importlib.util
from pathlib import Path
import subprocess
import tempfile
import unittest
import zipfile

HERE = Path(__file__).parent

class DiagnosticTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        f = HERE / 'diagnostic_capture.py'
        assert f.is_file(), 'Native diagnostic logging wrapper is missing'
        s = importlib.util.spec_from_file_location('diagnostic_capture', f)
        assert s and s.loader
        cls.d = importlib.util.module_from_spec(s)
        s.loader.exec_module(cls.d)

    def test_logging_does_not_overwrite_native_apis_or_page_readiness(self):
        with zipfile.ZipFile(HERE / 'r16-exact-payload.zip') as z:
            original = z.read('assets/js/MainAbility/pages/index/index.js')
        logged = self.d.instrument_index(original)
        self.assertIn(b'LBQA index.bundle.enter', logged)
        self.assertIn(b'LBQA index.onInit.error', logged)
        self.assertIn(b'LBQA index.render.error', logged)
        self.assertIn(b'throw e;', logged)
        for needle in [b'$vm =', b'$app =', b'p.ready = true', b'getInfo =', b'readText =', b'eval(']:
            self.assertEqual(logged.count(needle), original.count(needle), needle)
        with tempfile.TemporaryDirectory() as td:
            f = Path(td) / 'index.js'
            f.write_bytes(logged)
            result = subprocess.run(['node', '--check', str(f)], capture_output=True, text=True)
            self.assertEqual(result.returncode, 0, result.stderr)

    def test_nonstrict_duplicate_anchor_is_rejected(self):
        with self.assertRaises(AssertionError):
            self.d.instrument_index(b'not the exact compiled bundle')

if __name__ == '__main__':
    unittest.main()
