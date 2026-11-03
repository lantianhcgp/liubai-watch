"""Progress snapshots must not manufacture milestones on heartbeat ticks."""
import importlib.util
import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

MODULE = Path(__file__).resolve().parents[1] / 'scripts/progress_document.py'


class ProgressDocumentTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        if MODULE.exists():
            spec = importlib.util.spec_from_file_location('progress_document', MODULE)
            assert spec and spec.loader
            cls.m = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(cls.m)
        else:
            cls.m = None

    def setUp(self):
        self.assertIsNotNone(self.m, 'progress document implementation is missing')
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.state = self.root / 'progress.json'
        self.doc = self.root / 'progress.md'
        self.now = datetime(2026, 11, 3, 11, 40, tzinfo=timezone(timedelta(hours=8)))
        self.m.initialize(self.state, self.doc, '留白 R18',
                          '逐组件视觉与签名核验', ['签名交付', '真机确认'], self.now)

    def test_initialize_creates_readable_snapshot_and_explicit_pending_items(self):
        s = json.loads(self.state.read_text())
        self.assertEqual(s['status'], 'active')
        self.assertEqual(s['last_progress_at'], self.now.isoformat())
        text = self.doc.read_text()
        self.assertIn('逐组件视觉与签名核验', text)
        self.assertIn('签名交付', text)
        self.assertIn('未验收', text)

    def test_milestone_immediately_updates_document_and_evidence(self):
        later = self.now + timedelta(minutes=2)
        self.m.record(self.state, '工具四格点击通过', 'run:41571167597',
                      now=later)
        s = json.loads(self.state.read_text())
        self.assertEqual(s['last_progress_at'], later.isoformat())
        self.assertEqual(s['events'][-1]['evidence'], 'run:41571167597')
        self.assertIn('工具四格点击通过', self.doc.read_text())

    def test_fifteen_minute_tick_does_not_advance_actual_progress(self):
        later = self.now + timedelta(minutes=16)
        self.m.refresh(self.state, now=later)
        s = json.loads(self.state.read_text())
        self.assertEqual(s['last_progress_at'], self.now.isoformat())
        self.assertEqual(s['last_checked_at'], later.isoformat())
        self.assertEqual(len(s['events']), 1)
        self.assertIn('16 分钟未记录新进展', self.doc.read_text())
        self.assertIn('不等于任务自动推进', self.doc.read_text())

    def test_update_keeps_previous_document_backup(self):
        original = self.doc.read_text()
        self.m.record(self.state, '已完成字体裁切复验', 'native frame', now=self.now)
        self.assertEqual((self.root / '.backup' / 'progress.md.previous').read_text(), original)

    def test_terminal_status_makes_future_ticks_read_only(self):
        self.m.record(self.state, '已交付候选，真机未验', 'verified hap',
                      status='completed', now=self.now)
        before = self.doc.read_bytes()
        self.assertFalse(self.m.refresh(self.state, now=self.now + timedelta(hours=1)))
        self.assertEqual(self.doc.read_bytes(), before)

    def test_invalid_state_preserves_last_good_document(self):
        before = self.doc.read_bytes()
        self.state.write_text('{broken')
        with self.assertRaises(ValueError):
            self.m.refresh(self.state, now=self.now)
        self.assertEqual(self.doc.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
