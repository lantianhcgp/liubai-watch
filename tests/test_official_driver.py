#!/usr/bin/env python3
import importlib.util,unittest,io,struct
from pathlib import Path
p=Path(__file__).parents[1]/'qa/official.py'
def module():
 s=importlib.util.spec_from_file_location('official_test',p);assert s and s.loader;m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
class Gate(unittest.TestCase):
 def test_marker_is_ordered(self):
  m=module();self.assertTrue(hasattr(m,'OrderedMarkers'),'ordered marker gate missing');r=m.OrderedMarkers();self.assertEqual(r.take('first then next','first')['text'],'first');self.assertEqual(r.take('first then next','next')['text'],'next');
  with self.assertRaises(m.GateError):r.take('first then next','first')
 def test_rejects_false_ack(self):
  m=module();self.assertTrue(hasattr(m,'verify_receipts'),'receipt gate missing')
  with self.assertRaises(m.GateError):m.verify_receipts([{'command':'MousePress','result':False}],['MousePress'])
 def test_no_frame_is_never_pass(self):
  m=module();self.assertTrue(hasattr(m,'frames'),'frame gate missing');self.assertEqual(m.frames(b''),[]);self.assertEqual(m.frames(b'garbage'),[])
 def test_safe_frame_header(self):
  m=module();self.assertTrue(hasattr(m,'frames'),'frame gate missing');h=bytearray(40);struct.pack_into('>I',h,0,0x12345678);struct.pack_into('>I',h,12,412);struct.pack_into('>I',h,16,484);struct.pack_into('>H',h,20,2);self.assertEqual(len(m.frames(bytes(h)+b'\xff\xd8demo\xff\xd9')),1)
 def test_critical_step_rejects_no_new_or_unchanged_pixels(self):
  m=module();self.assertTrue(hasattr(m,'select_event_frame'),'event frame freshness gate missing')
  old=(p.parent.parent/'tests/fixtures/native-frames/key-i.jpg').read_bytes()
  with self.assertRaises(m.GateError):m.select_event_frame([],old,True)
  with self.assertRaises(m.GateError):m.select_event_frame([(412,484,old)],old,True)
 def test_actual_new_frame_is_selected_instead_of_the_old_candidate_frame(self):
  m=module();self.assertTrue(hasattr(m,'select_event_frame'),'event frame freshness gate missing')
  old=(p.parent.parent/'tests/fixtures/native-frames/key-i.jpg').read_bytes()
  new=(p.parent.parent/'tests/fixtures/native-frames/choose-han.jpg').read_bytes()
  result=m.select_event_frame([(412,484,old),(412,484,new)],old,True)
  self.assertEqual(result,(412,484,new))
 def test_declared_unchanged_step_may_reuse_only_an_existing_previous_frame(self):
  m=module();self.assertTrue(hasattr(m,'select_event_frame'),'event frame freshness gate missing')
  self.assertIsNone(m.select_event_frame([],b'previous',False))
  with self.assertRaises(m.GateError):m.select_event_frame([],None,False)
 def test_plan_keeps_pointer_empty_save_negative_case_and_marks_critical_new_pixels(self):
  import sys
  sys.path.insert(0,str(p.parent))
  m=module();_,events=m.plan('rect',412,484)
  names=[e['name'] for e in events]
  self.assertIn('empty-save-rejected',names)
  self.assertLess(names.index('empty-save-rejected'),names.index('key-pan'))
  for name in ['new','empty-save-rejected','choose-han','lowercase']:
   event=next(e for e in events if e['name']==name)
   self.assertTrue(event['requireFreshFrame'],name)
   self.assertIsNotNone(event['point'])
if __name__=='__main__':unittest.main()
