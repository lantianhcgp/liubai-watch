#!/usr/bin/env python3
"""Exact-package native acceptance, real pointer events and ordered app-side states only."""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import re
import subprocess
import time
import xml.etree.ElementTree as ET

HERE=Path(__file__).resolve().parent

def module(name,path):
 s=importlib.util.spec_from_file_location(name,path);assert s and s.loader
 m=importlib.util.module_from_spec(s);s.loader.exec_module(m);return m
native=module('native_capture',HERE.parent/'install-r17-official/official_capture.py')
flow=module('native_flow',HERE/'flow.py')
sem=module('native_semantics',HERE/'semantics.py')

def geometry():
 js="import fs from 'node:fs';const s=fs.readFileSync('entry/src/main/js/MainAbility/common/layout.js','utf8');const l=(await import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'))).default;const i={windowWidth:412,windowHeight:484,screenShape:'rect'};console.log(JSON.stringify({h:l.home(i),e:l.editor(i,true),r:l.reader(i)}));"
 return json.loads(subprocess.check_output(['node','--input-type=module','-e',js],cwd=HERE.parents[1],text=True))

def pattern_for(pattern,values):
 for k,v in values.items():pattern=pattern.replace('{'+k+'}',re.escape(v))
 assert not re.search(r'\{(?:id|month|day)\}',pattern),'A required earlier state was not captured'
 return pattern

def checksum_records(records):
 return {n:{'bytes':len(b),'sha256':native.sha(b)} for n,b in records.items()}

