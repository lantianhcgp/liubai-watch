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
  m=module();self.assertTrue(hasattr(m,'frames'),'frame gate missing');h=bytearray(40);struct.pack_into('>I',h,0,0x12345678);struct.pack_into('>I',h,12,412);struct.pack_into('>I',h,16,484);struct.pack_into('>I',h,20,2);self.assertEqual(len(m.frames(bytes(h)+b'\xff\xd8demo\xff\xd9')),1)
if __name__=='__main__':unittest.main()
