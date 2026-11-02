#!/usr/bin/env python3
"""Parse exact candidate JS with the matching CLT SDK native engine."""
import argparse
import hashlib
import json
from pathlib import Path
import subprocess

parser=argparse.ArgumentParser();parser.add_argument('--sdk',type=Path,required=True);parser.add_argument('--bundle',type=Path,required=True);args=parser.parse_args()
candidates=[p for p in args.sdk.rglob('jerry') if p.is_file() and p.parent.name=='bin' and 'ace-loader' in str(p)];assert len(candidates)==1
engine=candidates[0];sha=lambda b:hashlib.sha256(b).hexdigest();records=[]
for part in ['app','boot','index']:
 file=args.bundle/'variants'/('liubai-'+part+'.js');run=subprocess.run([str(engine),'--parse-only',str(file)],text=True,capture_output=True,timeout=25)
 record={'file':file.name,'sha256':sha(file.read_bytes()),'bytes':file.stat().st_size,'returncode':run.returncode,'output':run.stdout+run.stderr};records.append(record);print(json.dumps(record))
report={'scope':'CLT6.1.1.280 parser only; not physical-watch renderer or heap guarantee','engineSha256':sha(engine.read_bytes()),'records':records}
(args.bundle/'native-parser.json').write_text(json.dumps(report,indent=2)+'\n');assert all(r['returncode']==0 for r in records)
