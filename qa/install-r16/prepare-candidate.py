#!/usr/bin/env python3
"""Derive the r16 startup-only candidate from a real compiler APP.

Only boot/index compiler outputs are transformed with the already SDK-proven
regexp converter. Page selection reuses the verified two-list selector.
"""
import argparse
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import subprocess
import zipfile

HERE=Path(__file__).resolve().parent
PREFIX='assets/js/MainAbility/'
KEEP=['pages/boot/boot','pages/index/index']

def sha(data): return hashlib.sha256(data).hexdigest()
def rewrite(data,changes):
 out=io.BytesIO()
 with zipfile.ZipFile(io.BytesIO(data)) as source,zipfile.ZipFile(out,'w') as target:
  assert source.testzip() is None
  for info in source.infolist():target.writestr(info,changes.get(info.filename,source.read(info)))
 return out.getvalue()

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--app',type=Path,required=True);parser.add_argument('--output',type=Path,required=True);args=parser.parse_args()
 assert args.app.is_file() and args.app.suffix=='.app'
 out=args.output;out.mkdir(parents=True,exist_ok=True);original=out/'original';variants=out/'variants';original.mkdir(exist_ok=True)
 source_bytes=args.app.read_bytes()
 with zipfile.ZipFile(io.BytesIO(source_bytes)) as outer:
  haps=[n for n in outer.namelist() if n.endswith('.hap')];assert len(haps)==1;hap_name=haps[0];hap_bytes=outer.read(hap_name)
 with zipfile.ZipFile(io.BytesIO(hap_bytes)) as hap:
  for part in ['app','boot','index']:
   name=PREFIX+('app.js' if part=='app' else 'pages/'+part+'/'+part+'.js')
   (original/('liubai-'+part+'.js')).write_bytes(hap.read(name))
  icons={n:sha(hap.read(n)) for n in hap.namelist() if n.startswith('assets/entry/resources/base/media/icon')}
 subprocess.run(['node',str(HERE/'transform-pages.mjs'),str(original),str(variants)],check=True)
 changes={PREFIX+('app.js' if p=='app' else 'pages/'+p+'/'+p+'.js'):(variants/('liubai-'+p+'.js')).read_bytes() for p in ['app','boot','index']}
 transformed=rewrite(hap_bytes,changes)
 spec=importlib.util.spec_from_file_location('selector',HERE.parent/'select-pages-diag.py');assert spec and spec.loader;selector=importlib.util.module_from_spec(spec);spec.loader.exec_module(selector)
 selected,selection=selector.select_hap(transformed,KEEP)
 app=rewrite(source_bytes,{hap_name:selected});candidate=out/'liubai-r16-startup.app';candidate.write_bytes(app)
 with zipfile.ZipFile(io.BytesIO(selected)) as check:
  assert check.testzip() is None
  for name,payload in changes.items():assert check.read(name)==payload
  assert all(sha(check.read(n))==h for n,h in icons.items())
 assert args.app.read_bytes()==source_bytes
 report={'scope':'Two-page startup diagnostic, not full app. Other pages unavailable.','sourceApp':str(args.app.resolve()),'sourceAppSha256':sha(source_bytes),'candidateAppSha256':sha(app),'selection':selection,'icons':icons,'transform':json.loads((variants/'regexp-transformation.json').read_text())}
 (out/'provenance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'candidate':str(candidate),'sha256':sha(app),'pages':KEEP}))
if __name__=='__main__':main()
