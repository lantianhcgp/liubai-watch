#!/usr/bin/env python3
"""Contract for real-pointer native menu coordinates, not runtime evidence."""
import sys
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'qa'))
import official


class MenuHits(unittest.TestCase):
    def test_record_and_app_hits_use_the_approved_scaled_rows(self):
        for name, shape, w, h in [('fit3', 'rect', 412, 484), ('circle454', 'circle', 454, 454), ('circle390', 'circle', 390, 390), ('rect336', 'rect', 336, 480)]:
            with self.subTest(profile=name):
                geometry, events = official.plan(shape, w, h)
                home = geometry['h']
                top = home['hy'] + home['hit'] + 8
                row_h = 74 * w / 412
                by_name = {event['name']: event for event in events}
                for event_name, row in [('pin-record', 0), ('copy-record', 1), ('delete-confirm', 2), ('confirm-again', 2), ('trash', 0)]:
                    point = by_name[event_name]['point']
                    self.assertAlmostEqual(point[0], home['contentX'] + home['contentW'] / 2)
                    self.assertAlmostEqual(point[1], top + (row + .5) * row_h)
                    self.assertLess(point[1], home['dockY'] - 8)
                self.assertEqual(by_name['move-start']['point'][1], top + 71 + 25, 'tools still uses its independent 50px rows')
                self.assertEqual(by_name['edit-current']['point'][1], top + 76 + 75, 'read settings still uses independent 50px rows')
                if name == 'circle390':
                    self.assertIn('scroll-record-menu', by_name, 'retain actual short-window read-menu scroll coverage')


if __name__ == '__main__':
    unittest.main()
