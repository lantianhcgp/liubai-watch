"""Protect native menu font fallback without changing its style contract."""
import re
import unittest
from pathlib import Path


MENU_CSS = (Path(__file__).resolve().parents[1]
            / "entry/src/main/js/MainAbility/pages/menu/menu.css")

# Original declarations, except the unregistered explicit font family.
EXPECTED = {
    ".notice": "height:52px;font-size:18px;color:#adb1a9;text-align:center;",
    ".title": "color:#f1f0e8;text-align:center;text-overflow:ellipsis;",
    ".font-heading": "height:26px;font-size:16px;color:#adb1a9;",
    ".font-label": "height:28px;font-size:17px;text-align:center;",
    ".row-label": "margin-left:12px;text-overflow:ellipsis;",
    ".dialog-title": "font-size:25px;color:#f1f0e8;text-align:center;",
    ".dialog-hint": "font-size:18px;color:#adb1a9;text-align:center;",
    ".empty-text": "height:32px;font-size:18px;color:#adb1a9;text-align:center;",
    ".dock-label": "font-size:18px;color:#adb1a9;text-align:center;margin-left:7px;",
    ".dock-gold": "font-size:18px;color:#adb1a9;text-align:center;margin-left:7px;color:#e6c78c;",
}


def declarations(body):
    result = []
    for statement in body.split(";"):
        if not statement.strip():
            continue
        name, separator, value = statement.partition(":")
        if not separator or not name.strip() or not value.strip():
            raise ValueError("Invalid CSS declaration: " + statement)
        result.append((name.strip().lower(), value.strip()))
    return result


def selector_blocks(css):
    """Parse flat menu rules first; match exact comma-separated selectors."""
    css = re.sub(r"/\*.*?\*/", "", css, flags=re.S)
    blocks = {}
    for match in re.finditer(r"([^{}]+)\{([^{}]*)\}", css):
        body = declarations(match.group(2))
        for selector in match.group(1).split(","):
            blocks.setdefault(selector.strip(), []).extend(body)
    return blocks


class MenuNativeFontTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.blocks = selector_blocks(MENU_CSS.read_text(encoding="utf-8"))

    def test_text_selectors_use_platform_default_font(self):
        for selector in EXPECTED:
            with self.subTest(selector=selector):
                self.assertIn(selector, self.blocks)
                self.assertNotIn(
                    "font-family", [name for name, _ in self.blocks[selector]],
                    selector + " must let the registered platform default handle font-size",
                )

    def test_text_selectors_preserve_all_non_font_declarations(self):
        for selector, original in EXPECTED.items():
            with self.subTest(selector=selector):
                self.assertIn(selector, self.blocks)
                actual = [(name, value) for name, value in self.blocks[selector]
                          if name != "font-family"]
                self.assertEqual(actual, declarations(original))


if __name__ == "__main__":
    unittest.main()
