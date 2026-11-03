#!/usr/bin/env python3
"""Real unmodified APP on official Huawei Lite Simulator. Fail-closed; local unit data is not native proof."""
import argparse,hashlib,io,json,re,shutil,socket,struct,subprocess,threading,time,zipfile
from pathlib import Path
SDK_COMMIT='aa3a315a766f6dd4983ad8dad9eed2c948c6faba'
PAGES=['pages/'+p+'/'+p for p in ['index','read','edit','menu','history','day','trash']]
class GateError(RuntimeError):pass
def sha(b):return hashlib.sha256(b).hexdigest()
def read_app(path):
 try:
  with zipfile.ZipFile(path) as a:
   hs=[n for n in a.namelist() if n.endswith('.hap')]
   if len(hs)!=1:raise GateError('One real Lite HAP required')
   with zipfile.ZipFile(io.BytesIO(a.read(hs[0]))) as h:
    if len(h.namelist())!=len(set(h.namelist())):raise GateError('Duplicate payload entry')
    return {n:h.read(n) for n in h.namelist() if not n.endswith('/')}
 except (OSError,zipfile.BadZipFile) as e:raise GateError('Invalid APP archive') from e
class OrderedMarkers:
 def __init__(self):self.cursor=0
 def take(self,text,pattern,start=0):
  m=re.compile(pattern).search(text,max(self.cursor,start))
  if not m:raise GateError('Missing ordered marker '+pattern)
  self.cursor=m.end();return {'text':m.group(),'start':m.start(),'end':m.end(),'groups':m.groupdict()}
def verify_receipts(messages,commands):
 pairs=[(m.get('command'),m.get('result')) for m in messages if m.get('command') in ['MousePress','MouseRelease','MouseMove','CrownRotate']]
 if pairs!=[(c,True) for c in commands]:raise GateError('Rejected or missing original command ACK: '+str(pairs))
def frames(raw):
 magic=b'\x12\x34\x56\x78';starts=[];pos=0
 while True:
  at=raw.find(magic,pos)
  if at<0:break
  starts.append(at);pos=at+4
 result=[]
 for i,at in enumerate(starts):
  end=starts[i+1] if i+1<len(starts) else len(raw)
  if end-at<40:continue
  w,h,fmt=struct.unpack_from('>III',raw,at+12);payload=raw[at+40:end]
  if fmt==2 and payload.startswith(b'\xff\xd8'):
   stop=payload.rfind(b'\xff\xd9')
   if stop>=0:result.append((w,h,payload[:stop+2]))
 return result
class CommandPipe:
 def __init__(self,prefix):
  self.path=Path('/tmp/'+prefix+'_commandPipe');self.stop=threading.Event();self.messages=[];self.connections=[]
  self.sock=socket.socket(socket.AF_UNIX,socket.SOCK_STREAM);self.sock.bind(str(self.path));self.sock.listen(4);self.sock.settimeout(.2)
  self.thread=threading.Thread(target=self.receive,daemon=True);self.thread.start()
 def receive(self):
  while not self.stop.is_set():
   try:c,_=self.sock.accept()
   except socket.timeout:continue
   except OSError:break
   self.connections.append(c);c.settimeout(.2);pending=b''
   while not self.stop.is_set():
    try:b=c.recv(65536)
    except socket.timeout:continue
    except OSError:break
    if not b:break
    pending+=b
    while b'\0' in pending:
     item,pending=pending.split(b'\0',1)
     if item:
      try:self.messages.append(json.loads(item))
      except ValueError:self.messages.append({'raw':item.decode(errors='replace')})
   c.close()
 def send(self,payload):
  b=(json.dumps(payload,separators=(',',':'))+'\0').encode();ok=0
  for c in list(self.connections):
   try:c.sendall(b);ok+=1
   except OSError:pass
  if not ok:raise GateError('Official command pipe has no live receiver')
 def close(self):
  self.stop.set();self.sock.close()
  for c in self.connections:
   try:c.shutdown(socket.SHUT_RDWR);c.close()
   except OSError:pass
  self.thread.join(2)
  if self.path.exists():self.path.unlink()
def tcp(port):
 try:
  with socket.create_connection(('127.0.0.1',port),timeout=.15):return True
 except OSError:return False
def mouse(command,x,y):return {'version':'1.0.0','command':command,'type':'action','args':{'x':int(x),'y':int(y),'button':0}}
def fatal(text):
 allowed='current state(2) is invalid when changing ready state to show state.'
 result=[]
 for line in text.splitlines():
  if re.search(r'ACELite\]\[ERROR|Console Error|out.of.memory|\bFATAL\b|Open font path failed|Launch.*abnormal',line,re.I) and allowed not in line:result.append(line)
 return result
def launch_args(bundle,name,page,prefix,port,setting,shape,w,h,resource):
 return ['-refresh','region','-projectID',prefix,'-ts','/tmp/'+prefix+'_trace','-j',str(bundle),'-s',prefix,'-cpm','false','-device','liteWearable','-shape',shape,'-sd','320','-pjId',prefix,'-bn',name,'-hs','524288','-f',str(setting),'-ilt','true','-or',str(w),str(h),'-cr',str(w),str(h),'-lws',str(port),'-url',page,'-arp',str(resource)]
