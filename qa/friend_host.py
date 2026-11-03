#!/usr/bin/env python3
"""Offline loopback hmlwsim host with real isolated callback filesystem; never seeds app data."""
import argparse,io,json,zipfile,os
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from urllib.parse import urlsplit
ROOT=Path(__file__).resolve().parents[1]
SIM=Path('/data/data/com.termux/files/home/liubai-rebuild-private/hmlwsim')
STATE=Path(os.environ.get('LIUBAI_FRIEND_STATE','/data/data/com.termux/files/home/liubai-rebuild-private/hmlwsim-state'))
APP=None
RECORDS={}
FAULT={'nextWrite':None}
def perform(body):
 bundle=body.get('bundle','');method=body.get('method');a=body.get('args',{});uri=a.get('uri','')
 assert bundle and all(c.isalnum() or c in '._-' for c in bundle) and '..' not in bundle,'Bad bundle namespace'
 assert uri.startswith('internal://app/') and len(uri)<=128 and '\\' not in uri and '..' not in uri.split('/'),'Bad URI'
 relative=uri[len('internal://app/'):]
 if relative.startswith('rawfile/'):
  assert method in ['get','access','readText'],'Packaged rawfile is read-only'
  key='assets/entry/resources/'+relative
  if key not in RECORDS:raise FileNotFoundError(key)
  raw=RECORDS[key]
  if method=='access':return None
  if method=='get':return {'uri':uri,'type':'file','length':len(raw),'lastModifiedTime':0}
  position=a.get('position',0);length=a.get('length',4096);assert type(position)==int and type(length)==int and 0<=position and 0<length<=4096,'Bad range'
  return {'text':raw[position:position+length].decode('utf8')}
 base=STATE/bundle;p=base/relative;base.mkdir(parents=True,exist_ok=True);assert p.resolve().is_relative_to(base.resolve())
 if method=='mkdir':p.mkdir(parents=bool(a.get('recursive')),exist_ok=False);return None
 if method=='access':
  if not p.exists():raise FileNotFoundError(str(p))
  return None
 if method=='get':
  st=p.stat();return {'uri':uri,'type':'dir' if p.is_dir() else 'file','length':st.st_size,'lastModifiedTime':0}
 if method=='readText':
  raw=p.read_bytes();pos=a.get('position',0);length=a.get('length',4096);assert type(pos)==int and type(length)==int and pos>=0 and 0<length<=4096
  return {'text':raw[pos:pos+length].decode('utf8')}
 if method=='writeText':
  if FAULT['nextWrite'] is not None:why=FAULT['nextWrite'];FAULT['nextWrite']=None;raise OSError(why)
  assert isinstance(a.get('text'),str)
  with p.open('ab' if a.get('append') else 'wb') as f:f.write(a['text'].encode('utf8'));f.flush()
  return None
 if method=='delete':p.unlink();return None
 if method=='list':return {'fileList':[{'uri':uri.rstrip('/')+'/'+c.name,'type':'dir' if c.is_dir() else 'file','length':c.stat().st_size,'lastModifiedTime':0} for c in p.iterdir()]}
 raise ValueError('Unsupported real file operation '+str(method))
class Handler(SimpleHTTPRequestHandler):
 def end_headers(self):self.send_header('Cache-Control','no-store');super().end_headers()
 def send(self,data,kind='application/json',code=200):
  self.send_response(code);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
 def do_GET(self):
  route=urlsplit(self.path).path
  if route=='/__health':return self.send(b'{"ready":true,"scope":"isolated hmlwsim host, real disk"}')
  if route=='/__artifact':return self.send(APP.read_bytes(),'application/octet-stream')
  if route=='/__baseline':return self.send(Path('/storage/emulated/0/Documents/watch-notes-concept-2026-11-01/approved-v3/留白-网页效果稿-v3.html').read_bytes(),'text/html; charset=utf-8')
  if route=='/friend_api.js':return self.send((ROOT/'qa/friend_api.js').read_bytes(),'text/javascript')
  if route.startswith('/vendor/'):
   p=ROOT/'qa/vendor'/Path(route).name
   return self.send(p.read_bytes(),'text/javascript')
  if route in ['/','/index.html']:
   s=(SIM/'index.html').read_text();s=s.replace('https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js','/vendor/jszip.min.js').replace('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js','/vendor/html2canvas.min.js');s=s.replace('<script src="js/runtime/api-registry.js"></script>','<script src="/friend_api.js"></script>\n<script src="js/runtime/api-registry.js"></script>');return self.send(s.encode(),'text/html; charset=utf-8')
  return super().do_GET()
 def do_POST(self):
  route=urlsplit(self.path).path
  if route not in ['/__fs','/__fault']:return self.send(b'{}',code=404)
  try:
   length=int(self.headers.get('Content-Length',0));assert 0<length<=50000;body=json.loads(self.rfile.read(length))
   if route=='/__fault':FAULT['nextWrite']=body.get('nextWrite');result={'ok':True,'scope':'explicit failure injection only'}
   else:result={'ok':True,'value':perform(body)}
  except FileNotFoundError as e:result={'ok':False,'code':301,'error':str(e)}
  except FileExistsError as e:result={'ok':False,'code':300,'error':str(e)}
  except OSError as e:result={'ok':False,'code':300,'error':str(e)}
  except (AssertionError,ValueError,TypeError,UnicodeError) as e:result={'ok':False,'code':202,'error':str(e)}
  self.send(json.dumps(result,ensure_ascii=False).encode())
 def log_message(self,*args):pass
def main():
 global APP,RECORDS
 p=argparse.ArgumentParser();p.add_argument('--app',required=True,type=Path);p.add_argument('--port',type=int,default=8796);a=p.parse_args();APP=a.app.resolve()
 with zipfile.ZipFile(APP) as z:
  with zipfile.ZipFile(io.BytesIO(z.read(next(n for n in z.namelist() if n.endswith('.hap'))))) as h:RECORDS={n:h.read(n) for n in h.namelist() if not n.endswith('/')}
 handler=lambda *args,**kwargs:Handler(*args,directory=str(SIM),**kwargs);server=ThreadingHTTPServer(('127.0.0.1',a.port),handler);print('FRIEND_HOST_READY http://127.0.0.1:'+str(a.port),flush=True);server.serve_forever()
if __name__=='__main__':main()
