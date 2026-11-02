#!/usr/bin/env python3
"""Preserve complete real compiler APP; compact only actual JS with pinned Terser.
No selected pages, runtime polyfills, API substitution or synthetic UI.
"""
import argparse
import copy
import hashlib
import io
import json
from pathlib import Path
import subprocess
import zipfile

HERE=Path(__file__).resolve().parent
PREFIX='assets/js/MainAbility/'
EXPECTED=[f'pages/{p}/{p}' for p in ['boot','index','read','edit','menu','history','day','trash']]
def sha(data):return hashlib.sha256(data).hexdigest()
def rewrite(data,changes):
    out=io.BytesIO()
    with zipfile.ZipFile(io.BytesIO(data)) as source,zipfile.ZipFile(out,'w') as target:
        assert source.testzip() is None
        for info in source.infolist():target.writestr(copy.copy(info),changes.get(info.filename,source.read(info)))
    return out.getvalue()
def budgets(records):
    app_size=len(records[PREFIX+'app.js']);rows=[]
    actual={p[len(PREFIX):-3] for p in records if p.startswith(PREFIX+'pages/') and p.endswith('.js')}
    assert actual==set(EXPECTED),'Complete registered page set required'
    for page in EXPECTED:
        size=len(records[PREFIX+page+'.js']);combined=size+app_size
        assert size>0 and combined<49152,'app.js + page exceeds conservative 48KB budget: '+page
        rows.append({'page':page,'bytes':size,'appPlusPage':combined})
    return rows

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--app',type=Path,required=True);parser.add_argument('--out',type=Path,required=True);parser.add_argument('--sdk',type=Path,required=True);args=parser.parse_args()
    source=args.app.read_bytes();args.out.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(io.BytesIO(source)) as outer:
        haps=[n for n in outer.namelist() if n.endswith('.hap')];assert len(haps)==1
        hap_name=haps[0];hap_bytes=outer.read(hap_name)
    with zipfile.ZipFile(io.BytesIO(hap_bytes)) as hap:
        assert hap.testzip() is None
        records={n:hap.read(n) for n in hap.namelist() if not n.endswith('/')}
    cfg=json.loads(records['config.json']);manifest=json.loads(records[PREFIX+'manifest.json'])
    assert cfg['module']['js'][0]['pages']==manifest['pages']==EXPECTED
    assert cfg['app']['bundleName']=='com.hcbiu.liubai'
    work=args.out/'compiler';work.mkdir(exist_ok=True)
    for name,data in records.items():
        if name.startswith(PREFIX) and (name.endswith('.js') or name.endswith('.js.map')):
            file=work/name[len(PREFIX):];file.parent.mkdir(parents=True,exist_ok=True);file.write_bytes(data)
    compact=args.out/'compact'
    subprocess.run(['node',str(HERE/'compact.mjs'),str(work),str(compact)],check=True)
    changes={}
    for name in records:
        if name.startswith(PREFIX) and (name.endswith('.js') or name.endswith('.js.map')):
            changes[name]=(compact/name[len(PREFIX):]).read_bytes()
    candidate_hap=rewrite(hap_bytes,changes);result=rewrite(source,{hap_name:candidate_hap})
    candidate=args.out/'liubai-r18-complete.app';candidate.write_bytes(result)
    with zipfile.ZipFile(io.BytesIO(candidate_hap)) as z:
        current={n:z.read(n) for n in z.namelist() if not n.endswith('/')}
        assert set(current)==set(records)
        for name,data in current.items():assert data==changes.get(name,records[name]),name
    rows=budgets(current)
    engines=[p for p in args.sdk.rglob('jerry') if p.is_file() and p.parent.name=='bin' and 'ace-loader' in str(p)]
    assert len(engines)==1;engine=engines[0];parse=[]
    for name,data in changes.items():
        if not name.endswith('.js'):continue
        file=compact/name[len(PREFIX):]
        run=subprocess.run([str(engine),'--mem-stats','--parse-only',str(file)],capture_output=True,text=True,timeout=25)
        parse.append({'entry':name,'sha256':sha(data),'bytes':len(data),'returncode':run.returncode,'output':run.stdout+run.stderr})
    report={'ok':all(r['returncode']==0 for r in parse),'scope':'complete real compiler application + build-side compaction; parser-only does not prove runtime','sourceAppSha256':sha(source),'candidateAppSha256':sha(result),'sourceHead':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),'pages':EXPECTED,'pageSelectionPerformed':False,'changedEntries':sorted(changes),'resourcesByteExact':True,'records':{n:{'bytes':len(b),'sha256':sha(b)} for n,b in current.items()},'budget':rows,'engineSha256':sha(engine.read_bytes()),'nativeParser':parse,'minifier':json.loads((compact/'report.json').read_text())}
    (args.out/'provenance.json').write_text(json.dumps(report,indent=2)+'\n')
    assert args.app.read_bytes()==source
    print(json.dumps({k:report[k] for k in ['ok','sourceHead','sourceAppSha256','candidateAppSha256','budget']}))
    if not report['ok']:raise SystemExit(1)
if __name__=='__main__':main()