def plan(shape,w,h):
 script="import g from './entry/src/main/js/MainAbility/common/geometry.js';const i="+json.dumps({'windowWidth':w,'windowHeight':h,'screenShape':shape})+";console.log(JSON.stringify({h:g.home(i),e:g.editor(i,true),r:g.reader(i)}));"
 g=json.loads(subprocess.check_output(['node','--input-type=module','-e',script],text=True,cwd=Path(__file__).resolve().parents[1]));hm,ed,rd=g['h'],g['e'],g['r'];scale=141/180
 def key(row,col):return [ed['keyX']+(col*57+row*29+28.5)*scale,ed['keysY']+row*47+23.5]
 def ev(name,pattern,point=None,hold=.06,gesture=None):return {'name':name,'expect':pattern,'point':point,'hold':hold,'gesture':gesture}
 events=[ev('cold-index',r'LB2 LIST index rows=0 offset=0'),ev('new',r'LB2 EDIT id=new open=true .*chars=0 pinyin= mode=0', [hm['contentX']+hm['contentW']/2,hm['newY']+hm['newH']/2]),ev('key-n',r'LB2 EDIT .*pinyin=n mode=0',key(2,5)),ev('key-i',r'LB2 CAND pinyin=ni rows=[1-9][0-9]*',key(0,7)),ev('choose-han',r'LB2 EDIT .*chars=1 pinyin= mode=0',[ed['footX']+25,ed['footY']+22]),ev('lowercase',r'LB2 EDIT .*mode=1',[ed['footX']+22,ed['footY']+22])]
 # Enter text with original real keys, never inject an app data string.
 for i in range(70):events.append(ev('letter-'+str(i),r'LB2 EDIT .*chars='+str(i+2)+r' pinyin= mode=1',key(1,0)))
 events.append(ev('save',r'LB2 READ id=(?P<id>[A-Za-z0-9_-]+) version=1 .*font=normal',[ed['hx']+ed['hw']-23,ed['hy']+23]))
 events.extend([ev('read-top',r'LB2 READ id={id} .*anchor=0 .*font=normal', [rd['w']/2,(rd['top']+rd['bottom'])/2],gesture='down'),ev('read-next',r'LB2 READ id={id} .*anchor=[1-9][0-9]* .*font=normal',[rd['w']/2,(rd['top']+rd['bottom'])/2],gesture='up'),ev('read-more',r'LB2 MENU mode=read-options rows=3',[rd['hx']+rd['hw']-rd['hit']/2,rd['hy']+rd['hit']/2])])
 return g,events
