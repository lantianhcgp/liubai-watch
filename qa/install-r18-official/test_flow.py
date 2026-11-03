#!/usr/bin/env python3
import importlib.util
import unittest
from pathlib import Path
HERE=Path(__file__).parent
class FlowTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  spec=importlib.util.spec_from_file_location('native_flow',HERE/'flow.py');assert spec and spec.loader
  cls.f=importlib.util.module_from_spec(spec);spec.loader.exec_module(cls.f)
 def test_actions_come_from_actual_geometry_and_are_safe_mouse_commands(self):
  events=self.f.plan()
  self.assertEqual([e['name'] for e in events],['new','keyboard-open','key-mode','key-a','save','reader-back','history','home','app-menu','trash','trash-back'])
  for e in events:
   x,y=e['point'];self.assertTrue(0<=x<412 and 0<=y<=410)
  cmd=self.f.mouse('MousePress',31,84)
  self.assertEqual(cmd,{'version':'1.0.0','command':'MousePress','type':'action','args':{'x':31,'y':84,'button':0}})
 def test_acceptance_sends_real_drag_not_direct_handler_call(self):
  s=importlib.util.spec_from_file_location('acceptance',HERE/'acceptance.py');assert s and s.loader
  a=importlib.util.module_from_spec(s);s.loader.exec_module(a)
  commands=a.pointer_sequence({'point':[206,300],'gesture':'up'})
  self.assertEqual(commands[0][0]['command'],'MousePress')
  self.assertEqual(commands[-1][0]['command'],'MouseRelease')
  self.assertEqual(commands[-1][0]['args']['y'],150)
  self.assertEqual([c[0]['command'] for c in commands[1:-1]],['MouseMove']*4)
 def test_pointer_sequence_preserves_tap_long_hold_and_reverse_drag(self):
  s=importlib.util.spec_from_file_location('acceptance',HERE/'acceptance.py');assert s and s.loader
  a=importlib.util.module_from_spec(s);s.loader.exec_module(a)
  tap=a.pointer_sequence({'point':[71,90],'hold':1.15})
  self.assertEqual([x[0]['command'] for x in tap],['MousePress','MouseRelease'])
  self.assertEqual(tap[0][1],1.15)
  down=a.pointer_sequence({'point':[206,150],'gesture':'down'})
  self.assertEqual(down[-1][0]['args']['y'],300)
  self.assertEqual(a.pointer_sequence({'name':'cold'}),[])
  with self.assertRaises(ValueError):a.pointer_sequence({'point':[206,150],'gesture':'left'})
 def test_no_local_module_shadows_python_runtime_dependencies(self):
  self.assertFalse((HERE/'logging.py').exists())
  self.assertFalse((HERE/'socket.py').exists())
  self.assertFalse((HERE/'threading.py').exists())
 def test_native_resource_argument_points_to_exact_packaged_assets(self):
  s=importlib.util.spec_from_file_location('acceptance',HERE/'acceptance.py');assert s and s.loader
  a=importlib.util.module_from_spec(s);s.loader.exec_module(a)
  root=Path('/fixture/exact-payload')
  self.assertEqual(a.resource_args(root),['-arp',str(root/'assets/entry')])
 def test_failures_are_never_release_success(self):
  self.assertFalse(self.f.release_success({'ok':False}))
  self.assertFalse(self.f.release_success({'ok':True,'scope':'diagnostic'}))
if __name__=='__main__':unittest.main()
