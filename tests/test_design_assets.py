"""Validate real V3-derived PNG bytes, never a fake image fixture."""
import importlib.util
from pathlib import Path
import unittest
import subprocess
import sys


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

    def test_hash_only_import_does_not_load_graphics_dependencies(self):
        code = "import runpy; m=runpy.run_path(%r); assert callable(m['verify_asset'])" % str(ROOT / 'scripts/design_assets.py')
        result = subprocess.run([sys.executable, '-S', '-c', code], capture_output=True, text=True, timeout=10)
        self.assertEqual(result.returncode, 0, result.stderr)

    def test_additional_assets_match_pinned_original_pixels(self):
        verify = self.load()
        for dest, source in [('trash-warm.png', 'trash_warm.png'), ('empty-copy-gold.png', 'empty_copy_gold.png')]:
            blob = (ROOT / 'entry/src/main/js/MainAbility/common/ui' / dest).read_bytes()
            self.assertTrue(verify('entry/src/main/js/MainAbility/common/icons/' + source, blob, {}))
            with self.assertRaises((AssertionError, ValueError)):
                verify('entry/src/main/js/MainAbility/common/icons/' + source, blob + b'corruption', {})

    def test_native_dialog_cap_is_transparent_at_corners_and_solid_at_center(self):
        # The real file is generated without PNG filters so CI can inspect its
        # scanlines with stdlib only; no Pillow dependency in hash/pixel tests.
        import struct
        import zlib
        path = ROOT / 'entry/src/main/js/MainAbility/common/ui/dock-gold-cap.png'
        self.assertTrue(path.exists(), 'native dialog primary needs actual round-cap pixels')
        blob = path.read_bytes()
        self.assertEqual(blob[:8], b'\x89PNG\r\n\x1a\n')
        pos, packed, size = 8, b'', None
        while pos < len(blob):
            length = struct.unpack('>I', blob[pos:pos+4])[0]
            kind, data = blob[pos+4:pos+8], blob[pos+8:pos+8+length]
            if kind == b'IHDR':
                w, h, depth, color, _, _, interlace = struct.unpack('>IIBBBBB', data)
                self.assertEqual((w,h,depth,color,interlace), (22,44,8,6,0))
                size = (w,h)
            if kind == b'IDAT': packed += data
            pos += 12 + length
        self.assertEqual(size,(22,44))
        raw = zlib.decompress(packed)
        stride = 22*4+1
        self.assertEqual(len(raw),44*stride)
        self.assertTrue(all(raw[y*stride] == 0 for y in range(44)))
        pixel=lambda x,y: tuple(raw[y*stride+1+x*4:y*stride+5+x*4])
        self.assertEqual(pixel(21,0)[3],0)
        self.assertEqual(pixel(21,43)[3],0)
        self.assertEqual(pixel(0,22),(230,199,140,255))
        self.assertEqual(pixel(20,22),(230,199,140,255))
        self.assertGreater(sum(pixel(x,y)[3] for y in range(44) for x in range(22)),22*44*255*.7)

    def test_unknown_asset_cannot_bypass_hash_check(self):
        verify = self.load()
        with self.assertRaises((AssertionError, ValueError)):
            verify('unapproved.png', b'not approved', {})

if __name__ == '__main__':
    unittest.main()