def run(sim,out,root,shape,w,h,events,sequence,values=None):
 out.mkdir(parents=True,exist_ok=True);values=dict(values or {});manifest=json.loads((root/'assets/js/MainAbility/manifest.json').read_text());config=json.loads((root/'config.json').read_text());engine=sim/'sdk/openharmony/previewer/liteWearable/bin/Simulator';engine.chmod(engine.stat().st_mode|0o111);prefix='lb2_'+str(int(time.time()))+'_'+str(sequence);port=39900+sequence;settings=json.loads((sim/'app/ci_setting.json').read_text())
 for v in settings.get('setting',{}).values():
  if 'Language' in v:v['Language']['args']['Language']='zh-CN'
 sf=out/'settings.json';sf.write_text(json.dumps(settings));args=launch_args(root/'assets/js/MainAbility',config['app']['bundleName'],manifest['pages'][0],prefix,port,sf,shape,w,h,root/'assets/entry');pipe=CommandPipe(prefix);log=out/'engine.log';raw=out/'frames.wsbin';steps=[];marks=OrderedMarkers();proc=ws=None;error=None;last=None;cursor=0
 with log.open('wb') as eh,(out/'websocket.log').open('wb') as wh:
  try:
   proc=subprocess.Popen([str(engine)]+args,cwd=engine.parent,stdout=eh,stderr=subprocess.STDOUT);deadline=time.monotonic()+12
   while not tcp(port):
    if proc.poll() is not None or time.monotonic()>deadline:raise GateError('Native image port unavailable')
    pipe.stop.wait(.08)
   ws=subprocess.Popen(['node',str(sim/'ws_client.js'),str(port),str(raw),'900000'],stdout=wh,stderr=subprocess.STDOUT)
   for i,event in enumerate(events):
    text=log.read_text(errors='replace');start=len(text) if event.get('point') else marks.cursor;receipts_at=len(pipe.messages);sent=[]
    if event.get('point'):
     x,y=event['point'];commands=[mouse('MousePress',x,y)]
     if event.get('gesture'):
      distance=(-1 if event['gesture']=='up' else 1)*min(150,(h-160)/2)
      commands.extend(mouse('MouseMove',x,y+distance*k/4) for k in range(1,5));commands.append(mouse('MouseRelease',x,y+distance))
     else:commands.append(mouse('MouseRelease',x,y))
     for command in commands:pipe.send(command);sent.append(command);pipe.stop.wait(event.get('hold',.06))
    pattern=event['expect']
    for k,v in values.items():pattern=pattern.replace('{'+k+'}',re.escape(v))
    deadline=time.monotonic()+25
    while True:
     text=log.read_text(errors='replace');errors=fatal(text)
     if errors:raise GateError('Native engine error '+errors[0])
     try:matched=marks.take(text,pattern,start);break
     except GateError:
      if proc.poll() is not None or time.monotonic()>deadline:raise GateError('Missing real state '+event['name']+': '+pattern)
      pipe.stop.wait(.1)
    values.update(matched['groups']);pipe.stop.wait(.25)
    if sent:
     ack_end=time.monotonic()+2
     while len([m for m in pipe.messages[receipts_at:] if m.get('command') in ['MousePress','MouseMove','MouseRelease']])<len(sent) and time.monotonic()<ack_end:pipe.stop.wait(.05)
     verify_receipts(pipe.messages[receipts_at:],[m['command'] for m in sent])
    data=raw.read_bytes() if raw.exists() else b'';decoded=frames(data[cursor:]);cursor=len(data)
    if decoded:
     fw,fh,b=decoded[-1]
     if (fw,fh)!=(w,h):raise GateError('Native frame resolution mismatch')
     name=f'{i:03d}-{event["name"]}.jpg';(out/name).write_bytes(b)
     from PIL import Image
     with Image.open(io.BytesIO(b)) as im:im.load();assert im.size==(w,h)
     last=name
    if not last:raise GateError('No native pixels for '+event['name'])
    steps.append({'name':event['name'],'marker':matched,'sent':sent,'frame':last,'frameSha256':sha((out/last).read_bytes())})
  except Exception as e:error=repr(e)
  finally:
   for p in [ws,proc]:
    if p and p.poll() is None:
     p.terminate()
     try:p.wait(timeout=3)
     except subprocess.TimeoutExpired:p.kill();p.wait(timeout=3)
   pipe.close()
 cleanup={'engineStopped':bool(proc and proc.poll() is not None),'websocketStopped':ws is None or ws.poll() is not None,'commandThreadStopped':not pipe.thread.is_alive(),'commandPipeRemoved':not pipe.path.exists(),'imagePortClosed':not tcp(port)};ok=not error and len(steps)==len(events) and all(cleanup.values());report={'ok':ok,'orderedSemanticsOk':ok,'window':[w,h],'shape':shape,'heap':524288,'failure':error,'steps':steps,'values':values,'cleanup':cleanup,'engineSha256':sha(engine.read_bytes()),'args':args,'errors':fatal(log.read_text(errors='replace')),'visualReviewed':False,'noInjectedAppStateOrApi':True};(out/'acceptance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');print(json.dumps({'ok':ok,'window':[w,h],'steps':len(steps),'failure':error},ensure_ascii=False),flush=True);return report
def main():
 p=argparse.ArgumentParser();p.add_argument('--sim',required=True,type=Path);p.add_argument('--app',required=True,type=Path);p.add_argument('--out',required=True,type=Path);p.add_argument('--profiles',default='fit3,circle454,circle390,rect336');a=p.parse_args();a.sim=a.sim.resolve();a.out=a.out.resolve();a.out.mkdir(parents=True,exist_ok=True);d=read_app(a.app);manifest=json.loads(d['assets/js/MainAbility/manifest.json']);assert manifest['pages']==PAGES;root=a.sim/'apps/liubai-elcton-rebuild';assert not root.exists();root.mkdir(parents=True)
 for n,b in d.items():
  assert not n.startswith('/') and '..' not in n.split('/');q=root/n;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(b)
 sandbox=a.sim/'sdk/openharmony/previewer/liteWearable/bin/file_system/app/ace/data'/manifest.get('bundleName','undefined');results=[]
 profiles={'fit3':('rect',412,484),'circle454':('circle',454,454),'circle390':('circle',390,390),'rect336':('rect',336,480)}
 for i,key in enumerate(a.profiles.split(',')):
  shape,w,h=profiles[key]
  if sandbox.exists():shutil.rmtree(sandbox)
  raw=sandbox/'rawfile';source=root/'assets/entry/resources/rawfile';shutil.copytree(source,raw)
  geom,events=plan(shape,w,h);r=run(a.sim,a.out/key,root,shape,w,h,events,i+1);results.append(r)
  if not r['ok']:break
 report={'ok':len(results)==len(a.profiles.split(',')) and all(r['ok'] for r in results),'scope':'official native real user paths; visual review, full V3 acceptance and device installation separate','appSha256':sha(a.app.read_bytes()),'records':len(d),'payloadModified':False,'noNotesSeeded':True,'profiles':results,'visualReviewed':False};(a.out/'native-acceptance.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n');raise SystemExit(0 if report['ok'] else 1)
if __name__=='__main__':main()
