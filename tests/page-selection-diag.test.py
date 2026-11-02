#!/usr/bin/env python3
"""Tests for page-list consistency in diagnostic subsets of real compiler APPs.

Fixtures below test archive selection only. They are not compiler output,
not signed, not simulator input, and never delivered.
"""
import importlib.util
import io
import json
from pathlib import Path
import unittest
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'qa/select-pages-diag.py'
FULL = ['pages/' + n + '/' + n for n in ('boot', 'index', 'edit')]
KEEP = FULL[:2]
PREFIX = 'assets/js/MainAbility/'


def fixture(manifest_pages=None):
    files = {
        'config.json': json.dumps({'module': {'js': [{'name': '.MainAbility', 'pages': FULL}]}}).encode(),
        PREFIX + 'manifest.json': json.dumps({'pages': manifest_pages or FULL, 'appID': 'com.hcbiu.liubai'}).encode(),
        PREFIX + 'app.js': b'application fixture',
        PREFIX + 'common/image.png.bin': b'image fixture',
        'resources/base/media/icon.png.bin': b'icon fixture',
        'pack.info': b'{}',
    }
    for p in FULL:
        files[PREFIX + p + '.js'] = b'page fixture ' + p.encode()
        files[PREFIX + p + '.js.map'] = b'map fixture ' + p.encode()
    stream = io.BytesIO()
    with zipfile.ZipFile(stream, 'w') as archive:
        for name, payload in files.items():
            archive.writestr(name, payload)
    return stream.getvalue(), files


class PageSelectionTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.selector = None
        if SCRIPT.exists():
            spec = importlib.util.spec_from_file_location('page_selector', SCRIPT)
            assert spec is not None and spec.loader is not None
            cls.selector = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(cls.selector)

    def test_both_manifests_and_actual_page_files_match(self):
        self.assertIsNotNone(self.selector, 'No coherent page subset implementation')
        source, original = fixture()
        selected, report = self.selector.select_hap(source, KEEP)
        with zipfile.ZipFile(io.BytesIO(selected)) as archive:
            self.assertEqual(json.loads(archive.read('config.json'))['module']['js'][0]['pages'], KEEP)
            self.assertEqual(json.loads(archive.read(PREFIX + 'manifest.json'))['pages'], KEEP)
            for p in KEEP:
                for suffix in ('.js', '.js.map'):
                    self.assertEqual(archive.read(PREFIX + p + suffix), original[PREFIX + p + suffix])
            self.assertNotIn(PREFIX + FULL[-1] + '.js', archive.namelist())
            self.assertNotIn(PREFIX + FULL[-1] + '.js.map', archive.namelist())
            self.assertEqual(archive.read(PREFIX + 'common/image.png.bin'), original[PREFIX + 'common/image.png.bin'])
            self.assertEqual(archive.read(PREFIX + 'app.js'), original[PREFIX + 'app.js'])
        self.assertEqual(report['keptPages'], KEEP)
        self.assertEqual(set(report['changed']), {'config.json', PREFIX + 'manifest.json'})

    def test_inconsistent_source_manifest_is_rejected(self):
        self.assertIsNotNone(self.selector, 'No page-list consistency validator')
        source, _ = fixture(manifest_pages=KEEP)
        with self.assertRaisesRegex(AssertionError, 'Source page lists disagree'):
            self.selector.select_hap(source, KEEP)

    def test_unknown_or_duplicate_kept_page_is_rejected(self):
        self.assertIsNotNone(self.selector, 'No checked page selection')
        source, _ = fixture()
        for keep in ([KEEP[0], KEEP[0]], ['pages/absent/absent'], []):
            with self.subTest(keep=keep), self.assertRaises(AssertionError):
                self.selector.select_hap(source, keep)


if __name__ == '__main__':
    unittest.main(verbosity=2)
