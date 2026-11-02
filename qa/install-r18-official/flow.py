#!/usr/bin/env python3
"""Native user-path experiment. Exact compiler bytes; no injected JS/API/state.
Evidence is diagnostic until ordered semantic markers and exact signed provenance pass.
"""
import argparse
import hashlib
import importlib.util
import io
import json
from pathlib import Path
import re
import socket
import subprocess
import time
import zipfile

HERE=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location('official_capture',HERE.parent/'install-r17-official/official_capture.py')
assert spec and spec.loader
native=importlib.util.module_from_spec(spec);spec.loader.exec_module(native)

def mouse(command,x,y):
 return {'version':'1.0.0','command':command,'type':'action','args':{'x':x,'y':y,'button':0}}

def plan():
 # Recompute from unchanged layout.js, using Node only in the cloud driver.
 root=HERE.parents[1]
 js='''import fs from 'node:fs';const s=fs.readFileSync('entry/src/main/js/MainAbility/common/layout.js','utf8');const l=(await import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'))).default;const info={windowWidth:412,windowHeight:484,screenShape:'rect'};const h=l.home(info),e=l.editor(info,true),r=l.reader(info,'normal');console.log(JSON.stringify({h,e,r}));'''
 geom=json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=root,text=True))
 h,e,r=geom['h'],geom['e'],geom['r'];scale=141/180
 points=[('new',[206,h['newY']+h['newH']/2]),('keyboard-open',[206,lclosed(484)]),('key-mode',[e['footX']+22,e['footY']+22]),('key-a',[e['keyX']+(29+28.5)*scale,e['keysY']+90*scale]),('save',[h['hx']+h['hw']-23,e['hy']+23]),('reader-back',[r['hx']+23,r['hy']+23]),('history',[h['dockX']+h['dockW']*.75,h['dockY']+23]),('home',[h['dockX']+h['dockW']*.25,h['dockY']+23]),('app-menu',[h['hx']+h['hw']-23,h['hy']+23]),('trash',[206,h['hy']+h['hit']+8+37]),('trash-back',[h['hx']+23,h['hy']+23])]
 return [{'name':n,'point':[round(x),round(y)]} for n,(x,y) in points]

def lclosed(h):return h*.838-22

def release_success(report):
 return report.get('ok') is True and report.get('scope')=='exact-signed-native-user-path' and report.get('orderedSemanticsOk') is True and report.get('signedProvenanceOk') is True and report.get('visualReviewed') is True

def records_from_app(app):
 with zipfile.ZipFile(app) as outer:
  haps=[n for n in outer.namelist() if n.endswith('.hap')];assert len(haps)==1
  with zipfile.ZipFile(io.BytesIO(outer.read(haps[0]))) as inner:
   assert inner.testzip() is None
   return {n:inner.read(n) for n in inner.namelist() if not n.endswith('/')}

def split_snapshot(sim,out,label,data):
 f=out/(label+'.wsbin');f.write_bytes(data)
 frames,dec=native.decode_frames(sim,f,out,label)
 (out/(label+'.decode.log')).write_text(dec)
 return frames

