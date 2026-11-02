#!/usr/bin/env python3
"""Regression: ZipInfo must be copied; provenance may not lose source readability."""
import importlib.util,io,zipfile
from pathlib import Path
s=importlib.util.spec_from_file_location('c',Path(__file__).with_name('compose-startup-control.py'));assert s and s.loader;m=importlib.util.module_from_spec(s);s.loader.exec_module(m)
b=io.BytesIO()
with zipfile.ZipFile(b,'w') as z:
 z.writestr('icon.bin',b'123');z.writestr('later.js',b'js')
with zipfile.ZipFile(io.BytesIO(b.getvalue())) as src:
 info=src.getinfo('icon.bin');length=info.file_size;offset=src.getinfo('later.js').header_offset
 result=m.rewrite(src,{'icon.bin':b'x'*100})
 assert info.file_size==length and src.getinfo('later.js').header_offset==offset
 assert src.read('icon.bin')==b'123' and src.read('later.js')==b'js'
with zipfile.ZipFile(io.BytesIO(result)) as dest:
 assert dest.testzip() is None;assert dest.read('icon.bin')==b'x'*100 and dest.read('later.js')==b'js'
print('PASS carrier rewrite retains source ZipInfo/data and coherent output')
