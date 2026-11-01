"""Execute and archive real final regression output without shell pipelines."""
import json
import re
import subprocess
from pathlib import Path

REPO=Path(__file__).resolve().parent.parent
OUT=Path('/storage/emulated/0/Documents/liubai-watch-delivery/ui-restoration/test-logs')
OUT.mkdir(parents=True,exist_ok=True)
commands=[('app-tests',['node','--experimental-vm-modules','--test','--test-concurrency=1','--test-reporter=spec',*[str(p.relative_to(REPO)) for p in sorted((REPO/'tests').glob('*.test.mjs'))]]),
          ('host-negative-tests',['node','--test','--test-reporter=spec',*[str(p.relative_to(REPO)) for p in sorted((REPO/'qa').glob('test-sim-*.mjs'))]]),
          ('source-verification',['python','scripts/verify-source.py']),('whitespace-verification',['git','diff','--check'])]
results=[]
for name,args in commands:
    log=OUT/(name+'.log')
    with log.open('w') as f:
        run=subprocess.run(args,cwd=REPO,stdout=f,stderr=subprocess.STDOUT)
    text=log.read_text()
    summary={'name':name,'exit_code':run.returncode,'log':str(log)}
    for key in ['tests','pass','fail','skipped','cancelled']:
        found=re.findall(r'\u2139 '+key+r' (\d+)',text)
        if found:summary[key]=int(found[-1])
    results.append(summary)
    if run.returncode:
        print(json.dumps(summary,ensure_ascii=False))
        raise SystemExit(run.returncode)
(OUT/'results.json').write_text(json.dumps({'status':'PASS','commands':results},ensure_ascii=False,indent=2))
print(json.dumps({'status':'PASS','results':results},ensure_ascii=False))
