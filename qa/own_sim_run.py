#!/usr/bin/env python3
"""Bounded own lite-sim run; starts at most one test server/browser and closes owned children."""
import argparse,importlib.util,json,os,socket,subprocess,time,threading
from pathlib import Path
import urllib.parse
ROOT=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('lifecycle',ROOT/'qa/browser_run.py')
assert spec is not None and spec.loader is not None
life=importlib.util.module_from_spec(spec);spec.loader.exec_module(life)
def main():
 p=argparse.ArgumentParser();p.add_argument('--out',type=Path,required=True);p.add_argument('--script',default='qa/own_sim_accept.mjs');p.add_argument('--scenario',default='');a=p.parse_args();a.out.mkdir(parents=True,exist_ok=True)
 env=os.environ.copy();env['OWN_SIM_OUT']=str(a.out);env['OWN_SIM_SCENARIO']=a.scenario
 for name in ['http_proxy','https_proxy','HTTP_PROXY','HTTPS_PROXY','all_proxy','ALL_PROXY']:env.pop(name,None)
 for port in [8798,9262]:
  try:
   with socket.create_connection(('127.0.0.1',port),timeout=.3):raise RuntimeError('Port already owned '+str(port))
  except (ConnectionRefusedError,TimeoutError):pass
 host=browser=None;handles=[];code=1
 try:
  f=(a.out/'host.log').open('wb');handles.append(f);host=subprocess.Popen(['python3',str(ROOT/'qa/own_sim_host.py')],cwd=ROOT,env=env,stdout=f,stderr=subprocess.STDOUT)
  for url,proc,seconds in [('http://127.0.0.1:8798/__health',host,8)]:
   end=time.monotonic()+seconds
   while not life.ready(url):
    if proc.poll() is not None or time.monotonic()>end:raise RuntimeError('own host readiness failed')
    threading.Event().wait(.1)
  f=(a.out/'chromium.log').open('wb');handles.append(f)
  profile=Path.home()/'liubai-rebuild-private/own-sim-browser-profile';profile.mkdir(parents=True,exist_ok=True)
  browser=subprocess.Popen(['proot-distro','login','alpine','-b',str(Path.home())+':/termuxhome','--','chromium','--headless','--no-sandbox','--disable-gpu','--disable-dev-shm-usage','--no-first-run','--disable-background-networking','--remote-debugging-address=127.0.0.1','--remote-debugging-port=9262','--user-data-dir=/termuxhome/liubai-rebuild-private/own-sim-browser-profile','--window-size=900,800','--force-device-scale-factor=1','http://127.0.0.1:8798/?'+urllib.parse.urlencode({'scenario':a.scenario})],cwd=ROOT,env=env,stdout=f,stderr=subprocess.STDOUT)
  end=time.monotonic()+35
  while not life.ready('http://127.0.0.1:9262/json/version'):
   if browser.poll() is not None or time.monotonic()>end:raise RuntimeError('own CDP readiness failed')
   threading.Event().wait(.15)
  code=subprocess.run(['node',a.script],cwd=ROOT,env=env,timeout=180).returncode
 finally:
  owners=life.descendants([x.pid for x in [host,browser] if x]);left=life.close_owned(owners)
  for proc in [host,browser]:
   if proc:
    try:proc.wait(timeout=3)
    except subprocess.TimeoutExpired:proc.kill();proc.wait(timeout=3)
  for f in handles:f.close()
  ports={str(p):not life.ready('http://127.0.0.1:'+str(p)+('/__health' if p==8798 else '/json/version')) for p in [8798,9262]}
  result={'commandExit':code,'leftoverProcesses':left,'portsClosed':ports};(a.out/'cleanup.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result));assert not left and all(ports.values()),'owned processes leaked'
 raise SystemExit(code)
if __name__=='__main__':main()
