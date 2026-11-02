import importlib.util,unittest,sys,tempfile
from unittest.mock import Mock,patch
from pathlib import Path

def load(file):
    spec=importlib.util.spec_from_file_location('test_module',Path(__file__).parents[1]/file);m=importlib.util.module_from_spec(spec)
    with patch.object(sys,'path',[str(Path(__file__).parents[1]),*sys.path]):spec.loader.exec_module(m)
    return m
speech=load('finish-cutscene.py');timing=load('episode-timing.py')
runtime=load('episode_speech.py')

class SpeechCacheTests(unittest.TestCase):
    def test_discovers_project_then_environment_caches_offline(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);project=root/'.local/speech-cache';project.mkdir(parents=True)
            other=root/'custom';other.mkdir();snapshot=other/'snapshot';snapshot.mkdir()
            for file in ('model.bin','config.json','tokenizer.json'):(snapshot/file).write_text('test')
            lookup=Mock(side_effect=[FileNotFoundError('not cached'),str(snapshot)])
            result=runtime.resolve_speech_model(root=root,environ={'HF_HUB_CACHE':str(other)},home=root,lookup=lookup)
            self.assertEqual(result['cache'],str(other.resolve()));self.assertEqual(result['modelPath'],str(snapshot.resolve()))
            self.assertEqual(lookup.call_count,2)
            for call in lookup.call_args_list:self.assertTrue(call.kwargs['local_files_only'])

    def test_explicit_bad_cache_does_not_silently_fall_back_or_download(self):
        with tempfile.TemporaryDirectory() as folder:
            lookup=Mock()
            with self.assertRaisesRegex(ValueError,'No complete cached'):
                runtime.resolve_speech_model(cache=Path(folder)/'missing',root=folder,lookup=lookup)
            lookup.assert_not_called()

    def test_incomplete_snapshot_is_rejected(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder);(root/'config.json').write_text('{}')
            with self.assertRaisesRegex(ValueError,'No complete cached'):
                runtime.resolve_speech_model(cache=root,lookup=Mock(return_value=str(root)))

    def test_missing_model_stops_before_processing_or_writing_media(self):
        with tempfile.TemporaryDirectory() as folder:
            source=Path(folder)/'native.mp4';source.write_bytes(b'kept')
            output=Path(folder)/'output/final.mp4'
            with patch.object(sys,'argv',['finish','--source',str(source),'--output',str(output),'--dialogue','Hello.']),patch.dict(sys.modules,{'faster_whisper':Mock()}),patch.object(speech,'resolve_speech_model',side_effect=ValueError('No cached model')),patch.object(speech.subprocess,'run') as run:
                with self.assertRaises(SystemExit):speech.main()
                run.assert_not_called()
            self.assertFalse(output.parent.exists());self.assertEqual(source.read_bytes(),b'kept')
class EfficiencyTests(unittest.TestCase):
    def test_speech_numbers_without_ignoring_extra_words(self):
        self.assertEqual(speech.normalize_speech('Ninety seconds?'),speech.normalize_speech('90 seconds.'))
        self.assertEqual(speech.normalize_speech('twenty-one steps'),speech.normalize_speech('21 steps'))
        self.assertNotEqual(speech.normalize_speech('90 seconds second of people'),speech.normalize_speech('Ninety seconds?'))
        self.assertNotEqual(speech.normalize_speech('19 seconds'),speech.normalize_speech('Ninety seconds?'))
    def test_timing_deduplicates_incremental_usage_and_labels_unknown_gaps(self):
        rows=[{'type':'event_msg','timestamp':'2026-01-01T00:00:00Z','payload':{'type':'task_started','turn_id':'one'}},
              {'type':'response_item','timestamp':'2026-01-01T00:02:00Z','payload':{'type':'custom_tool_call','call_id':'call'}},
              {'type':'response_item','timestamp':'2026-01-01T00:04:00Z','payload':{'type':'custom_tool_call_output','call_id':'call'}},
              {'type':'event_msg','timestamp':'2026-01-01T00:04:01Z','payload':{'type':'task_complete'}}]
        usage={'type':'token_usage_record','payload':{'turn_id':'one','response_id':'response','usage':{'input_tokens':100,'cached_input_tokens':90,'output_tokens':10},'thread_token_usage':{'input_tokens':999999}}}
        result=timing.audit(rows+[usage,usage],'one')
        self.assertEqual(result['usage']['input_tokens'],100);self.assertEqual(result['uncachedInputTokens'],10)
        self.assertIn('unattributed',result['gapsOver60Seconds'][0]['classification']);self.assertIn('tool pending',result['gapsOver60Seconds'][1]['classification'])

class BatchContinuationTests(unittest.TestCase):
    def test_merge_preserves_order_and_rejects_changed_package(self):
        import tempfile,json,hashlib
        prepare=load('prepare-continuation.py')
        with tempfile.TemporaryDirectory() as directory:
            paths=[]
            for i in [1,2]:
                package=Path(directory)/f'{i}.json';package.write_text('{}')
                candidate={'recordPath':'same','baseHash':'base','packagePath':str(package),'packageHash':hashlib.sha256(b'{}').hexdigest(),'releaseId':str(i),'nextRecord':{'completed':[{'episode':'old'},{'episode':str(i)}]}}
                path=Path(directory)/f'candidate-{i}.json';path.write_text(json.dumps(candidate));paths.append(path)
            result=prepare.merge_candidates(paths)
            self.assertEqual([x['episode'] for x in result['nextRecord']['completed']],['old','1','2'])
            (Path(directory)/'1.json').write_text('changed')
            with self.assertRaisesRegex(ValueError,'changed'):prepare.merge_candidates(paths)