def run(sim,out,root,events,sequence,values=None):
 out.mkdir(parents=True,exist_ok=True);values=dict(values or {})
 manifest=json.loads((root/'assets/js/MainAbility/manifest.json').read_text());cfg=json.loads((root/'config.json').read_text())
 assert manifest['pages'][0]=='pages/boot/boot'
 engine=sim/'sdk/openharmony/previewer/liteWearable/bin/Simulator';engine.chmod(engine.stat().st_mode|0o111)
 prefix='lbr18accept_'+str(int(time.time()))+'_'+str(sequence);port=39700+sequence
 settings=json.loads((sim/'app/ci_setting.json').read_text())
 for v in settings.get('setting',{}).values():
  if 'Language' in v:v['Language']['args']['Language']='zh-CN'
 sf=out/'setting.json';sf.write_text(json.dumps(settings))
 pipe=native.CommandPipe(prefix);log=out/'native.engine.log';raw=out/'native.wsbin';wlog=out/'native.websocket.log'
 args=native.launch_args(root/'assets/js/MainAbility',cfg['app']['bundleName'],manifest['pages'][0],prefix,port,sf)
 engine_proc=ws=None;steps=[];failure=None;cursor=0;raw_cursor=0;last_frame=None
 eh=log.open('wb');wh=wlog.open('wb')
 try:
  engine_proc=subprocess.Popen([str(engine)]+args,cwd=engine.parent,stdout=eh,stderr=subprocess.STDOUT)
  deadline=time.monotonic()+12
  while not native.tcp_ready(port):
   if engine_proc.poll() is not None:raise RuntimeError('Native engine exited before image port')
   if time.monotonic()>deadline:raise TimeoutError('Image port not ready')
   pipe.stop.wait(.08)
  ws=subprocess.Popen(['node',str(sim/'ws_client.js'),str(port),str(raw),'900000'],stdout=wh,stderr=subprocess.STDOUT)
  for i,event in enumerate(events):
   label=str(i).zfill(2)+'-'+event['name'];row={'name':event['name'],'cursorBefore':cursor,'point':event.get('point'),'sent':[]};steps.append(row)
   if engine_proc.poll() is not None:raise RuntimeError('Engine exited before '+label)
   text=log.read_text(errors='replace');start=len(text) if event.get('point') else cursor;ack_cursor=len(text)
   if event.get('point'):
    x,y=event['point'];ack_cursor=len(text)
    for command in ['MousePress','MouseRelease']:
     payload=flow.mouse(command,x,y);blob=(json.dumps(payload,separators=(',',':'))+'\0').encode();live=0
     for c in list(pipe.connections):
      try:c.sendall(blob);live+=1
      except OSError:pass
     if not live:raise RuntimeError('Native command channel absent at '+label)
     row['sent'].append(payload);pipe.stop.wait(event.get('hold',.09) if command=='MousePress' else .09)
   pattern=pattern_for(event['expect'],values);deadline=time.monotonic()+event.get('timeout',30)
   while True:
    text=log.read_text(errors='replace');err=sem.errors(text)
    if err['fatal']:raise RuntimeError('Native fatal at '+label+': '+err['fatal'][0])
    match=sem.match_after(text,pattern,max(start,cursor))
    if match:break
    if engine_proc.poll() is not None:raise RuntimeError('Engine exited while waiting for '+label)
    if time.monotonic()>deadline:raise TimeoutError('Expected state missing at '+label+': '+pattern)
    pipe.stop.wait(.12)
   cursor=match['end'];values.update({k:v for k,v in match['groups'].items() if v is not None})
   row.update({'pattern':pattern,'marker':match['text'],'cursorAfter':cursor,'stateMatched':True})
   if event.get('check')=='multipage':assert int(values['pages'])>=2,'Test body did not exercise pagination'
   if row['sent']:
    receipt=text[ack_cursor:]
    acknowledgements=re.findall(r'"command"\s*:\s*"(MousePress|MouseRelease)"\s*,\s*"result"\s*:\s*(true|false)',receipt)
    row['acknowledgements']=acknowledgements
    assert acknowledgements==[('MousePress','true'),('MouseRelease','true')],('Native rejected action',label,acknowledgements)
   # UI settle in the DRIVER only; state has already been proven, not a substituted app timer.
   pipe.stop.wait(.22)
   data=raw.read_bytes() if raw.exists() else b'';chunk=data[raw_cursor:];raw_cursor=len(data)
   frames=flow.split_snapshot(sim,out,label,chunk)
   if frames:last_frame=frames[-1]
   row['frames']=frames;row['visibleFrame']=last_frame;row['rawBytes']=len(chunk)
   assert last_frame is not None,'No decoded native pixels at '+label
  pipe.stop.wait(.3)
 except Exception as e:failure=repr(e)
 finally:
  alive=engine_proc is not None and engine_proc.poll() is None
  for p in [ws,engine_proc]:
   if p and p.poll() is None:
    p.terminate()
    try:p.wait(timeout=3)
    except subprocess.TimeoutExpired:p.kill();p.wait(timeout=3)
  eh.close();wh.close();pipe.close()
 text=log.read_text(errors='replace');err=sem.errors(text)
 cleanup={'engineStopped':engine_proc is not None and engine_proc.poll() is not None,'websocketStopped':ws is None or ws.poll() is not None,'commandThreadStopped':not pipe.thread.is_alive(),'commandPipeRemoved':not pipe.path.exists(),'imagePortClosed':not native.tcp_ready(port)}
 ok=failure is None and alive and not err['fatal'] and len(steps)==len(events) and all(s.get('stateMatched') for s in steps) and all(cleanup.values())
 report={'ok':ok,'orderedSemanticsOk':ok,'noInjectedAppStateOrApi':True,'heap':524288,'bundle':cfg['app']['bundleName'],'firstPage':manifest['pages'][0],'engineSha256':native.sha(engine.read_bytes()),'args':args,'steps':steps,'values':values,'failure':failure,'errors':err,'aliveAtEnd':alive,'cleanup':cleanup,'visualReviewed':False,'signedProvenanceOk':False,'messages':pipe.messages}
 (out/'acceptance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps({'ok':ok,'steps':len(steps),'failure':failure,'lastState':steps[-1].get('marker') if steps else None,'cleanup':cleanup},ensure_ascii=False))
 return report

def main():
 p=argparse.ArgumentParser();p.add_argument('--sim',type=Path,required=True);p.add_argument('--app',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--restart',action='store_true');a=p.parse_args()
 a.sim=a.sim.resolve();a.app=a.app.resolve();a.out=a.out.resolve();a.out.mkdir(parents=True,exist_ok=True)
 records=flow.records_from_app(a.app);root=a.sim/'apps/liubai-r18-acceptance';assert not root.exists()
 for n,b in records.items():
  target=root/n;assert '..' not in target.relative_to(root).parts;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(b)
 proof={'appSha256':native.sha(a.app.read_bytes()),'records':checksum_records(records),'pages':json.loads(records['assets/js/MainAbility/manifest.json'])['pages'],'payloadModified':False}
 (a.out/'input-provenance.json').write_text(json.dumps(proof,indent=2)+'\n')
 geom=geometry();(a.out/'geometry.json').write_text(json.dumps(geom,indent=2)+'\n')
 first=run(a.sim,a.out/'flow',root,sem.user_plan(geom),31)
 result={'ok':first['ok'],'orderedSemanticsOk':first['orderedSemanticsOk'],'scope':'exact-compiler-native-user-path','signedProvenanceOk':False,'visualReviewed':False,'input':proof,'first':first}
 if first['ok'] and a.restart:
  events=sem.user_plan(geom);selected=[dict(events[0],expect=r'LBQA LIST index rows=1 offset=0'),events[-2],events[-1]]
  second=run(a.sim,a.out/'cold-restart',root,selected,32,first['values']);result['restart']=second;result['ok']=result['ok'] and second['ok'];result['orderedSemanticsOk']=result['ok']
 (a.out/'native-acceptance.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
 if not result['ok']:raise SystemExit(1)
if __name__=='__main__':main()
