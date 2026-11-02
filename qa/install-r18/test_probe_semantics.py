import importlib.util
from pathlib import Path
import unittest
HERE=Path(__file__).resolve().parent
class ProbeTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  s=importlib.util.spec_from_file_location('prepare',HERE/'prepare.py');assert s and s.loader
  cls.m=importlib.util.module_from_spec(s);s.loader.exec_module(cls.m)
 def test_small_cli_oom_is_diagnostic_not_native_success(self):
  rows=[{'returncode':1,'output':'Script Error: null\nHeap size = 49144 bytes\nPeak allocated = 47664 bytes'}]
  r=self.m.parser_verdict(rows)
  self.assertEqual(r['status'],'inconclusive-small-cli-heap');self.assertFalse(r['runtimeProven']);self.assertFalse(r['allParsePassed'])
 def test_unknown_parse_error_is_blocking(self):
  r=self.m.parser_verdict([{'returncode':1,'output':'SyntaxError: Unexpected token'}])
  self.assertEqual(r['status'],'failed');self.assertFalse(r['runtimeProven'])
 def test_all_parse_pass_is_still_not_runtime_success(self):
  r=self.m.parser_verdict([{'returncode':0,'output':'Heap size = 49144 bytes'}])
  self.assertEqual(r['status'],'passed-small-cli');self.assertFalse(r['runtimeProven'])
if __name__=='__main__':unittest.main()
