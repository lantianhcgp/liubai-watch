#!/usr/bin/env python3
"""Short-lived owned browser harness, start-tick identities avoid Android /proc/stat permissions."""
import argparse,json,os,signal,subprocess,time,threading,socket
from pathlib import Path
import urllib.request
ROOT=Path(__file__).resolve().parents[1]
def ready(url):
 try:
  with urllib.request.urlopen(url,timeout=1) as r:return r.status==200
 except OSError:return False
def info(pid):
 try:
  s=Path('/proc/'+str(pid)+'/stat').read_text();x=s[s.rfind(')')+2:].split();return {'pid':pid,'ppid':int(x[1]),'state':x[0],'start':x[19]}
 except (OSError,IndexError,ValueError):return None
def descendants(roots):
 found={}
 for p in Path('/proc').iterdir():
  if p.name.isdigit():
   row=info(int(p.name))
   if row:found[row['pid']]=row
 keep=set(roots)
 while True:
  new=keep|{pid for pid,row in found.items() if row['ppid'] in keep}
  if new==keep:break
  keep=new
 return [row for pid,row in found.items() if pid in keep]
def close_owned(owners):
 for row in reversed(owners):
  now=info(row['pid'])
  if now and now['start']==row['start'] and now['state']!='Z':
   try:os.kill(row['pid'],signal.SIGTERM)
   except ProcessLookupError:pass
 deadline=time.monotonic()+3
 while time.monotonic()<deadline:
  living=[row for row in owners if (info(row['pid']) or {}).get('start')==row['start'] and (info(row['pid']) or {}).get('state')!='Z']
  if not living:return []
  threading.Event().wait(.1)
 for row in living:
  try:os.kill(row['pid'],signal.SIGKILL)
  except ProcessLookupError:pass
 return [row['pid'] for row in owners if (info(row['pid']) or {}).get('start')==row['start'] and (info(row['pid']) or {}).get('state')!='Z']
def main():
 p=argparse.ArgumentParser();p.add_argument('--app',type=Path,required=True);p.add_argument('--command',default='node qa/friend_cdp.mjs load');p.add_argument('--out',type=Path,required=True);a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True)
 env=os.environ.copy()
 for n in ['http_proxy','https_proxy','HTTP_PROXY','HTTPS_PROXY','ALL_PROXY','all_proxy']:env.pop(n,None)
 host=browser=None;logs=[];code=1
 try:
  h=(a.out/'host.log').open('wb');logs.append(h);host=subprocess.Popen(['python3',str(ROOT/'qa/friend_host.py'),'--app',str(a.app),'--port','8796'],cwd=ROOT,env=env,stdout=h,stderr=subprocess.STDOUT)
  end=time.monotonic()+8
  while not ready('http://127.0.0.1:8796/__health'):
   if host.poll() is not None or time.monotonic()>end:raise RuntimeError('Host readiness failed')
   threading.Event().wait(.15)
  b=(a.out/'chromium.log').open('wb');logs.append(b);profile=Path('/data/data/com.termux/files/home/liubai-rebuild-private/browser-profile');profile.mkdir(parents=True,exist_ok=True)
  cmd=['proot-distro','login','alpine','-b','/data/data/com.termux/files/home:/termuxhome','--','chromium','--headless','--no-sandbox','--disable-gpu','--disable-software-rasterizer','--disable-dev-shm-usage','--no-first-run','--disable-background-networking','--remote-debugging-address=127.0.0.1','--remote-debugging-port=9260','--user-data-dir=/termuxhome/liubai-rebuild-private/browser-profile','--window-size=1440,1200','--force-device-scale-factor=1','http://127.0.0.1:8796/']
  browser=subprocess.Popen(cmd,cwd=ROOT,env=env,stdout=b,stderr=subprocess.STDOUT);end=time.monotonic()+25
  while not ready('http://127.0.0.1:9260/json/version'):
   if browser.poll() is not None or time.monotonic()>end:raise RuntimeError('CDP readiness failed')
   threading.Event().wait(.15)
  r=subprocess.run(['/data/data/com.termux/files/usr/bin/bash','-c',a.command],cwd=ROOT,env=env,timeout=300);code=r.returncode
 finally:
  owners=descendants([p.pid for p in [browser,host] if p]);leftovers=close_owned(owners)
  for p in [browser,host]:
   if p:
    try:p.wait(timeout=3)
    except subprocess.TimeoutExpired:p.kill();p.wait(timeout=3)
  for h in logs:h.close()
  ports={str(p):not ready('http://127.0.0.1:'+str(p)+'/__health' if p==8796 else 'http://127.0.0.1:'+str(p)+'/json/version') for p in [8796,9260]}
  report={'scope':'owned short browser lifecycle','leftoverProcesses':leftovers,'portsClosed':ports,'commandExit':code};(a.out/'cleanup.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report));assert not leftovers and all(ports.values()),'Owned test processes leaked'
 raise SystemExit(code)
if __name__=='__main__':main()