def run(sim,out,root,sequence=21):
 manifest=json.loads((root/'assets/js/MainAbility/manifest.json').read_text());cfg=json.loads((root/'config.json').read_text())
 assert manifest['pages'][0]=='pages/boot/boot'
 engine=sim/'sdk/openharmony/previewer/liteWearable/bin/Simulator';engine.chmod(engine.stat().st_mode|0o111)
 prefix='lbr18_'+str(int(time.time()))+'_'+str(sequence);port=39270+sequence
 settings=json.loads((sim/'app/ci_setting.json').read_text())
 for v in settings.get('setting',{}).values():
  if 'Language' in v:v['Language']['args']['Language']='zh-CN'
 sf=out/'setting.json';sf.write_text(json.dumps(settings))
 cmd=native.CommandPipe(prefix);log=out/'native.engine.log';raw=out/'native.wsbin';wlog=out/'native.websocket.log'
 args=native.launch_args(root/'assets/js/MainAbility',cfg['app']['bundleName'],manifest['pages'][0],prefix,port,sf)
 proc=ws=None;steps=[];failure=None;before=0
 eh=log.open('wb');wh=wlog.open('wb')
 try:
  proc=subprocess.Popen([str(engine)]+args,cwd=engine.parent,stdout=eh,stderr=subprocess.STDOUT)
  deadline=time.monotonic()+9
  while not native.tcp_ready(port):
   if proc.poll() is not None:raise RuntimeError('Native engine exited before websocket')
   if time.monotonic()>deadline:raise TimeoutError('Native engine websocket unavailable')
   cmd.stop.wait(.08)
  ws=subprocess.Popen(['node',str(sim/'ws_client.js'),str(port),str(raw),'65000'],stdout=wh,stderr=subprocess.STDOUT)
  # Bounded driver settling only, not any replacement application timer.
  cmd.stop.wait(3)
  data=raw.read_bytes() if raw.exists() else b'';before=len(data)
  steps.append({'name':'cold','rawBytes':before,'frames':split_snapshot(sim,out,'00-cold',data),'logOffset':len(log.read_bytes())})
  for i,event in enumerate(plan()):
   if proc.poll() is not None:raise RuntimeError('Native engine exited during '+event['name'])
   x,y=event['point'];sent=[]
   for name in ['MousePress','MouseRelease']:
    payload=mouse(name,x,y);blob=(json.dumps(payload,separators=(',',':'))+'\0').encode();live=0
    for c in list(cmd.connections):
     try:c.sendall(blob);live+=1
     except OSError:pass
    if live==0:raise RuntimeError('Command connection not alive')
    sent.append(payload);cmd.stop.wait(.10)
   cmd.stop.wait(1.2)
   data=raw.read_bytes() if raw.exists() else b''
   chunk=data[before:];before=len(data)
   steps.append({'name':event['name'],'point':event['point'],'sent':sent,'rawBytes':len(chunk),'frames':split_snapshot(sim,out,str(i+1).zfill(2)+'-'+event['name'],chunk),'logOffset':len(log.read_bytes())})
   text=log.read_text(errors='replace')
   if re.search(r'Exception backtrace|Console Error|out.of.memory|\bFATAL\b',text,re.I):raise RuntimeError('Native fatal/exception after '+event['name'])
  cmd.stop.wait(2)
 except Exception as e:failure=repr(e)
 finally:
  alive=proc is not None and proc.poll() is None
  for child in [ws,proc]:
   if child and child.poll() is None:
    child.terminate()
    try:child.wait(timeout=3)
    except subprocess.TimeoutExpired:child.kill();child.wait(timeout=3)
  eh.close();wh.close();cmd.close()
 text=log.read_text(errors='replace')
 cleanup={'engineStopped':proc is not None and proc.poll() is not None,'websocketStopped':ws is None or ws.poll() is not None,'commandThreadStopped':not cmd.thread.is_alive(),'commandPipeRemoved':not cmd.path.exists(),'imagePortClosed':not native.tcp_ready(port)}
 report={'ok':False,'scope':'diagnostic-native-compiler-user-path','noInjectedAppStateOrApi':True,'firstPage':manifest['pages'][0],'bundle':cfg['app']['bundleName'],'heap':524288,'args':args,'engineSha256':native.sha(engine.read_bytes()),'aliveAtEnd':alive,'failure':failure,'steps':steps,'errors':native.error_lines(text),'cleanup':cleanup,'signedProvenanceOk':False,'orderedSemanticsOk':False,'visualReviewed':False,'messages':cmd.messages}
 (out/'native-flow.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({k:report[k] for k in ['ok','scope','aliveAtEnd','failure','errors','cleanup']},ensure_ascii=False))
 assert all(cleanup.values())
 return report

def recompact(app,out):
 # Diagnostic counterfactual from an actual compiler APP, never a fabricated payload.
 records=records_from_app(app);prefix='assets/js/MainAbility/';compiler=out/'compiler'
 for n,b in records.items():
  if n.startswith(prefix) and (n.endswith('.js') or n.endswith('.js.map')):
   p=compiler/n[len(prefix):];p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b)
 compact=out/'compact'
 subprocess.run(['node',str(HERE.parent/'install-r18/compact.mjs'),str(compiler),str(compact)],check=True)
 spec=importlib.util.spec_from_file_location('prepare_r18',HERE.parent/'install-r18/prepare.py');assert spec and spec.loader
 m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)
 changes={n:(compact/n[len(prefix):]).read_bytes() for n in records if n.startswith(prefix) and (n.endswith('.js') or n.endswith('.js.map'))}
 with zipfile.ZipFile(app) as outer:
  haps=[n for n in outer.namelist() if n.endswith('.hap')];assert len(haps)==1;hn=haps[0];source=outer.read(hn)
 result=m.rewrite(app.read_bytes(),{hn:m.rewrite(source,changes)});target=out/'diagnostic-completion-control.app';target.write_bytes(result)
 current=records_from_app(target);assert set(records)==set(current)
 for n,b in current.items():assert b==changes.get(n,records[n]),n
 budget=m.budgets(current)
 (out/'completion-control.json').write_text(json.dumps({'sourceSha256':native.sha(app.read_bytes()),'controlSha256':native.sha(result),'changedEntries':sorted(changes),'budget':budget,'allResourcesByteExact':True,'scope':'diagnostic build-side completion-preservation control'},indent=2)+'\n')
 return target

def main():
 p=argparse.ArgumentParser();p.add_argument('--sim',type=Path,required=True);p.add_argument('--app',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--recompact',action='store_true');a=p.parse_args()
 a.out=a.out.resolve();a.sim=a.sim.resolve();a.out.mkdir(parents=True,exist_ok=True)
 if a.recompact:a.app=recompact(a.app,a.out)
 records=records_from_app(a.app);root=a.sim/'apps/liubai-r18-complete';assert not root.exists()
 for n,b in records.items():
  q=root/n;assert '..' not in q.relative_to(root).parts;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(b)
 proof={'appSha256':native.sha(a.app.read_bytes()),'records':{n:{'bytes':len(b),'sha256':native.sha(b)} for n,b in records.items()},'pages':json.loads(records['assets/js/MainAbility/manifest.json'])['pages']}
 (a.out/'input-provenance.json').write_text(json.dumps(proof,indent=2)+'\n')
 report=run(a.sim,a.out,root)
 # This experiment may be red; never present it as candidate release approval.
 if report['failure']:raise SystemExit(1)
if __name__=='__main__':main()
