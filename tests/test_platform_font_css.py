"""Protect native font fallback and the original six-page CSS byte contract."""
import hashlib
import re
import unittest
from pathlib import Path


PAGES = Path(__file__).resolve().parents[1] / "entry/src/main/js/MainAbility/pages"
# Real-file SHA256 goldens after deleting only font-family:HYQiHei-65S;.
# Comparing the complete result also locks every original font-size byte.
GOLDEN_SHA256 = {
    "index": "3d0a37e5743e347b2a6908996372b4b2cc2fd3472e2b7134ab82fcdf8ce8cd8b",
    "read": "8f5de6c8c569a0aa7d17d89195ad9a585336747de8d5a9ae541974d255acd2ae",
    "edit": "e1e4c888f7763512b712acacfe8cefd88d0a5989d58c9f0abe55a7a15b0befcd",
    "history": "3d0a37e5743e347b2a6908996372b4b2cc2fd3472e2b7134ab82fcdf8ce8cd8b",
    "day": "3d0a37e5743e347b2a6908996372b4b2cc2fd3472e2b7134ab82fcdf8ce8cd8b",
    "trash": "3d0a37e5743e347b2a6908996372b4b2cc2fd3472e2b7134ab82fcdf8ce8cd8b",
}


class PlatformFontCssTests(unittest.TestCase):
    def test_no_unregistered_family_for_text(self):
        for page in GOLDEN_SHA256:
            with self.subTest(page=page):
                css = (PAGES / page / (page + ".css")).read_bytes()
                self.assertIsNone(
                    re.search(rb"\bfont-family\s*:", css, re.IGNORECASE),
                    page + ": let the registered native platform font handle text",
                )

    def test_all_non_font_bytes_preserved(self):
        for page, expected in GOLDEN_SHA256.items():
            with self.subTest(page=page):
                css = (PAGES / page / (page + ".css")).read_bytes()
                self.assertEqual(
                    hashlib.sha256(css).hexdigest(),
                    expected,
                    page + ": only delete font-family:HYQiHei-65S; "
                    "and preserve original sizes and all remaining CSS bytes",
                )


if __name__ == "__main__":
    unittest.main()
