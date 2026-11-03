#!/usr/bin/env python3
"""Pure negative driver gates; these unit results are not native cold-start evidence."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

SOURCE = Path(__file__).resolve().parents[1] / 'qa/official_cold.py'
if SOURCE.exists():
    spec = importlib.util.spec_from_file_location('cold_driver', SOURCE)
    assert spec is not None and spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
else:
    class Pending:
        @staticmethod
        def exact_record(*_args):
            return None
        @staticmethod
        def pinned_input(*_args):
            return None
    module = Pending()

class ColdGate(unittest.TestCase):
    def test_record_must_be_backed_by_actual_body_not_only_marker(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            with self.assertRaises(ValueError):
                module.exact_record(root, 'r1', '你a\n')

    def test_disk_body_exact_utf8_is_verified_and_identity_matched(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'r1_1.txt').write_text('你a\n')
            proof = module.exact_record(root, 'r1', '你a\n')
            self.assertIsInstance(proof, dict)
            assert isinstance(proof, dict)
            self.assertEqual(proof['bodyBytes'], 5)
            self.assertEqual(proof['textMatched'], True)

    def test_wrong_body_is_not_labeled_as_cold_success(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'r1_1.txt').write_text('old')
            with self.assertRaises(ValueError):
                module.exact_record(root, 'r1', '你a\n')

    def test_artifact_hash_must_match_expected_source(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            p = root / 'app'
            p.write_bytes(b'synthetic driver data')
            with self.assertRaises(ValueError):
                module.pinned_input(p, 'bad-sha')

if __name__ == '__main__':
    unittest.main()
