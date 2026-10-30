import importlib.util,unittest
from pathlib import Path

def load(file):
    spec=importlib.util.spec_from_file_location('test_module',Path(__file__).parents[1]/file);m=importlib.util.module_from_spec(spec);spec.loader.exec_module(m);return m
speech=load('finish-cutscene.py');timing=load('episode-timing.py')
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
