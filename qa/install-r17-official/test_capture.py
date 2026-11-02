#!/usr/bin/env python3
import importlib.util
import json
from pathlib import Path
import unittest

HERE = Path(__file__).parent

class CaptureTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        script = HERE / 'official_capture.py'
        assert script.is_file(), 'Official cold-start capture implementation is absent'
        spec = importlib.util.spec_from_file_location('official_capture', script)
        assert spec and spec.loader
        cls.capture = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(cls.capture)

    def test_args_use_manifest_bootstrap_and_512kb_without_skipping_to_index(self):
        args = self.capture.launch_args(Path('/bundle'), 'liubai.nexus.by71x',
                                        'pages/boot/boot', 'unit', 39010, Path('/setting.json'))
        self.assertEqual(args[args.index('-hs') + 1], '524288')
        self.assertEqual(args[args.index('-url') + 1], 'pages/boot/boot')
        self.assertEqual(args[args.index('-or') + 1:args.index('-or') + 3], ['412', '484'])
        self.assertNotIn('pages/index/index', args)

    def test_payload_archive_must_match_every_signed_record(self):
        actual = self.capture.verified_records(HERE / 'r16-exact-payload.zip',
                                               HERE / 'payload-provenance.json')
        self.assertEqual(len(actual), 165)
        self.assertEqual(json.loads(actual['assets/js/MainAbility/manifest.json'])['pages'][0],
                         'pages/boot/boot')

    def test_engine_errors_not_hidden_by_lifecycle_warning(self):
        error = '[ACELite][ERROR]: lifecycle noise FATAL out of memory'
        self.assertIn(error, self.capture.error_lines(error))

    def test_evidence_gate_is_not_nonblack_or_compile_success(self):
        self.assertFalse(self.capture.native_gate('', [], True))
        self.assertFalse(self.capture.native_gate('Get first render buffer', [{'size': [412, 484]}], False))

if __name__ == '__main__':
    unittest.main()
