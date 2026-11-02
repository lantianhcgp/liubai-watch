#!/usr/bin/env python3
"""Exact compiler files, sequential native evaluation (NO eval/source concatenation).
The SDK engine is real. All native APIs and component objects are test doubles.
A pass is NOT proof of the FIT3 UI, native storage, or device heap.
"""
import argparse
import hashlib
import json
from pathlib import Path
import shutil
import subprocess

HOST = r"""
var __tasks=[],__files={},__now=0,__tid=0,__calls=0,__route='',__last=null,__app=null,__boot=null,__page=null;
var console={info:function(){},log:function(){},error:function(){},warn:function(){}};
function __point(s){print('POINT '+s);}
function setTimeout(fn,ms){var n=++__tid;__tasks.push({id:n,due:__now+Number(ms||0),fn:fn});return n;}
function clearTimeout(n){for(var i=0;i<__tasks.length;i++)if(__tasks[i].id===n)__tasks[i].fn=null;}
function setInterval(){throw new Error('INTERVAL_NOT_TESTED');}
function clearInterval(n){clearTimeout(n);}
function __drain(){var n=0;while(__tasks.length&&n++<150){__tasks.sort(function(a,b){return a.due-b.due||a.id-b.id;});var t=__tasks.shift();if(t.fn){__now=t.due;t.fn();}}if(n>=150)throw new Error('QUEUE_UNBOUNDED');}
function ViewModel(o){var p=o.data||{},k;for(k in o)if(k!=='data')p[k]=o[k];p._vm=p;p.$t=function(k){return k;};p.$refs={};__last=p;return p;}
function _c(t,a,c){return {tag:t,attributes:a,children:c};}
function _i(test,build){return test()?build():null;}
function _l(a,build){var r=[],i;for(i=0;i<a.length;i++)r.push(build(a[i],i));return r;}
function __later(o,ok,v){setTimeout(function(){if(ok){if(o.success)o.success(v);}else if(o.fail)o.fail('missing',301);},0);}
var __file={
 mkdir:function(o){__calls++;__files[o.uri]=null;__later(o,true);},
 get:function(o){__calls++;var b=Object.prototype.hasOwnProperty.call(__files,o.uri);__later(o,b,{uri:o.uri,type:__files[o.uri]===null?'dir':'file',length:__files[o.uri]?__files[o.uri].length:0});},
 readText:function(o){__calls++;__later(o,Object.prototype.hasOwnProperty.call(__files,o.uri),{text:__files[o.uri]||''});},
 writeText:function(o){__calls++;__files[o.uri]=o.text;__later(o,true);},
 delete:function(o){__calls++;delete __files[o.uri];__later(o,true);},
 list:function(o){__calls++;__later(o,true,{fileList:[]});}
};
function requireNative(n){
 if(n==='system.file')return __file;
 if(n==='system.device')return {getInfo:function(o){__later(o,true,{windowWidth:412,windowHeight:484,screenShape:'rect',deviceType:'liteWearable'});}};
 if(n==='system.router')return {replace:function(o){__route=o.uri;},push:function(o){__route=o.uri;},back:function(){}};
 if(n==='system.app')return {getInfo:function(){return {};}};
 throw new Error('UNTESTED_NATIVE_MODULE '+n);
}
__point('host');
"""
CREATE = "__app=__last;var $app=__app;if(__app.onCreate)__app.onCreate();__last=null;__point('app-created');"
BOOT = "__boot=__last;__last=null;__point('boot-exported');var __bt=__boot.render();if(!__bt||__bt.tag!=='div')throw new Error('BOOT_RENDER_ROOT');__bt=null;__point('boot-rendered');__boot.onInit();__point('boot-onInit attached='+__boot.attached);"
ROUTE = "__boot.onReady();if(__route!=='pages/index/index')throw new Error('BOOT_ROUTE');__point('boot-routed');"
BOOTFIN = "__drain();var __v={test:'boot-only',route:__route,store:__app.getLiubaiStoreState(),fileCalls:__calls,attached:__boot.attached};if(__v.store!=='ready'||!__v.attached||__calls<1)throw new Error('BOOT_STATE');print('RESULT '+JSON.stringify(__v));"
INDEXEXPORT = "__page=__last;__last=null;__point('index-exported');var __it=__page.render();if(!__it||__it.tag!=='stack')throw new Error('INDEX_RENDER_ROOT');__it=null;__point('index-rendered-initial');"
FINISH = "__page.onInit();__point('index-onInit');__drain();__point('callbacks-drained');var __v={test:'full-startup',route:__route,store:__app.getLiubaiStoreState(),ready:__page.ready,empty:__page.empty,loading:__page.loading,message:__page.message,error:__page.errorDetail,fileCalls:__calls};var __rt=__page.render();if(!__rt||__rt.tag!=='stack')throw new Error('READY_RENDER_ROOT');if(__v.store!=='ready'||__v.ready!==true||__v.empty!==true||__v.message!==''||__v.fileCalls<1)throw new Error('STARTUP_STATE '+JSON.stringify(__v));print('RESULT '+JSON.stringify(__v));"


