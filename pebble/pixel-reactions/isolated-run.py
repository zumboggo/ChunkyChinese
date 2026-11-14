"""Run an SDK protocol test against this task's isolated emulator, never the shared one."""
from pathlib import Path
import sys,runpy,os
import pebble_tool.sdk.emulator as emulator
from pebble_tool.util.config import config
root=Path(os.environ.get('PEBBLE_TEST_EMULATOR_ROOT',str(Path(__file__).resolve().parent/'.local/emulator')))
def persist(platform,version=None):
 path=root/(version or '4.44')/platform;path.mkdir(parents=True,exist_ok=True);return str(path)
emulator.get_sdk_persist_dir=persist
emulator.get_emulator_info_path=lambda:str(root/'emulators.json')
config.skip_save=True
os.environ['PEBBLE_CLI']=os.environ.get('PEBBLE_TEST_CLI',str(Path(__file__).resolve().parent/'isolated-cli.sh'))
script=sys.argv[1];sys.argv=sys.argv[1:];runpy.run_path(script,run_name='__main__')
