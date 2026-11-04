#!/usr/bin/env python3
"""Isolated diagnostic host for our lite-sim Page/ModuleLoader; real temporary disk, no device data.
The shared lite-sim sources are served read-only. App lifecycle/device mocks are disclosed by UI.
"""
import argparse,hashlib,json,mimetypes,os,tempfile
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
APP=ROOT/'entry/src/main/js/MainAbility'
SIM=Path.home()/'hw_watch/lite-sim/web'
class Handler(BaseHTTPRequestHandler):
 def log_message(self,format,*args):pass
 def send(self,status,body,kind='application/json'):
  if not isinstance(body,bytes):body=json.dumps(body,ensure_ascii=False).encode()
  self.send_response(status);self.send_header('Content-Type',kind);self.send_header('Content-Length',str(len(body)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(body)
 def do_GET(self):
  from urllib.parse import urlparse,unquote
  url=urlparse(self.path);rel=unquote(url.path)
  if rel=='/__health':return self.send(200,{'ok':True,'scope':'our lite-sim with real isolated disk','pid':os.getpid()})
  if rel=='/__source':
   files={p.relative_to(APP).as_posix():p.read_text() for p in APP.rglob('*') if p.is_file() and p.suffix in ['.js','.hml','.css']}
   return self.send(200,{'files':files,'storeSha256':hashlib.sha256((APP/'common/store.js').read_bytes()).hexdigest()})
  if rel=='/':p=ROOT/'qa/own_sim.html'
  elif rel.startswith('/runtime/'):p=SIM/rel[1:]
  elif rel.startswith('/common/'):p=APP/rel[1:]
  elif rel=='/api/res':
   from urllib.parse import parse_qs
   resource=parse_qs(url.query).get('path',[''])[0];p=APP/resource
   if not resource.startswith('common/') or '..' in Path(resource).parts:return self.send(403,{'error':'resource outside common'})
  else:return self.send(404,{'error':'not found'})
  if not p.is_file() or '..' in Path(rel).parts:return self.send(404,{'error':'not found'})
  return self.send(200,p.read_bytes(),mimetypes.guess_type(p.name)[0] or 'application/octet-stream')
 def do_POST(self):
  if self.path!='/__fs':return self.send(404,{'error':'not found'})
  try:
   req=json.loads(self.rfile.read(int(self.headers.get('Content-Length','0'))));method=req['method'];a=req['args'];uri=a['uri'];prefix='internal://app/'
   if not uri.startswith(prefix) or len(uri)>128:raise ValueError('URI')
   name=uri[len(prefix):]
   if '..' in Path(name).parts:raise ValueError('URI')
   if name.startswith('rawfile/'):
    p=ROOT/'entry/src/main/resources'/name
    if method not in ['readText','get','access']:raise ValueError('readonly rawfile')
   else:p=self.server.disk/name
   value=None
   if method=='mkdir':p.mkdir(parents=a.get('recursive') is True,exist_ok=True)
   elif method=='access':p.stat()
   elif method=='get':value={'uri':uri,'length':p.stat().st_size,'type':'dir' if p.is_dir() else 'file'}
   elif method=='readText':
    pos=a.get('position',0);length=a.get('length',4096)
    if not isinstance(pos,int) or pos<0 or not isinstance(length,int) or length<1:raise ValueError('read range')
    if length>4096:return self.send(200,{'ok':False,'error':'read exceeds 4KB','code':302})
    b=p.read_bytes();value={'text':b[pos:pos+length].decode('utf-8')}
   elif method=='writeText':
    text=a.get('text')
    if not isinstance(text,str):raise ValueError('text')
    with p.open('a' if a.get('append') is True else 'w',encoding='utf-8',newline='') as f:f.write(text)
   elif method=='delete':p.unlink()
   elif method=='list':value={'fileList':[{'uri':uri+'/'+v.name,'type':'dir' if v.is_dir() else 'file','length':v.stat().st_size} for v in p.iterdir()]}
   else:raise ValueError('unsupported method')
   return self.send(200,{'ok':True,'value':value})
  except FileNotFoundError as e:return self.send(200,{'ok':False,'error':str(e),'code':301})
  except (ValueError,UnicodeError) as e:return self.send(200,{'ok':False,'error':str(e),'code':202})
  except OSError as e:return self.send(200,{'ok':False,'error':str(e),'code':300})
def main():
 p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8798);a=p.parse_args()
 with tempfile.TemporaryDirectory(prefix='liubai-own-sim-') as folder:
  server=ThreadingHTTPServer(('127.0.0.1',a.port),Handler);server.disk=Path(folder)
  print(json.dumps({'port':a.port,'scope':'real isolated test disk, not watch FS','disk':folder}),flush=True)
  try:server.serve_forever()
  finally:server.server_close()
if __name__=='__main__':main()
