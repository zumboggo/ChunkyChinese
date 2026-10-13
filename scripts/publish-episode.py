#!/usr/bin/env python3
"""Publish a committed, checked checkout with bounded VPN retries; no force pushes."""
import argparse, hashlib, json, os, signal, subprocess, time
from pathlib import Path

REPO='zumboggo/ChunkyChinese'
ORIGIN=f'https://github.com/{REPO}.git'
SITE=f'https://zumboggo.github.io/ChunkyChinese/'

class StopPublish(RuntimeError): pass

def run(args,timeout=90,env=None):
    p=subprocess.Popen(args,text=True,stdout=subprocess.PIPE,stderr=subprocess.PIPE,env=env,start_new_session=True)
    try:
        out,err=p.communicate(timeout=timeout)
        return p.returncode,out,err
    except subprocess.TimeoutExpired:
        # Git/curl/npm may spawn children; terminate the process group as well.
        os.killpg(p.pid,signal.SIGTERM)
        try:p.communicate(timeout=5)
        except subprocess.TimeoutExpired:
            os.killpg(p.pid,signal.SIGKILL);p.communicate()
        return 124,'',f'Command timed out after {timeout}s'

def require(args,timeout=90,env=None):
    code,out,err=run(args,timeout,env)
    if code: raise StopPublish(f'{args[0]} failed: {(err or out)[-1800:]}')
    return out.strip()

def push_commit(sha,runner=run,sleeper=time.sleep,attempts=3):
    for attempt in range(attempts):
        # Use normal negotiation first; try HTTP/1.1 only for a retry.
        config=['-c','http.version=HTTP/1.1'] if attempt==1 else []
        args=['git',*config,'-c','http.lowSpeedLimit=100','-c','http.lowSpeedTime=20','push','origin',f'{sha}:refs/heads/main']
        print(f'Push attempt {attempt+1}/{attempts}…',flush=True)
        code,out,err=runner(args,90)
        if code==0: return
        detail=(err or out).lower()
        if any(s in detail for s in ('non-fast-forward','fetch first','authentication failed','permission denied','protected branch','repository not found','remote rejected')):
            raise StopPublish('Push rejected; inspect the remote or credentials. No force push attempted. '+(err or out)[-1000:])
        if attempt+1==attempts: raise StopPublish('Push not confirmed after bounded retries. The commit is saved; rerun the same command when the VPN is stable. '+(err or out)[-500:])
        print('Connection failed or outcome uncertain; retrying the same commit safely.',flush=True)
        sleeper(10*(attempt+1))

def fetch(url,json_data=False):
    # curl uses the host/VPN configuration; never alter DNS, proxy or SSL verification.
    code,out,err=run(['curl','--connect-timeout','10','--max-time','20','--fail','--silent','--show-error',url],25)
    if code: raise ConnectionError(err[-500:])
    return json.loads(out) if json_data else out.encode('utf-8')

def select_run(data,sha):
    matches=[r for r in data.get('workflow_runs',[]) if r.get('head_sha')==sha and r.get('name')=='Deploy GitHub Pages' and r.get('head_branch')=='main']
    return max(matches,key=lambda r:r['id']) if matches else None

def wait_deployment(sha,minutes=10):
    deadline=time.monotonic()+minutes*60;last=None;last_print=0
    while time.monotonic()<deadline:
        try:
            data=fetch(f'https://api.github.com/repos/{REPO}/actions/runs?branch=main&per_page=20',True); r=select_run(data,sha)
            state=(r['status'],r.get('conclusion')) if r else ('waiting for workflow',None)
            if state!=last or time.monotonic()-last_print>=55:
                print('Pages: '+str(state),flush=True);last=state;last_print=time.monotonic()
            if r and r['status']=='completed':
                if r.get('conclusion')!='success': raise StopPublish('Pages deployment did not succeed: '+str(r.get('conclusion')))
                return
        except (ConnectionError,ValueError) as e:
            if time.monotonic()-last_print>=55: print('Pages check waiting for network: '+str(e)[:200],flush=True);last_print=time.monotonic()
        time.sleep(20)
    raise StopPublish('Push succeeded, but deployment was not confirmed within the time limit. Use --verify-only later.')

def verify_live(sha):
    catalog=json.loads(Path('public/stories/animated/catalog.json').read_text())
    files=['stories/animated/catalog.json','service-worker.js']+['stories/animated/'+e['path'] for e in catalog]
    for relative in files:
        expected=hashlib.sha256(Path('public',relative).read_bytes()).hexdigest()
        for attempt in range(3):
            try:
                actual=hashlib.sha256(fetch(SITE+relative+'?release='+sha)).hexdigest()
                if actual==expected: break
                reason='Content has not reached the live site yet'
            except (ConnectionError,ValueError) as e: reason=str(e)
            if attempt==2: raise StopPublish(f'Live verification not confirmed for {relative}: {reason}')
            time.sleep(15)
    print(f'LIVE VERIFIED: {sha}\n{SITE}',flush=True)

def main():
    p=argparse.ArgumentParser(description=__doc__); modes=p.add_mutually_exclusive_group();modes.add_argument('--push',action='store_true');modes.add_argument('--verify-only',action='store_true');p.add_argument('--wait-minutes',type=int,default=10)
    a=p.parse_args()
    if not 1<=a.wait_minutes<=30:p.error('--wait-minutes must be 1–30')
    if require(['git','remote','get-url','--push','origin'])!=ORIGIN: raise StopPublish('Unexpected push remote. This helper is scoped to ChunkyChinese.')
    if require(['git','status','--porcelain']): raise StopPublish('Commit the intended files first; the helper never stages, commits or discards work.')
    sha=require(['git','rev-parse','HEAD'])
    print(f'Target: {REPO} main ← {sha}',flush=True)
    if not a.push and not a.verify_only:
        print('Dry run. --push runs checks, pushes this exact commit, waits for Pages and verifies live assets. --verify-only only checks publication.');return
    if a.push:
        checks=[['npm','test'],['npm','run','game:workflow-test'],['npm','run','game:parity'],['npm','run','build'],['node','scripts/check-client-secrets.mjs']]
        for command in checks:
            print('Check: '+' '.join(command),flush=True);require(command,240,{**os.environ,'GITHUB_PAGES':'true'})
        # Recheck the tree after checks; never publish files different from those validated.
        if require(['git','status','--porcelain']) or require(['git','rev-parse','HEAD'])!=sha:raise StopPublish('Checkout changed during checks; inspect it before publishing.')
        push_commit(sha)
    wait_deployment(sha,a.wait_minutes);verify_live(sha)
if __name__=='__main__':
    try: main()
    except (StopPublish,FileNotFoundError,KeyError) as e: raise SystemExit(str(e))
