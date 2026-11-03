#!/usr/bin/env python3
import importlib.util,tempfile,unittest
from pathlib import Path
p=Path(__file__).parents[1]/'qa/friend_host.py';s=importlib.util.spec_from_file_location('friendhost',p);assert s and s.loader;m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
class Host(unittest.TestCase):
 def setUp(self):self.temp=tempfile.TemporaryDirectory();m.STATE=Path(self.temp.name);m.RECORDS={'assets/entry/resources/rawfile/test':'abc你好'.encode()};m.FAULT={'nextWrite':None}
 def tearDown(self):self.temp.cleanup()
 def call(self,method,**args):return m.perform({'bundle':'test.namespace','method':method,'args':args})
 def test_utf8_read_real_byte_ranges(self):self.assertEqual(self.call('readText',uri='internal://app/rawfile/test',position=3,length=3)['text'],'你')
 def test_real_persistent_disk(self):
  self.call('mkdir',uri='internal://app/lb2');self.call('writeText',uri='internal://app/lb2/n',text='实际写入',append=False);self.assertEqual((m.STATE/'test.namespace/lb2/n').read_text(),'实际写入');self.assertEqual(self.call('readText',uri='internal://app/lb2/n',length=4096)['text'],'实际写入')
 def test_write_fault_keeps_old_bytes(self):
  self.call('mkdir',uri='internal://app/lb2');self.call('writeText',uri='internal://app/lb2/n',text='old',append=False);m.FAULT['nextWrite']='I/O failure'
  with self.assertRaises(OSError):self.call('writeText',uri='internal://app/lb2/n',text='new',append=False)
  self.assertEqual((m.STATE/'test.namespace/lb2/n').read_text(),'old')
 def test_readonly_rawfile(self):
  with self.assertRaises(AssertionError):self.call('writeText',uri='internal://app/rawfile/test',text='x')
 def test_uri_escape_rejected(self):
  with self.assertRaises(AssertionError):self.call('readText',uri='internal://app/../outside')
if __name__=='__main__':unittest.main()
