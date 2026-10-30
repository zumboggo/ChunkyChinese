#!/usr/bin/env python3
"""Publish an exact committed snapshot without disturbing concurrent authoring work."""
import argparse,json,os,shutil,subprocess,tempfile
from pathlib import Path

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--ref',default='HEAD');p.add_argument('--continuation');p.add_argument('--push',action='store_true');a=p.parse_args()
    root=Path.cwd()
    def git(*args):return subprocess.check_output(['git',*args],text=True).strip()
    sha=git('rev-parse',a.ref+'^{commit}')
    if not a.push:print(json.dumps({'commit':sha,'action':'isolated release','note':'Use --push after committing intended files.'}));return
    candidate=json.loads(Path(a.continuation).read_text()) if a.continuation else None
    parent=root/'.local/release-worktrees';parent.mkdir(parents=True,exist_ok=True)
    directory=Path(tempfile.mkdtemp(prefix=sha[:8]+'-',dir=parent));checkout=directory/'app'
    subprocess.run(['git','worktree','add','--detach',str(checkout),sha],check=True,stdout=subprocess.DEVNULL)
    (checkout/'node_modules').symlink_to((root/'node_modules').resolve(),target_is_directory=True)
    local=checkout/'.local';local.mkdir(exist_ok=True)
    receipts=root/'.local/publish-receipts'
    if receipts.exists():shutil.copytree(receipts,local/'publish-receipts')
    command=['python3','scripts/publish-episode.py','--push']
    if candidate:
        (local/'continuation.json').write_text(json.dumps(candidate));command+=['--continuation','.local/continuation.json']
    # Source location is resolved from the shared Git directory; no sibling symlinks needed.
    result=subprocess.run(command,cwd=checkout)
    if result.returncode:
        print('Release checkout preserved for diagnosis/retry: '+str(checkout));raise SystemExit(result.returncode)
    shutil.copytree(local/'publish-receipts',receipts,dirs_exist_ok=True)
    final=subprocess.check_output(['git','rev-parse','HEAD'],cwd=checkout,text=True).strip()
    # Keep a durable local reference without moving the active author's branch.
    subprocess.run(['git','update-ref','refs/heads/codex/release-'+sha[:12],final],check=True)
    subprocess.run(['git','worktree','remove','--force',str(checkout)],check=True)
    directory.rmdir()
    print('Verified release saved at '+final+'. Active checkout left unchanged.')
if __name__=='__main__':main()
