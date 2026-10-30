#!/usr/bin/env python3
"""Prepare a guarded continuation update; never advance the live series here."""
import argparse, hashlib, json, runpy
from pathlib import Path

def digest(path): return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def prepare(plan_path, report_path):
    plan=json.loads(Path(plan_path).read_text());report=json.loads(Path(report_path).read_text())
    if report.get('id')!=plan['id'] or report.get('status')!='passed': raise ValueError('Use a passing report for this plan.')
    phases={p['name']:p['status'] for p in report['phases']}
    if any(phases.get(p)!='passed' for p in ('phone and desktop','stage new release')): raise ValueError('Full browser verification and staging are required.')
    package=Path('stories/animated',plan['id']+'.json')
    if digest(package)!=digest(Path(report['run'])/'episode.json'): raise ValueError('Staged package differs from verified package.')
    # Preparation exports pretty JSON; staging preserves exactly that representation.
    series=plan['series']
    if not series or any(c not in 'abcdefghijklmnopqrstuvwxyz0123456789-' for c in series): raise ValueError('Invalid series.')
    record_path=Path('stories/authoring/series',series+'.json');record=json.loads(record_path.read_text())
    continuation=plan['continuation']
    if not all(isinstance(continuation.get(k),str) and continuation[k].strip() for k in ('end','nextStart','nextEndBefore')): raise ValueError('Provide end, nextStart and nextEndBefore.')
    release=plan['catalog']['id']
    if any(e['episode']==release for e in record['completed']): raise ValueError('Release already recorded.')
    record['completed'].append({'episode':release,'end':continuation['end']})
    record['pendingPublication']=[e for e in record.get('pendingPublication',[]) if e['episode']!=release]
    record['assetsFrom']=package.as_posix()
    for key in ('castRecipes','castBundle'):
        if key in continuation:
            if not Path(continuation[key]).is_file():raise ValueError('Missing continuation cast: '+key)
            record[key]=continuation[key]
    record['source'].update({k:continuation[k] for k in ('nextStart','nextEndBefore')})
    if 'chapter' in continuation:
        if not isinstance(continuation['chapter'],str) or not continuation['chapter'].strip():raise ValueError('chapter must be a nonempty EPUB entry name.')
        record['source']['chapter']=continuation['chapter']
    record['source']['continuationNote']=continuation.get('note',continuation['end'])
    if 'continuity' in continuation:
        if not isinstance(continuation['continuity'],list) or not all(isinstance(x,str) for x in continuation['continuity']):raise ValueError('continuity must be a list of notes.')
        record['continuity']=continuation['continuity']
    record['localContinuation']={'note':'Published through '+release,**{k:continuation[k] for k in ('nextStart','nextEndBefore')},'assetsFrom':package.as_posix()}
    if record['source'].get('kind')!='original':
        runpy.run_path('scripts/episode-source.py')['extract'](record)
    elif not isinstance(record['source'].get('note'),str) or not record['source']['note'].strip():
        raise ValueError('Original episodes require a source note.')
    return {'recordPath':record_path.as_posix(),'baseHash':digest(record_path),'packagePath':package.as_posix(),'packageHash':digest(package),'releaseId':release,'nextRecord':record,'report':{'bytes':report['bytes'],'browser':'full pass','coverage':json.loads((Path(report['run'])/'vocabulary.json').read_text())['range']}}

def merge_candidates(paths):
    candidates=[json.loads(Path(p).read_text()) for p in paths]
    if not candidates:raise ValueError('Provide candidates in episode order.')
    first=candidates[0];base=first['nextRecord']['completed'][:-1];releases=[]
    for c in candidates:
        if (c['recordPath'],c['baseHash'],c['nextRecord']['completed'][:-1])!=(first['recordPath'],first['baseHash'],base):raise ValueError('Batch candidates must share the same unchanged series baseline.')
        if digest(c['packagePath'])!=c['packageHash']:raise ValueError('Batch package changed after verification.')
        if c['releaseId'] in releases:raise ValueError('Duplicate batch episode.')
        releases.append(c['releaseId'])
    final=candidates[-1]
    final['nextRecord']['completed']=base+[c['nextRecord']['completed'][-1] for c in candidates]
    final['batchVerifiedReleases']=[{k:c[k] for k in ('releaseId','packagePath','packageHash')} for c in candidates]
    return final

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--plan');p.add_argument('--report');p.add_argument('--merge',nargs='+');p.add_argument('--output',default='.local/continuation.json');a=p.parse_args()
    if bool(a.merge)==bool(a.plan or a.report) or (not a.merge and not (a.plan and a.report)):p.error('Use --plan and --report, or --merge candidates in episode order.')
    output=Path(a.output).resolve()
    if Path('.local').resolve() not in output.parents:p.error('Keep the candidate under .local/.')
    candidate=merge_candidates(a.merge) if a.merge else prepare(a.plan,a.report);output.parent.mkdir(parents=True,exist_ok=True);output.write_text(json.dumps(candidate,ensure_ascii=False,indent=2)+'\n');print('Prepared continuation: '+str(output))
