from unittest.mock import patch
import hashlib, importlib.util, sys, tempfile, unittest, zipfile, os, json
from pathlib import Path

def load(name,filename):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).parents[1]/filename)
    module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module);return module
source=load('episode_source','episode-source.py');publish=load('episode_publish','publish-episode.py')

class SourceTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory();self.addCleanup(self.temp.cleanup)
        self.path=Path(self.temp.name)/'right.epub'
        with zipfile.ZipFile(self.path,'w') as z:z.writestr('chapter.xhtml','<html><style>omit</style><p>Before.</p><p>Start here &amp; continue.</p><p>Stop here.</p></html>')
        self.record={'source':{'epub':str(self.path),'sha256':hashlib.sha256(self.path.read_bytes()).hexdigest(),'chapter':'chapter.xhtml','nextStart':'Start here','nextEndBefore':'Stop here'}}
    def test_exact_passage(self):self.assertEqual(source.extract(self.record),'Start here & continue.')
    def test_wrong_book_fails(self):
        self.record['source']['sha256']='0'*64
        with self.assertRaisesRegex(ValueError,'fingerprint'):source.extract(self.record)
    def test_bad_boundaries_and_large_excerpts_fail(self):
        with self.assertRaisesRegex(ValueError,'Narrow'):source.extract(self.record,limit=3)
        self.record['source']['nextStart']='absent'
        with self.assertRaisesRegex(ValueError,'exactly once'):source.extract(self.record)

class PublishTests(unittest.TestCase):
    def test_bookkeeping_filter_is_narrow_and_matches_workflow(self):
        self.assertTrue(publish.bookkeeping_only(['stories/authoring/series/moonlight.json']))
        for paths in ([],['stories/authoring/series/a.json','src/App.tsx'],['stories/authoring/common-familiar-100.json'],['stories/authoring/series/nested/a.json'],['stories/authoring/series/a.md']):
            self.assertFalse(publish.bookkeeping_only(paths))
        workflow=Path('.github/workflows/deploy-pages.yml').read_text()
        self.assertIn("'stories/authoring/series/*.json'",workflow)

    def test_plan_compares_all_unpublished_commits(self):
        calls=[]
        def require(args,*extra):
            calls.append(args)
            if args[1]=='ls-remote':return 'remote refs/heads/main'
            if args[1]=='diff':return 'stories/authoring/series/moonlight.json\nsrc/App.tsx'
            return ''
        with patch.object(publish,'require',require),patch.object(publish,'run',return_value=(0,'','')):
            result=publish.publication_plan('local')
        self.assertEqual(result['mode'],'release')
        self.assertIn(['git','diff','--name-only','remote','local'],calls)

    def test_divergent_remote_cannot_be_pushed(self):
        with patch.object(publish,'require',return_value='remote refs/heads/main'),patch.object(publish,'run',side_effect=[(0,'',''),(1,'','')]):
            with self.assertRaisesRegex(publish.StopPublish,'ancestor'):publish.publication_plan('local')

    def test_bookkeeping_push_never_builds_or_waits_for_pages(self):
        with tempfile.TemporaryDirectory() as directory:
            old=os.getcwd();os.chdir(directory)
            try:
                Path('assets.json').write_text('{}')
                path='stories/authoring/series/test.json';Path(path).parent.mkdir(parents=True)
                Path(path).write_text(json.dumps({'id':'test','completed':[],'assetsFrom':'assets.json','source':{k:'present' for k in ('epub','sha256','chapter','nextStart','nextEndBefore')}}))
                calls=[]
                def require(args,*extra):
                    calls.append(args)
                    if args[:3]==['git','remote','get-url']:return publish.ORIGIN
                    if args[:2]==['git','rev-parse']:return 'sha'
                    if args[:2]==['git','ls-remote']:return 'sha refs/heads/main'
                    return ''
                plan={'sha':'sha','base':'previous','mode':'bookkeeping','paths':[path]}
                with patch.object(sys,'argv',['publish','--push']),patch.object(publish,'require',require),patch.object(publish,'publication_plan',return_value=plan),patch.object(publish,'push_commit') as push,patch.object(publish,'wait_deployment') as wait,patch.object(publish,'verify_live') as live:
                    publish.main()
                    push.assert_called_once_with('sha');wait.assert_not_called();live.assert_not_called()
                self.assertNotIn(['npm','run','build'],calls)
                self.assertTrue(Path('.local/publish-receipts/sha.json').exists())
            finally:os.chdir(old)

    def test_command_timeout_is_bounded(self):
        code,_,error=publish.run([sys.executable,'-c','import time; time.sleep(10)'],timeout=.05)
        self.assertEqual(code,124);self.assertIn('timed out',error)

    def test_retries_identical_commit_with_bounded_backoff(self):
        calls=[];sleeps=[]
        def run(args,timeout):
            calls.append((args,timeout));return (1,'','Empty reply from server') if len(calls)<3 else (0,'ok','')
        publish.push_commit('abc',run,sleeps.append)
        self.assertEqual(len(calls),3);self.assertEqual(sleeps,[10,20])
        for args,timeout in calls:
            self.assertEqual(args[-1],'abc:refs/heads/main');self.assertNotIn('--force',args);self.assertEqual(timeout,90)
    def test_rejection_stops_without_retry(self):
        calls=[]
        def run(args,timeout):calls.append(args);return 1,'','rejected (fetch first)'
        with self.assertRaises(publish.StopPublish):publish.push_commit('abc',run,lambda _:None)
        self.assertEqual(len(calls),1)
    def test_network_failure_stops_after_three_attempts(self):
        calls=[]
        def run(args,timeout):calls.append(args);return 124,'','timeout'
        with self.assertRaisesRegex(publish.StopPublish,'not confirmed'):publish.push_commit('abc',run,lambda _:None)
        self.assertEqual(len(calls),3)
    def test_deployment_must_match_commit_branch_and_workflow(self):
        good={'id':1,'head_sha':'abc','head_branch':'main','name':'Deploy GitHub Pages'}
        other={**good,'id':2,'head_sha':'other'}
        self.assertEqual(publish.select_run({'workflow_runs':[other,good]},'abc'),good)
        self.assertIsNone(publish.select_run({'workflow_runs':[other]},'abc'))

if __name__=='__main__':unittest.main()
