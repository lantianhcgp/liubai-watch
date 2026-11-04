#!/usr/bin/env python3
import importlib.util,io,json,zipfile,unittest
from pathlib import Path
class VerifierTests(unittest.TestCase):
 def load(self):
  p=Path(__file__).parents[1]/'scripts/verify_app.py';self.assertTrue(p.is_file(),'artifact verifier missing')
  s=importlib.util.spec_from_file_location('verify_app',p);assert s and s.loader;m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
 def records(self):
  c={'app':{'bundleName':'com.hcbiu.liubai','version':{'code':5,'name':'0.2.3'},'apiVersion':{'compatible':40000010,'target':60101024}},'deviceConfig':{},'module':{'package':'com.hcbiu.liubai','js':[{'pages':['pages/'+p+'/'+p for p in ['index','read','edit','menu','history','day','trash']]}]}}
  d={'config.json':json.dumps(c).encode(),'assets/js/MainAbility/manifest.json':json.dumps({'pages':c['module']['js'][0]['pages']}).encode(),'assets/js/MainAbility/app.js':b'function a(){}'}
  for p in c['module']['js'][0]['pages']:d['assets/js/MainAbility/'+p+'.js']=b'LB2 new ViewModel({render:function(){}})'
  return d
 def test_accepts_complete_compiler_records(self):self.assertTrue(self.load().verify(self.records())['ok'])
 def test_rejects_missing_page(self):
  d=self.records();del d['assets/js/MainAbility/pages/edit/edit.js']
  with self.assertRaises(AssertionError):self.load().verify(d)
 def test_rejects_app_plus_page_over_budget(self):
  d=self.records();d['assets/js/MainAbility/pages/edit/edit.js']=b'x'*49152
  with self.assertRaises(AssertionError):self.load().verify(d)
 def test_rejects_version_reset(self):
  d=self.records();c=json.loads(d['config.json']);c['app']['version']['code']=0;d['config.json']=json.dumps(c).encode()
  with self.assertRaises(AssertionError):self.load().verify(d)
 def test_rejects_external_require(self):
  d=self.records();d['assets/js/MainAbility/pages/read/read.js']=b'require("reader")'
  with self.assertRaises(AssertionError):self.load().verify(d)
if __name__=='__main__':unittest.main()
