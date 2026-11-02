#!/usr/bin/env python3
"""Keep the exact installed r15 carrier; update only 6 SDK-built startup/icon records."""
from pathlib import Path
import argparse,copy,hashlib,io,json,zipfile
BASE_SHA='94485304b5bca97a07f1d3c04b0c31ce486ef7787427044c265d0ed906d52189'
FIX_SHA='c75e6bdf5fea6ae7aae3523661baf60ed575b76f5ed7cffad4e0cbe4d4934cc9'
REPLACE=['assets/js/MainAbility/pages/boot/boot.js','assets/js/MainAbility/pages/boot/boot.js.map','assets/js/MainAbility/pages/index/index.js','assets/js/MainAbility/pages/index/index.js.map','assets/entry/resources/base/media/icon.png','assets/entry/resources/base/media/icon.png.bin']
def sha(b):return hashlib.sha256(b).hexdigest()
def inner(data):
 z=zipfile.ZipFile(io.BytesIO(data));assert z.testzip() is None;haps=[n for n in z.namelist() if n.endswith('.hap')];assert len(haps)==1;return z,haps[0],zipfile.ZipFile(io.BytesIO(z.read(haps[0])))
def rewrite(z,changes):
 out=io.BytesIO()
 with zipfile.ZipFile(out,'w') as target:
  for info in z.infolist():target.writestr(copy.copy(info),changes.get(info.filename,z.read(info)))
 return out.getvalue()
def main():
 p=argparse.ArgumentParser();p.add_argument('--base',type=Path,required=True);p.add_argument('--fix',type=Path,required=True);p.add_argument('--out',type=Path,required=True);a=p.parse_args();b=a.base.read_bytes();f=a.fix.read_bytes();assert sha(b)==BASE_SHA;assert sha(f)==FIX_SHA;assert a.out.resolve() not in (a.base.resolve(),a.fix.resolve())
 bo,bn,bi=inner(b);fo,fn,fi=inner(f)
 for n in ['config.json','assets/js/MainAbility/manifest.json','assets/js/MainAbility/app.js']:assert bi.read(n)==fi.read(n),n
 changes={n:fi.read(n) for n in REPLACE};newhap=rewrite(bi,changes);result=rewrite(bo,{bn:newhap});a.out.parent.mkdir(parents=True,exist_ok=True);a.out.write_bytes(result)
 _,_,check=inner(result);assert check.namelist()==bi.namelist()
 for n in bi.namelist():assert check.read(n)==changes.get(n,bi.read(n)),n
 assert a.base.read_bytes()==b and a.fix.read_bytes()==f
 report={'carrierAppSha256':BASE_SHA,'compilerCandidateSha256':FIX_SHA,'outputSha256':sha(result),'changedEntries':REPLACE,'sourceEntrySetPreserved':True,'extraBuildResourcesExcluded':True,'scope':'same boot/index subset and resources as r15; only startup/icon records updated'}
 a.out.with_suffix('.provenance.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
if __name__=='__main__':main()
