#!/usr/bin/env python3
"""Structural same-artifact binding gates; not a native runtime claim."""
from pathlib import Path
import unittest

class ColdWorkflow(unittest.TestCase):
    def test_same_app_cold_before_all_four_windows(self):
        text = (Path(__file__).parents[1] / '.github/workflows/rebuild.yml').read_text()
        cold = text.find('python3 qa/official_cold.py')
        full = text.find('python3 qa/official.py')
        self.assertGreaterEqual(cold, 0, 'final cold path missing from exact artifact job')
        self.assertLess(cold, full, 'cold run must use fresh checkout before full profiles')
        line = next(line for line in text.splitlines() if 'python3 qa/official_cold.py' in line)
        self.assertIn('--app _built/liubai-elcton-v3.app', line)
        self.assertIn('--out official-evidence/cold-restart', line)
        self.assertIn('--expected-sha "$APP_SHA"', line)
        self.assertIn('compiler-proof.json', text)
        self.assertIn('APP_SHA=', text)

if __name__ == '__main__':
    unittest.main()
