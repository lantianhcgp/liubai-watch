#!/usr/bin/env python3
"""Update disclosed upstream-only hmlwsim patch inventory from original fixed git bytes."""
from pathlib import Path
import subprocess,hashlib,json,difflib
ROOT=Path(__file__).resolve().parents[1];UPSTREAM=Path('/data/data/com.termux/files/home/hmlwsim');SIM=Path('/data/data/com.termux/files/home/liubai-rebuild-private/hmlwsim');REF='2b28919fc14ea25eaed46f895817d58e481a8657';files=['js/runtime/sandbox.js','js/runtime/deviceFeature_pageNav.js','js/runtime/deviceFeature_display.js','js/css-adapter.js','js/app.js'];proof=[];diff=[]
for n in files:
 old=subprocess.check_output(['git','show',REF+':'+n],cwd=UPSTREAM);new=(SIM/n).read_bytes();proof.append({'file':n,'upstreamSha256':hashlib.sha256(old).hexdigest(),'hostSha256':hashlib.sha256(new).hexdigest()});diff.extend(difflib.unified_diff(old.decode().splitlines(True),new.decode().splitlines(True),fromfile='a/'+n,tofile='b/'+n))
assert 'pageExports._data.$vm' not in (SIM/'js/runtime/deviceFeature_pageNav.js').read_text()
(ROOT/'qa/host-patch.diff').write_text(''.join(diff));(ROOT/'qa/host-patch-proof.json').write_text(json.dumps({'scope':'host-only original upstream compatibility; no fake $vm seam or product data edits','upstreamCommit':REF,'files':proof},indent=2)+'\n');print('DISCLOSED_HOST_PATCH_PROOF_UPDATED',len(proof))
