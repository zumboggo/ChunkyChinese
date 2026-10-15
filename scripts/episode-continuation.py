"""Guarded post-verification bookkeeping, imported by the publisher."""
import hashlib,json
from pathlib import Path

def digest(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def load_candidate(path):
    c=json.loads(Path(path).read_text());record=Path(c['recordPath']);package=Path(c['packagePath'])
    if record.parent.as_posix()!='stories/authoring/series' or record.suffix!='.json' or package.parent.as_posix()!='stories/animated' or package.suffix!='.json':raise ValueError('Unexpected continuation paths.')
    if digest(package)!=c['packageHash']:raise ValueError('Episode changed after continuation preparation.')
    catalog=json.loads(Path('public/stories/animated/catalog.json').read_text())
    if not any(e['id']==c['releaseId'] and e['path']==package.name for e in catalog):raise ValueError('Continuation release is not in the catalog.')
    n=c['nextRecord']
    if n['id']!=record.stem or n['assetsFrom']!=package.as_posix() or n['completed'][-1]['episode']!=c['releaseId']:raise ValueError('Continuation identity mismatch.')
    return c

def finish(candidate,release_sha,require,push_commit):
    """Caller must first verify the exact release live. Retry never creates duplicate commits."""
    c=candidate
    if require(['git','status','--porcelain']):raise ValueError('Checkout changed during publication; inspect it before saving continuation.')
    path=Path(c['recordPath']);text=json.dumps(c['nextRecord'],ensure_ascii=False,indent=2)+'\n'
    receipt=Path('.local/publish-receipts',release_sha+'-continuation.json');receipt.parent.mkdir(parents=True,exist_ok=True)
    current=require(['git','rev-parse','HEAD'])
    saved=json.loads(receipt.read_text()) if receipt.exists() else {}
    if current not in (release_sha,saved.get('finalSha')):raise ValueError('HEAD changed during publication; do not advance continuation.')
    if path.read_text()!=text:
        if digest(path)!=c['baseHash']:raise ValueError('Series record changed; review the prepared continuation.')
        path.write_text(text)
    require(['git','add','--',str(path)])
    # Commit only this record, including recovery after an interrupted local write.
    if require(['git','diff','--cached','--name-only']):require(['git','commit','-m','Record verified '+c['releaseId']+' continuation','--',str(path)])
    final_sha=require(['git','rev-parse','HEAD'])
    receipt.write_text(json.dumps({'releaseSha':release_sha,'finalSha':final_sha,'candidate':c},ensure_ascii=False,indent=2)+'\n')
    bookkeeping=Path('.local/publish-receipts',final_sha+'.json')
    bookkeeping.write_text(json.dumps({'sha':final_sha,'mode':'bookkeeping','paths':[str(path)]})+'\n')
    push_commit(final_sha)
    if require(['git','ls-remote','origin','refs/heads/main']).split()[0]!=final_sha:raise ValueError('Continuation push not confirmed; retry the same command.')
    print('CONTINUATION SAVED: '+final_sha,flush=True)
    print('RELEASE SUMMARY: '+json.dumps({'release':c['releaseId'],**c.get('report',{})},ensure_ascii=False),flush=True)
