import importlib.util
from pathlib import Path
import unittest
HERE=Path(__file__).parent
class SemanticTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  s=importlib.util.spec_from_file_location('semantics',HERE/'semantics.py');assert s and s.loader
  cls.m=importlib.util.module_from_spec(s);s.loader.exec_module(cls.m)
 def test_cursor_must_not_reuse_an_earlier_page_marker(self):
  text='LBQA LIST index rows=0\nLBQA READ id chars=1\n'
  cursor=self.m.match_after(text,r'LBQA READ id chars=1',0)['end']
  self.assertIsNone(self.m.match_after(text,r'LBQA LIST index rows=0',cursor))
  later=self.m.match_after(text+'LBQA LIST index rows=1\n',r'LBQA LIST index rows=1',cursor)
  self.assertGreater(later['end'],cursor)
 def test_only_exact_cross_app_warning_is_ignored(self):
  exact='[ACELite][ERROR]:current state(2) is invalid when changing ready state to show state.'
  r=self.m.errors(exact)
  self.assertEqual(r['fatal'],[]);self.assertEqual(r['ignored'],[exact])
  self.assertTrue(self.m.errors(exact+' FATAL out of memory')['fatal'])
 def test_checksum_uses_js_signed_utf16_semantics(self):
  self.assertEqual(self.m.revision('a'),'1:97')
  self.assertEqual(self.m.revision('a\n'),'2:3017')
 def test_mouse_plan_has_all_eight_user_routes_and_real_click_only(self):
  plan=self.m.user_plan({'h':{'hx':47,'hy':23,'hw':318,'hit':46,'newY':73,'newH':54,'dockX':41,'dockY':359,'dockW':330,'listY':173,'rowH':60,'contentX':24,'contentW':364},'e':{'hx':47,'hy':21,'hw':318,'hit':46,'keyX':24,'keysY':221,'footX':24,'footY':366,'footW':364},'r':{'hx':46,'hy':21,'hw':320,'hit':46}})
  names=[p['name'] for p in plan]
  for n in ['save','read-back','history','day','delete-confirm','delete-keep','delete-commit','trash','restore','reopen','key-n','key-i','candidate','key-long-q','tools']:
   self.assertIn(n,names)
  for p in plan:
   if 'point' in p:
    x,y=p['point'];self.assertTrue(0<=x<412 and 0<=y<=410,p)
 def test_keyboard_targets_respect_actual_margin_and_full_space_width(self):
  g={'h':{'hx':45.8,'hy':23.2,'hw':320.3,'hit':46,'newY':73.2,'newH':54.4,'dockX':41.2,'dockY':359.6,'dockW':329.6,'listY':173.6,'rowH':59.7,'contentX':29.1,'contentW':353.8},'e':{'hx':48.3,'hy':21.3,'hw':315.4,'hit':46,'keyX':24,'keysY':220.9,'footX':28.2,'footY':365.9,'footW':355.7},'r':{'hx':48.3,'hy':21.3,'hw':315.4,'hit':46}}
  p={x['name']:x for x in self.m.user_plan(g)}
  self.assertEqual(p['backspace']['point'],[313,388])
  self.assertEqual(p['newline']['point'],[362,388])
  self.assertEqual(p['candidate']['point'],[50,388])
  self.assertEqual(p['keyboard-close']['point'],[161,44])
  self.assertEqual(p['tools']['point'],[251,44])
 def test_reader_pages_use_actual_swipe_handler_not_invented_tap_buttons(self):
  g={'h':{'hx':45.8,'hy':23.2,'hw':320.3,'hit':46,'newY':73.2,'newH':54.4,'dockX':41.2,'dockY':359.6,'dockW':329.6,'listY':173.6,'rowH':59.7,'contentX':29.1,'contentW':353.8},'e':{'hx':48.3,'hy':21.3,'hw':315.4,'hit':46,'keyX':24,'keysY':220.9,'footX':28.2,'footY':365.9,'footW':355.7},'r':{'hx':48.3,'hy':21.3,'hw':315.4,'hit':46}}
  p={x['name']:x for x in self.m.user_plan(g)}
  self.assertEqual(p['read-next']['gesture'],'up')
  self.assertEqual(p['read-prev']['gesture'],'down')
 def test_unmatched_state_is_a_failure_not_green(self):
  self.assertFalse(self.m.approved({'ok':True,'orderedSemanticsOk':False,'signedProvenanceOk':True,'visualReviewed':True}))
if __name__=='__main__':unittest.main()