def run_case(engine, files, name, directory, parse=False):
    # Line-buffer stdout. Jerry fatal exit10 otherwise discards buffered POINTs.
    args = [str(engine)]
    if parse:
        args.append('--parse-only')
    args.extend(map(str, files))
    if not parse and shutil.which('stdbuf'):
        args = ['stdbuf', '-oL', '-eL'] + args
    try:
        r = subprocess.run(args, capture_output=True, text=True, timeout=25)
        row = {'case': name, 'returncode': r.returncode, 'output': r.stdout + r.stderr,
               'lastPoint': next((s for s in reversed(r.stdout.splitlines()) if s.startswith('POINT ')), None),
               'files': [str(p.relative_to(directory)) for p in files]}
    except subprocess.TimeoutExpired as e:
        row = {'case': name, 'returncode': 'timeout', 'output': str(e), 'files': [str(p) for p in files]}
    (directory / (name + '.json')).write_text(json.dumps(row, indent=2) + '\n')
    print(json.dumps(row), flush=True)
    return row


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--sdk', type=Path, required=True)
    p.add_argument('--out', type=Path, required=True)
    a = p.parse_args()
    roots = [s for s in a.sdk.rglob('jerry') if s.is_file() and s.parent.name == 'bin' and 'ace-loader' in str(s)]
    assert len(roots) == 1, roots
    engine = roots[0]
    a.out.mkdir(parents=True, exist_ok=True)
    fixture = Path(__file__).parent / 'fixtures'
    sources = {}
    for f in fixture.glob('*.js'):
        q = a.out / f.name
        q.write_bytes(f.read_bytes())
        sources[f.name] = {'bytes': f.stat().st_size, 'sha256': hashlib.sha256(f.read_bytes()).hexdigest()}
    def file(name, text):
        q = a.out / name
        q.write_text(text)
        return q
    host = file('00-host.js', HOST)
    create = file('01-app-create.js', CREATE)
    boot = file('02-boot-init.js', BOOT)
    route = file('03-boot-route.js', ROUTE)
    drop = file('04-drop-boot.js', '__boot=null;__last=null;__point("boot-ref-dropped");')
    drain = file('04-drain-boot.js', '__drain();__point("boot-callbacks-drained");__boot=null;__last=null;')
    export = file('05-index-export.js', INDEXEXPORT)
    finish = file('06-finish.js', FINISH)
    basic = file('basic.js', 'var a={};Object.defineProperty(a,"x",{value:2});if(a.x!==2||JSON.parse("{\\"x\\":2}").x!==2||decodeURI("%41")!=="A")throw 2;print("RESULT basic-ok");')
    oom = file('oom-control.js', '__point("allocation-control-start");var a=[];for(var i=0;i<100000;i++)a.push({x:i,s:String(i)});print("RESULT allocated-all");')
    fail = file('exception-control.js', '__point("exception-start");throw new Error("EXPECTED_CONTROL_ERROR");')
    rows = []
    for name, files in [
        ('basic', [basic]),
        ('exception-control', [host, fail]),
        ('allocation-control', [host, oom]),
    ]:
        rows.append(run_case(engine, files, name, a.out))
    parse_rows = [run_case(engine, [a.out / n], 'parse-' + n[:-3], a.out, parse=True) for n in sources]
    control_end = file('control-export.js', '__page=__last;if(!__page||typeof __page.render!=="function")throw new Error("CONTROL_VM");var t=__page.render();if(!t)throw new Error("CONTROL_RENDER");print("RESULT control-export-render");')
    cases = [
        ('control-export-render', [host, a.out/'control-app.js', create, a.out/'control-index.js', control_end]),
        ('r16-app', [host, a.out/'r16-app.js', create]),
        ('r16-boot', [host, a.out/'r16-app.js', create, a.out/'r16-boot.js', boot, route, file('boot-finish.js', BOOTFIN)]),
        ('r16-index-alone', [host, a.out/'r16-index.js', export]),
        ('r16-full-drop-boot', [host, a.out/'r16-app.js', create, a.out/'r16-boot.js', boot, route, drop, a.out/'r16-index.js', export, finish]),
        ('r16-full-drain-boot', [host, a.out/'r16-app.js', create, a.out/'r16-boot.js', boot, route, drain, a.out/'r16-index.js', export, finish]),
        ('r16-full-retain-boot', [host, a.out/'r16-app.js', create, a.out/'r16-boot.js', boot, route, a.out/'r16-index.js', export, finish]),
    ]
    for name, files in cases:
        rows.append(run_case(engine, files, name, a.out))
    sdk_info = subprocess.run([str(engine), '--version'], capture_output=True, text=True, timeout=10)
    report = {'scope': 'Same CLT6.1.1.280 SDK CLI engine. Exact compiler JS files evaluated sequentially without JS eval, JSON source literals or joined page scripts. API, ViewModel and render primitives are test doubles; not a FIT3 runtime verification.',
              'engineSha256': hashlib.sha256(engine.read_bytes()).hexdigest(), 'engineVersion': sdk_info.stdout + sdk_info.stderr,
              'fixtureProvenance': {'r16': '41418736638/variants; exact signed candidate compiler JS hashes', 'control': 'r13 installed payload (installation verified ONLY; foreground launch not reported)'},
              'sources': sources, 'parseRows': parse_rows, 'executionRows': rows}
    (a.out / 'native-report.json').write_text(json.dumps(report, indent=2) + '\n')
    assert rows[0]['returncode'] == 0, 'Host builtins failed; no conclusions about product'
    assert all(s['returncode'] == 0 for s in parse_rows), 'Exact compiler parse failure'
    print('REPORT ' + str(a.out / 'native-report.json'))


if __name__ == '__main__':
    main()
