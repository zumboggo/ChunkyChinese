import hashlib, importlib.util, sys, tempfile, unittest, zipfile
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
