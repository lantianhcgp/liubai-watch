import importlib.util
from pathlib import Path
import tempfile
import unittest
HERE=Path(__file__).parent
class ResourcesTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  s=importlib.util.spec_from_file_location('acceptance',HERE/'acceptance.py');assert s and s.loader
  cls.m=importlib.util.module_from_spec(s);s.loader.exec_module(cls.m)
 def test_emulator_installs_only_exact_bundled_rawfile_in_native_sandbox(self):
  with tempfile.TemporaryDirectory() as d:
   base=Path(d);sim=base/'sim';root=base/'payload';src=root/'assets/entry/resources/rawfile/pinyin/key0.dat';src.parent.mkdir(parents=True);src.write_bytes(b'a!\x1f"V\x1e')
   proof=self.m.install_resources(sim,root,'test.bundle')
   target=sim/'sdk/openharmony/previewer/liteWearable/bin/file_system/app/ace/data/test.bundle/rawfile/pinyin/key0.dat'
   self.assertEqual(target.read_bytes(),src.read_bytes());self.assertEqual(proof['files'],1)
   self.assertTrue(proof['bytesExact']);self.assertFalse((target.parent.parent/'notes').exists())
 def test_existing_changed_resource_is_not_silently_overwritten(self):
  with tempfile.TemporaryDirectory() as d:
   base=Path(d);sim=base/'sim';root=base/'payload';src=root/'assets/entry/resources/rawfile/a.dat';src.parent.mkdir(parents=True);src.write_bytes(b'a')
   self.m.install_resources(sim,root,'test.bundle')
   p=sim/'sdk/openharmony/previewer/liteWearable/bin/file_system/app/ace/data/test.bundle/rawfile/a.dat';p.write_bytes(b'b')
   with self.assertRaises(AssertionError):self.m.install_resources(sim,root,'test.bundle')
if __name__=='__main__':unittest.main()
