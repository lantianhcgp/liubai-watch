#!/usr/bin/env python3
import pathlib,subprocess,re,sys,json
root=pathlib.Path(__file__).resolve().parents[1]
pat=re.compile(rb'ghp_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9_-]{24,}|-----BEGIN (?:RSA |EC )?PRIVATE KEY-----')
bad=[];seen=set()
for sha in subprocess.check_output(['git','rev-list','--all'],cwd=root,text=True).split():
 for line in subprocess.check_output(['git','ls-tree','-r',sha],cwd=root,text=True).splitlines():
  meta,name=line.split('\t',1);obj=meta.split()[2]
  if obj in seen:continue
  seen.add(obj);data=subprocess.check_output(['git','cat-file','blob',obj],cwd=root)
  if pat.search(data)or pathlib.Path(name).suffix in ['.pem','.key','.p12','.pfx','.p7b']:bad.append({'where':'history','file':name})
for folder in ['entry','qa','scripts','docs','tests','.github']:
 for p in(root/folder).rglob('*'):
  if not p.is_file()or '/.state/'in str(p)or '/vendor/'in str(p):continue
  if p.name=='secret-audit.py':continue
  if pat.search(p.read_bytes())or p.suffix in ['.pem','.key','.p12','.pfx','.p7b']:bad.append({'where':'worktree','file':str(p.relative_to(root))})
print(json.dumps({'unique_history_blobs':len(seen),'risk_count':len(bad),'risks':bad},ensure_ascii=False));sys.exit(bool(bad))
