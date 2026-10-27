from unittest.mock import patch
import importlib.util,tempfile,os,json,unittest,threading,time
from pathlib import Path
spec=importlib.util.spec_from_file_location('publish',Path(__file__).parents[1]/'publish-episode.py');p=importlib.util.module_from_spec(spec);spec.loader.exec_module(p)
class IncrementalTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.old=os.getcwd();os.chdir(self.tmp.name)
  self.addCleanup(self.cleanup)
  Path('public/stories/animated').mkdir(parents=True);Path('.local/publish-receipts').mkdir(parents=True)
  self.catalog=[{'id':'old','path':'old.json'},{'id':'new','path':'new.json','intro':{'src':'new.mp4','poster':'new.jpg'}}]
  Path('public/stories/animated/catalog.json').write_text(json.dumps(self.catalog))
  for name in ['service-worker.js','stories/animated/old.json','stories/animated/new.json','new.mp4','new.jpg','extra.m4a']:Path('public',name).write_bytes(name.encode())
  self.plan={'sha':'new','base':'old','paths':['public/stories/animated/catalog.json','public/extra.m4a'],'mode':'release'}
 def cleanup(self):os.chdir(self.old);self.tmp.cleanup()
 def baseline(self):Path('.local/publish-receipts/live-old.json').write_text(json.dumps({'sha':'old','verified':True}))
 def test_unknown_baseline_falls_back_to_full(self):
  targets,mode=p.verification_targets(self.plan);self.assertEqual(mode,'full');self.assertIn('stories/animated/old.json',targets)
 def test_changed_catalog_references_and_standalone_audio_are_included(self):
  self.baseline()
  with patch.object(p,'require',return_value=json.dumps(self.catalog[:1])):targets,mode=p.verification_targets(self.plan)
  self.assertEqual(mode,'incremental');self.assertNotIn('stories/animated/old.json',targets)
  for key in ['stories/animated/new.json','new.mp4','new.jpg','extra.m4a','service-worker.js']:self.assertIn(key,targets)
  targets,mode=p.verification_targets(self.plan,full=True);self.assertEqual(mode,'full');self.assertIn('stories/animated/old.json',targets)
 def test_matching_build_only(self):
  Path('dist/assets').mkdir(parents=True);Path('dist/index.html').write_text('<script src="/ChunkyChinese/assets/app.js"></script>');Path('dist/assets/app.js').write_text('ok');Path('dist/release.json').write_text('{"commit":"new"}')
  self.assertIn('assets/app.js',p.verification_targets(sha='new')[0]);self.assertNotIn('index.html',p.verification_targets(sha='other')[0])
 def test_downloads_are_bounded_parallel_and_receipt_requires_every_hash(self):
  lock=threading.Lock();active=0;peak=0
  def fetch(url):
   nonlocal active,peak
   with lock:active+=1;peak=max(peak,active)
   time.sleep(.01)
   result=Path('public',url.removeprefix(p.SITE).split('?')[0]).read_bytes()
   with lock:active-=1
   return result
  with patch.object(p,'fetch',side_effect=fetch):p.verify_live('new')
  self.assertGreater(peak,1);self.assertLessEqual(peak,4);self.assertTrue(Path('.local/publish-receipts/live-new.json').exists())
  with patch.object(p,'fetch',return_value=b'wrong'),patch.object(p.time,'sleep'):
   with self.assertRaises(p.StopPublish):p.verify_live('failed')
  self.assertFalse(Path('.local/publish-receipts/live-failed.json').exists())
 def test_retry_preserves_original_diff(self):
  Path('.local/publish-receipts/new.json').write_text(json.dumps(self.plan))
  with patch.object(p,'require',return_value='new refs/heads/main'):self.assertEqual(p.publication_plan('new'),self.plan)
if __name__=='__main__':unittest.main()
