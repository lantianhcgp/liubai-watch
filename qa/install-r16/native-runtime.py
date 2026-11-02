#!/usr/bin/env python3
"""Execute exact candidate compiler JS in SDK JerryScript with bounded API doubles.

The engine is real; file/device/router/render objects here are test doubles,
NOT the native watch UI, storage or 512KB product-heap verification.
"""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

PREFIX=r"""
var r16Tasks=[],r16Files={},r16App=null,r16Page=null,r16Route='',r16Calls=0,r16Now=0,r16Next=0;
var r16Global=(function(){return this;})();
function setTimeout(fn,ms){var id=++r16Next;r16Tasks.push({id:id,due:r16Now+Number(ms||0),fn:fn});return id;}
function clearTimeout(id){for(var i=0;i<r16Tasks.length;i++)if(r16Tasks[i].id===id)r16Tasks[i].fn=null;}
function r16Drain(){var steps=0;while(r16Tasks.length&&steps++<200){r16Tasks.sort(function(a,b){return a.due-b.due||a.id-b.id;});var t=r16Tasks.shift();if(t.fn){r16Now=t.due;t.fn();}}if(steps>=200)throw new Error('UNBOUNDED_TEST_QUEUE');}
function ViewModel(o){var p=o.data||{},k;for(k in o)if(k!=='data')p[k]=o[k];p.$t=function(k){return k;};return p;}
function _c(t,a,b){return {tag:t,attributes:a,children:b};}
function _i(fn,b){return fn()?b():null;}
function _l(a,fn){var out=[],i;for(i=0;i<a.length;i++)out.push(fn(a[i],i));return out;}
function r16Later(o,ok,v){setTimeout(function(){if(ok){if(o.success)o.success(v);}else if(o.fail)o.fail('missing',301);},0);}
var r16File={
 mkdir:function(o){r16Calls++;r16Files[o.uri]=null;r16Later(o,true);},
 get:function(o){r16Calls++;var yes=Object.prototype.hasOwnProperty.call(r16Files,o.uri);r16Later(o,yes,{uri:o.uri,type:r16Files[o.uri]===null?'dir':'file',length:r16Files[o.uri]?r16Files[o.uri].length:0});},
 readText:function(o){r16Calls++;r16Later(o,Object.prototype.hasOwnProperty.call(r16Files,o.uri),{text:r16Files[o.uri]||''});},
 writeText:function(o){r16Calls++;r16Files[o.uri]=o.text;r16Later(o,true);},
 delete:function(o){r16Calls++;delete r16Files[o.uri];r16Later(o,true);},
 list:function(o){r16Calls++;r16Later(o,true,{fileList:[]});}
};
function requireNative(n){
 if(n==='system.file')return r16File;
 if(n==='system.device')return {getInfo:function(o){r16Later(o,true,{windowWidth:412,windowHeight:484,screenShape:'rect'});}};
 if(n==='system.router')return {replace:function(o){r16Route=o.uri;}};
 throw new Error('Unknown native module '+n);
}
"""

def main():
 parser=argparse.ArgumentParser();parser.add_argument('--sdk',type=Path,required=True);parser.add_argument('--bundle',type=Path,required=True);a=parser.parse_args()
 engines=[p for p in a.sdk.rglob('jerry') if p.is_file() and p.parent.name=='bin' and 'ace-loader' in str(p)];assert len(engines)==1
 probes={'no-op.js':'var x=1;if(x!==1)throw 2;', 'print-probe.js':'print("SDK_OUTPUT_PROBE");', 'required-builtins.js':'var x={};Object.defineProperty(x,"a",{value:1});if(x.a!==1||JSON.parse("{\\"a\\":1}").a!==1||[1,2].indexOf(2)!==1)throw 3;'}
 controls=[]
 for name,text in probes.items():
  fixture=a.bundle/name;fixture.write_text(text);probe=subprocess.run([str(engines[0]),str(fixture)],capture_output=True,text=True,timeout=10);controls.append({'file':name,'returncode':probe.returncode,'output':probe.stdout+probe.stderr})
 (a.bundle/'native-runtime-controls.json').write_text(json.dumps(controls,indent=2)+'\n');print(json.dumps({'runtimeControls':controls}));assert controls[0]['returncode']==0 and controls[2]['returncode']==0
 variants=a.bundle/'variants';code=PREFIX
 for part,target in [('app','r16App'),('boot','r16Page')]:
  text=(variants/('liubai-'+part+'.js')).read_text();code+='\n'+target+' = '+text+'\n'
  if part=='app':code+='\nvar $app=r16App; if(r16App.onCreate)r16App.onCreate();\n'
 code+='\nr16Page.onInit(); if(r16Page.onReady)r16Page.onReady(); if(r16Route!=="pages/index/index")throw new Error("BOOT_ROUTE_MISSING");\n'
 code+='\nr16Page = '+(variants/'liubai-index.js').read_text()+'\n'
 code+='\nr16Page.onInit();r16Drain();\n'
 # Callbacks run before deadlines; canceled timers keep stable IDs during drain.
 code+='\nvar r16Result={store:r16App.getLiubaiStoreState(),ready:r16Page.ready,empty:r16Page.empty,message:r16Page.message,error:r16Page.errorDetail,fileCalls:r16Calls,route:r16Route};\n'
 code+='\nif(r16Result.store!=="ready"||r16Result.ready!==true||r16Result.empty!==true||r16Result.message!==""||r16Result.fileCalls<1)throw new Error("STARTUP_ASSERTION_FAILED");\n'
 code+='\nif(typeof print==="function")print(JSON.stringify(r16Result));\n'
 script=a.bundle/'native-runtime-fixture.js';script.write_text(code)
 run=subprocess.run([str(engines[0]),str(script)],capture_output=True,text=True,timeout=25)
 report={'scope':'Real SDK JerryScript execution with bounded API/renderer doubles; not real watch renderer, file system or product heap','engineSha256':hashlib.sha256(engines[0].read_bytes()).hexdigest(),'returncode':run.returncode,'output':run.stdout+run.stderr}
 (a.bundle/'native-runtime.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report))
 # This evidence is diagnostic: preserve native engine failures, do not fake a pass.
 if run.returncode==0:
  rows=[s for s in run.stdout.splitlines() if s.startswith('{')]
  if rows:
   value=json.loads(rows[-1]);assert value['store']=='ready' and value['ready'] and value['empty'],value
  report['assertionsExercised']=['store ready','device ready','empty homepage','blank message','file calls > 0'];report['printAvailable']=controls[1]['returncode']==0
  (a.bundle/'native-runtime.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps({'runtimeAssertions':'PASS','printAvailable':report['printAvailable']}))
 else:raise SystemExit(run.returncode)
if __name__=='__main__':main()
