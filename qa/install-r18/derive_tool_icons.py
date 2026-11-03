#!/usr/bin/env python3
"""Split original MIT toolbar glyphs into independent native hit cells.

The original image and keyboard sheets remain byte-exact. No runtime image
transform is relied upon; official frames showed scaleX was ignored here.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
DIRECTORY = ROOT / 'entry/src/main/js/MainAbility/common/keyboard/common'
BOXES = {'prev': (36, 19, 65, 41), 'clipboard': (179, 18, 207, 44), 'next': (246, 19, 275, 41)}


def main():
    source = Image.open(DIRECTORY / 'toolBar.png').convert('RGBA')
    assert source.size == (310, 60)
    background = source.getpixel((150, 30))[0]
    for name, box in BOXES.items():
        glyph = source.crop(box)
        pixels = glyph.load()
        for y in range(glyph.height):
            for x in range(glyph.width):
                red, green, blue, alpha = pixels[x, y]
                # Original neutral toolbar fill is removed, preserving glyph AA.
                intensity = max(red, green, blue)
                opacity = max(0, min(255, round((intensity - background) * 255 / (255 - background))))
                pixels[x, y] = (241, 240, 232, round(opacity * alpha / 255))
        scale = min(22 / glyph.width, 22 / glyph.height)
        glyph = glyph.resize((round(glyph.width * scale), round(glyph.height * scale)), Image.Resampling.LANCZOS)
        result = Image.new('RGBA', (23, 23), (0, 0, 0, 0))
        result.alpha_composite(glyph, ((23 - glyph.width) // 2, (23 - glyph.height) // 2))
        result.save(DIRECTORY / ('tool_' + name + '.png'))
    print('Derived 3 original toolbar glyphs; original source remains untouched')


if __name__ == '__main__':
    main()
