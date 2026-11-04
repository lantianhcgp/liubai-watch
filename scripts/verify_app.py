#!/usr/bin/env python3
"""Complete genuine CLT package gate; does not patch templates or replace pages."""
import argparse,hashlib,io,json,re,zipfile
from pathlib import Path
PAGES=['pages/'+p+'/'+p for p in ['index','read','edit','menu','history','day','trash']]
PREFIX='assets/js/MainAbility/'
def records(app):
 with zipfile.ZipFile(app) as outer:
  names=[n for n in outer.namelist() if n.endswith('.hap')];assert len(names)==1,'One real lite entry expected'
  with zipfile.ZipFile(io.BytesIO(outer.read(names[0]))) as hap:
   assert len(hap.namelist())==len(set(hap.namelist())),'Duplicate package entries'
   return {n:hap.read(n) for n in hap.namelist() if not n.endswith('/')}
def verify(d):
 c=json.loads(d['config.json']);m=json.loads(d[PREFIX+'manifest.json']);a=c['app'];mod=c['module']
 assert a['bundleName']=='com.hcbiu.liubai','Wrong developer identity'
 assert a['version']=={'code':4,'name':'0.2.2'},'Source version drift'
 assert a['apiVersion']['compatible']==40000010 and a['apiVersion']['target']==60101024,'Wrong SDK profile'
 assert not c.get('deviceConfig',{}),'Debug config is not allowed'
 assert mod['package']=='com.hcbiu.liubai'
 assert mod['js'][0]['pages']==PAGES and m['pages']==PAGES,'Incomplete or replaced pages'
 app=d[PREFIX+'app.js'];sizes={}
 for page in PAGES:
  assert PREFIX+page+'.js' in d,'Missing page '+page
  s=d[PREFIX+page+'.js'];sizes[page]=len(s)+len(app);assert sizes[page]<49152,'App+page budget '+page
  assert b'LB2' in s,'Real page semantic code missing '+page
  assert not re.search(rb'\brequire\s*\(',s),'External source-loader require '+page
  assert b'new ViewModel' in s or b'ViewModel(' in s,'Actual compiled HML missing '+page
  assert b'clander' not in s.lower(),'Disallowed carrier code'
 assert b'createStore' not in app,'Storage must not inflate app.js'
 for n,b in d.items():
  assert not n.startswith('/') and '..' not in n.split('/'),'Unsafe path'
  assert not n.endswith(('.pem','.key','.p12','.p7b')),'Secret/profile in payload'
  assert b'PRIVATE KEY-----' not in b,'Embedded private key'
 return {'ok':True,'pages':PAGES,'pageSelectionPerformed':False,'appBytes':len(app),'appPlusPageBytes':sizes,'recordCount':len(d),'bundle':a['bundleName'],'version':a['version'],'records':{n:{'bytes':len(b),'sha256':hashlib.sha256(b).hexdigest()} for n,b in d.items()}}
def main():
 p=argparse.ArgumentParser();p.add_argument('app',type=Path);p.add_argument('--output',type=Path);a=p.parse_args();report=verify(records(a.app));report['appSha256']=hashlib.sha256(a.app.read_bytes()).hexdigest()
 if a.output:a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps({k:report[k] for k in ['ok','recordCount','appPlusPageBytes','appSha256']}))
if __name__=='__main__':main()
