#!/usr/bin/env python3
"""Pre-push/production source secret scan; values are never emitted."""
import argparse,hashlib,re,subprocess,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PATTERNS=[rb'ghp_[A-Za-z0-9]{30,}',rb'github_pat_[A-Za-z0-9_]{30,}',rb'-----BEGIN (?:EC |RSA )?PRIVATE KEY-----',rb'(?:sk|rk)-[A-Za-z0-9_-]{32,}']
def scan():
 names=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0');hits=[]
 for n in names:
  if not n:continue
  p=ROOT/n;b=p.read_bytes()
  if p.suffix in ['.pem','.p12','.p7b','.key'] or any(re.search(r,b) for r in PATTERNS):hits.append(n)
 print(json.dumps({'trackedFiles':len([n for n in names if n]),'riskCount':len(hits),'riskPaths':hits}));assert not hits,'Stop: credentials in tracked payload'
if __name__=='__main__':scan()
