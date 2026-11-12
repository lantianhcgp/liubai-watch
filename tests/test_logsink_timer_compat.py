"""Additional ownership-adapter gates. Original vendor and original tests unchanged."""
import hashlib
import importlib.util
from pathlib import Path
import unittest
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('timer_compat', ROOT/'scripts/logsink_timer_compat.py')
assert spec is not None and spec.loader is not None
compat = importlib.util.module_from_spec(spec)
spec.loader.exec_module(compat)

class TimerCompatTest(unittest.TestCase):
    def test_original_vendor_is_still_pinned_and_output_keeps_original_budget(self):
        data = (ROOT/'vendor/logsink.js').read_bytes()
        self.assertEqual(hashlib.sha256(data).hexdigest(), '6810b5f9ff34fe4dd6cf4655f75a89172c248dd01bb40ade94937e567cefbe77')
        output = compat.adapt(data)
        self.assertNotEqual(output, data)
        self.assertLessEqual(len(output), 3072)
        self.assertNotIn(b'.test(', output)
        for token in [b'X-Log-Key', b'"POST"', b'8e3', b'50:5e3', b'console[t]']:
            self.assertIn(token, output)

    def test_missing_or_duplicate_expected_shape_is_rejected(self):
        data = (ROOT/'vendor/logsink.js').read_bytes()
        for changed in [data.replace(b'h=0,u=0', b'h=1,u=0'), data+b'clearTimeout(h)', data.replace(b'u=setTimeout', b'u =setTimeout')]:
            with self.assertRaises(ValueError):
                compat.adapt(changed)

    def test_prepared_output_is_not_adapted_twice(self):
        data = (ROOT/'vendor/logsink.js').read_bytes()
        with self.assertRaises(ValueError):
            compat.adapt(compat.adapt(data))
