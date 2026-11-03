#!/usr/bin/env python3
"""Assemble only real CLT outputs on the verified course-app container, never clander."""
import argparse,copy,hashlib,io,json,zipfile
from pathlib import Path
BASE_SHA='0e317fbb436837b093f5903004ab1edeb5c9ba3e42c0b9034cc3d362d09d8f30'
def sha(b):return hashlib.sha256(b).hexdigest()
def compose(base_path,compiled_path,out):
 base=Path(base_path).read_bytes();compiled=Path(compiled_path).read_bytes();assert sha(base)==BASE_SHA,'Unknown base; use exact verified course APP'
 with zipfile.ZipFile(io.BytesIO(base)) as bz,zipfile.ZipFile(io.BytesIO(compiled)) as cz:
  bh=next(i for i in bz.infolist() if i.filename.endswith('.hap'));ch=next(i for i in cz.infolist() if i.filename.endswith('.hap'))
  with zipfile.ZipFile(io.BytesIO(bz.read(bh))) as source,zipfile.ZipFile(io.BytesIO(cz.read(ch))) as output:
   bc=json.loads(source.read('config.json'));cc=json.loads(output.read('config.json'));assert bc['app']['bundleName']=='com.hcbiu.elcton'
   assert cc['app']['bundleName']=='com.hcbiu.liubai'
   assert bc['app']['apiVersion']==cc['app']['apiVersion'],'API container profile drift'
   for key in ['deviceType','abilities','mainAbility','distro']:
    if key=='abilities':
     left=[{k:v for k,v in item.items() if not k.endswith('Id')} for item in bc['module'][key]];right=[{k:v for k,v in item.items() if not k.endswith('Id')} for item in cc['module'][key]];assert left==right,'Course ability model drift'
    else:assert bc['module'][key]==cc['module'][key],'Course container ABI field drift '+key
   records={i.filename:output.read(i) for i in output.infolist() if not i.is_dir()};infos={i.filename:i for i in source.infolist()}
   packed=io.BytesIO()
   with zipfile.ZipFile(packed,'w') as z:
    for i in output.infolist():
     if i.is_dir():continue
     carrier=infos.get(i.filename,i);z.writestr(copy.copy(carrier),records[i.filename])
   outer=io.BytesIO()
   with zipfile.ZipFile(outer,'w') as z:
    for i in bz.infolist():
     if i.is_dir():continue
     if i.filename==bh.filename:b=packed.getvalue()
     elif i.filename in cz.namelist():b=cz.read(i.filename)
     elif i.filename.endswith('.json') or i.filename=='pack.info':
      # Reject unknown carrier metadata rather than retaining a course identity.
      raise AssertionError('New compiler is missing course container metadata '+i.filename)
     else:b=bz.read(i)
     z.writestr(copy.copy(i),b)
 result=outer.getvalue();p=Path(out);p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(result)
 report={'scope':'exact verified elcton course container, all product code/resources from this real CLT build','courseAppSha256':BASE_SHA,'compiledAppSha256':sha(compiled),'appSha256':sha(result),'noClanderCarrier':True,'fileRecords':{n:{'sha256':sha(b),'bytes':len(b)} for n,b in records.items()},'appABIEqualsCourse':True}
 p.with_suffix('.course-provenance.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({k:report[k] for k in ['courseAppSha256','compiledAppSha256','appSha256','noClanderCarrier']}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('base');p.add_argument('compiled');p.add_argument('output');a=p.parse_args();compose(a.base,a.compiled,a.output)
