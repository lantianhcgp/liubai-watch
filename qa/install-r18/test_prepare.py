#!/usr/bin/env python3
"""Unit fixtures are tiny synthetic archives, never candidate or simulator evidence."""
import importlib.util
import io
from pathlib import Path
import unittest
import zipfile

HERE=Path(__file__).parent
class PrepareTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec=importlib.util.spec_from_file_location('r18_prepare',HERE/'prepare.py')
        assert spec and spec.loader
        cls.m=importlib.util.module_from_spec(spec);spec.loader.exec_module(cls.m)
    def test_rewrite_retains_every_record_metadata_and_does_not_mutate_input(self):
        buf=io.BytesIO()
        with zipfile.ZipFile(buf,'w') as z:
            z.writestr('pages/',b'');z.writestr('pages/index.js',b'var a=1;\n');z.writestr('rawfile/key.dat',b'\x00\x01\xff')
        source=buf.getvalue()
        with zipfile.ZipFile(io.BytesIO(source)) as z: original_crc=[i.CRC for i in z.infolist()]
        result=self.m.rewrite(source,{'pages/index.js':b'var a=2;\n'})
        with zipfile.ZipFile(io.BytesIO(source)) as a,zipfile.ZipFile(io.BytesIO(result)) as b:
            self.assertEqual(a.namelist(),b.namelist());self.assertEqual([i.CRC for i in a.infolist()],original_crc)
            self.assertEqual(a.read('pages/index.js'),b'var a=1;\n');self.assertEqual(b.read('pages/index.js'),b'var a=2;\n')
            self.assertEqual(b.read('rawfile/key.dat'),a.read('rawfile/key.dat'));self.assertIsNone(b.testzip())
    def test_full_page_registration_is_required(self):
        self.assertEqual(self.m.EXPECTED,[f'pages/{p}/{p}' for p in ['boot','index','read','edit','menu','history','day','trash']])
    def test_combined_budget_counts_app_js_and_never_skips_a_page(self):
        rows={'assets/js/MainAbility/app.js':b'x'*100}
        for p in self.m.EXPECTED:rows['assets/js/MainAbility/'+p+'.js']=b'x'*49000
        self.assertEqual(len(self.m.budgets(rows)),8)
        rows['assets/js/MainAbility/pages/edit/edit.js']=b'x'*49100
        with self.assertRaises(AssertionError):self.m.budgets(rows)
        del rows['assets/js/MainAbility/pages/edit/edit.js']
        with self.assertRaises(AssertionError):self.m.budgets(rows)
if __name__=='__main__':unittest.main()
