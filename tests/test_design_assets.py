"""Validate real V3-derived PNG bytes, never a fake image fixture."""
import importlib.util
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class AssetProvenanceTests(unittest.TestCase):
    def load(self):
        spec = importlib.util.spec_from_file_location('design_assets', ROOT / 'scripts/design_assets.py')
        assert spec and spec.loader
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        verify = getattr(module, 'verify_asset', None)
        self.assertTrue(callable(verify), 'every asset, including additions absent from old manifest, needs a hash gate')
        assert callable(verify)
        return verify

    def test_additional_assets_match_pinned_original_pixels(self):
        verify = self.load()
        for dest, source in [('trash-warm.png', 'trash_warm.png'), ('empty-copy-gold.png', 'empty_copy_gold.png')]:
            blob = (ROOT / 'entry/src/main/js/MainAbility/common/ui' / dest).read_bytes()
            self.assertTrue(verify('entry/src/main/js/MainAbility/common/icons/' + source, blob, {}))
            with self.assertRaises((AssertionError, ValueError)):
                verify('entry/src/main/js/MainAbility/common/icons/' + source, blob + b'corruption', {})

    def test_unknown_asset_cannot_bypass_hash_check(self):
        verify = self.load()
        with self.assertRaises((AssertionError, ValueError)):
            verify('unapproved.png', b'not approved', {})

if __name__ == '__main__':
    unittest.main()
