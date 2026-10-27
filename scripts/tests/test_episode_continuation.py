import json,os,tempfile,unittest,importlib.util,sys
from pathlib import Path
from unittest.mock import patch
BASE=Path(__file__).resolve().parents[1]
def load(name,file):
 spec=importlib.util.spec_from_file_location(name,BASE/file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
c=load('continuation','episode-continuation.py');p=load('publisher','publish-episode.py')
class ContinuationTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.old=os.getcwd();os.chdir(self.tmp.name);self.addCleanup(self.cleanup)
  self.record=Path('stories/authoring/series/test.json');self.record.parent.mkdir(parents=True);self.record.write_text('{}')
  package=Path('stories/animated/test.json');package.parent.mkdir(parents=True);package.write_text('{}')
  catalog=Path('public/stories/animated/catalog.json');catalog.parent.mkdir(parents=True);catalog.write_text(json.dumps([{'id':'test-v1','path':'test.json'}]))
  self.candidate={'recordPath':str(self.record),'baseHash':c.digest(self.record),'packagePath':str(package),'packageHash':c.digest(package),'releaseId':'test-v1','nextRecord':{'id':'test','assetsFrom':str(package),'completed':[{'episode':'test-v1'}]}}
  Path('candidate.json').write_text(json.dumps(self.candidate))
 def cleanup(self):os.chdir(self.old);self.tmp.cleanup()
 def test_rejects_changed_package_and_record(self):
  self.assertEqual(c.load_candidate('candidate.json'),self.candidate)
  Path(self.candidate['packagePath']).write_text('changed')
  with self.assertRaisesRegex(ValueError,'Episode changed'):c.load_candidate('candidate.json')
  self.record.write_text('changed')
  def require(args):return 'release' if args[1]=='rev-parse' else ''
  with self.assertRaisesRegex(ValueError,'Series record changed'):c.finish(self.candidate,'release',require,lambda _:None)
 def test_verification_failure_never_advances_record(self):
  def require(args,*extra):
   if args[1:3]==['remote','get-url']:return p.ORIGIN
   if args[1]=='rev-parse':return 'release'
   return ''
  with patch.object(sys,'argv',['publish','--push','--continuation=candidate.json']),patch.object(p,'require',require),patch.object(p,'publication_plan',return_value={'mode':'release','sha':'release','base':'previous','paths':[]}),patch.object(p,'push_commit'),patch.object(p,'wait_deployment'),patch.object(p,'verify_live',side_effect=p.StopPublish('not live')):
   with self.assertRaisesRegex(p.StopPublish,'not live'):p.main()
  self.assertEqual(self.record.read_text(),'{}')
 def test_finish_push_retry_reuses_commit_and_receipt(self):
  evidence=Path('.local/publish-receipts');evidence.mkdir(parents=True)
  (evidence/'live-release.json').write_text(json.dumps({'sha':'release','verified':True}))
  head=['release'];commits=[];pushes=[]
  def require(args):
   if args[1]=='rev-parse':return head[0]
   if args[1]=='diff':return str(self.record) if head[0]=='release' else ''
   if args[1]=='commit':commits.append(args);head[0]='bookkeeping'
   if args[1]=='ls-remote':return head[0]+' refs/heads/main'
   return ''
  def push(sha):
   pushes.append(sha)
   if len(pushes)==1:raise RuntimeError('lost connection')
  with self.assertRaisesRegex(RuntimeError,'lost connection'):c.finish(self.candidate,'release',require,push)
  self.assertFalse((evidence/'live-bookkeeping.json').exists())
  c.finish(self.candidate,'release',require,push)
  self.assertEqual(json.loads((evidence/'live-bookkeeping.json').read_text())['releaseSha'],'release')
  self.assertEqual(len(commits),1);self.assertEqual(pushes,['bookkeeping','bookkeeping']);self.assertEqual(json.loads(self.record.read_text()),self.candidate['nextRecord'])
 def test_head_change_prevents_record_write(self):
  with self.assertRaisesRegex(ValueError,'HEAD changed'):c.finish(self.candidate,'release',lambda a:'other' if a[1]=='rev-parse' else '',lambda _:None)
  self.assertEqual(self.record.read_text(),'{}')

class PreparationTests(unittest.TestCase):
 def test_requires_full_pass_and_exact_staged_package(self):
  import zipfile,hashlib
  prep=load('prep','prepare-continuation.py')
  with tempfile.TemporaryDirectory() as directory:
   old=os.getcwd();os.chdir(directory)
   try:
    book=Path('book.epub')
    with zipfile.ZipFile(book,'w') as z:
     z.writestr('chapter','<p>Next start. Next end.</p>')
     z.writestr('next-chapter','<p>Later start. Later end.</p>')
    record=Path('stories/authoring/series/test.json');record.parent.mkdir(parents=True)
    record.write_text(json.dumps({'id':'test','completed':[],'source':{'epub':str(book.resolve()),'sha256':hashlib.sha256(book.read_bytes()).hexdigest(),'chapter':'chapter','nextStart':'old','nextEndBefore':'old end'}}))
    package=Path('stories/animated/new.json');package.parent.mkdir(parents=True);package.write_text('{}\n')
    run=Path('run');run.mkdir();(run/'episode.json').write_text('{}\n');(run/'vocabulary.json').write_text('{"range":{"min":95,"max":96}}')
    Path('plan.json').write_text(json.dumps({'id':'new','series':'test','catalog':{'id':'new-v1'},'continuation':{'end':'Finished.','nextStart':'Next start.','nextEndBefore':'Next end.'}}))
    report={'id':'new','status':'passed','bytes':3,'run':str(run),'phases':[{'name':n,'status':'passed'} for n in ['phone and desktop','stage new release']]}
    Path('report.json').write_text(json.dumps(report))
    # Use the real EPUB validator at its known script path inside the isolated workspace.
    Path('scripts').mkdir();Path('scripts/episode-source.py').write_text((BASE/'episode-source.py').read_text())
    result=prep.prepare('plan.json','report.json');self.assertEqual(result['nextRecord']['completed'][0]['episode'],'new-v1');self.assertEqual(json.loads(record.read_text())['completed'],[])
    plan=json.loads(Path('plan.json').read_text());plan['continuation'].update(chapter='next-chapter',nextStart='Later start.',nextEndBefore='Later end.');Path('plan.json').write_text(json.dumps(plan))
    result=prep.prepare('plan.json','report.json');self.assertEqual(result['nextRecord']['source']['chapter'],'next-chapter');self.assertEqual(json.loads(record.read_text())['source']['chapter'],'chapter')
    plan['continuation']['chapter']='missing';Path('plan.json').write_text(json.dumps(plan))
    with self.assertRaises(KeyError):prep.prepare('plan.json','report.json')
    plan['continuation']['chapter']='next-chapter';Path('plan.json').write_text(json.dumps(plan))
    original=json.loads(record.read_text());original['source']={'kind':'original','note':'Original adventure','nextStart':'old','nextEndBefore':'end'};record.write_text(json.dumps(original))
    result=prep.prepare('plan.json','report.json');self.assertEqual(result['nextRecord']['source']['kind'],'original');self.assertEqual(json.loads(record.read_text())['completed'],[])
    original['source']['note']='';record.write_text(json.dumps(original))
    with self.assertRaisesRegex(ValueError,'source note'):prep.prepare('plan.json','report.json')
    package.write_text('changed')
    with self.assertRaisesRegex(ValueError,'differs'):prep.prepare('plan.json','report.json')
    report['phases']=[];Path('report.json').write_text(json.dumps(report))
    with self.assertRaisesRegex(ValueError,'Full browser'):prep.prepare('plan.json','report.json')
   finally:os.chdir(old)
