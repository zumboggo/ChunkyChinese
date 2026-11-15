#!/usr/bin/env python3
"""Pebble CLI with an isolated store; PEBBLE_TEST_EMULATOR_ROOT selects a separate task."""
from pathlib import Path
import os,sys
if os.environ.get('PEBBLE_TEST_FIXTURE_COMPANION') == '1':
 import subprocess
 original_popen=subprocess.Popen
 def fixture_popen(args,*a,**kw):
  if isinstance(args,list) and len(args)>2 and args[1:3]==['-m','pypkjs']:
   args=[args[0],str(Path(__file__).with_name('fixture-companion.py')),*args[3:]]
  return original_popen(args,*a,**kw)
 subprocess.Popen=fixture_popen
import pebble_tool
# Timing-sensitive emulator fixtures must not wait for remote SDK update checks.
if os.environ.get('PEBBLE_TEST_FIXTURE_COMPANION') == '1':
 pebble_tool.check_for_updates=lambda:None
from pebble_tool import run_tool
from pebble_tool.sdk import emulator
from pebble_tool.util.config import config
root=Path(os.environ.get('PEBBLE_TEST_EMULATOR_ROOT',str(Path(__file__).resolve().parents[1]/'.local/isolated-emulator'))).resolve();root.mkdir(parents=True,exist_ok=True)
def persist(platform,version=None):
 p=root/(version or '4.44')/platform;p.mkdir(parents=True,exist_ok=True);return str(p)
emulator.get_sdk_persist_dir=persist
emulator.get_emulator_info_path=lambda:str(root/'emulators.json')
config.skip_save=True
sys.exit(run_tool())
