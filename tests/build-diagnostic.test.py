#!/usr/bin/env python3
"""Unit tests for diagnostic build reporting, not compiler/installation proof.

The in-memory archive is deliberately a byte-size fixture; real CLT artifacts
are verified separately after CI. No fixture is ever signed or delivered.
"""
import importlib.util
import inspect
import io
import json
from pathlib import Path
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('verify_app', ROOT / 'scripts/verify-app.py')
assert spec is not None and spec.loader is not None
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)


def size_fixture():
    config = json.loads((ROOT / 'entry/src/main/config.json').read_text())
    inner = io.BytesIO()
    with zipfile.ZipFile(inner, 'w') as hap:
        hap.writestr('config.json', json.dumps(config))
        hap.writestr('assets/js/MainAbility/app.js', b'a' * 10)
        for index, page in enumerate(verifier.EXPECTED):
            size = 49153 if index == 0 else 20
            hap.writestr('assets/js/MainAbility/' + page + '.js', b'x' * size)
    outer = io.BytesIO()
    with zipfile.ZipFile(outer, 'w') as app:
        app.writestr('entry-default.hap', inner.getvalue())
    return outer.getvalue()


class DiagnosticBuildTests(unittest.TestCase):
    def test_default_size_gate_remains_strict(self):
        with self.assertRaisesRegex(AssertionError, 'over-budget'):
            verifier.verify(size_fixture())

    def test_diagnostic_reports_size_risk_without_changing_archive(self):
        self.assertIn('diagnostic', inspect.signature(verifier.verify).parameters,
                      'Verifier has no explicit diagnostic reporting mode')
        data = size_fixture()
        original = bytes(data)
        report = verifier.verify(data, diagnostic=True)
        self.assertEqual(data, original)
        self.assertTrue(report[0]['diagnostic'])
        self.assertEqual(report[0]['overBudget'], [
            {'path': 'assets/js/MainAbility/pages/boot/boot.js',
             'bytes': 49153, 'appPlusPage': 49163}
        ])

    def test_build_mode_is_explicit_and_release_is_still_default(self):
        source = (ROOT / 'scripts/build.sh').read_text()
        self.assertIn('BUILD_MODE="${BUILD_MODE:-release}"', source,
                      'Build mode is still hard-coded')
        self.assertIn('buildMode="$BUILD_MODE"', source)
        self.assertIn('--diagnostic', source)


if __name__ == '__main__':
    unittest.main(verbosity=2)
