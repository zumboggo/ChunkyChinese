#!/usr/bin/env python3
"""Pebble CLI with an isolated store; PEBBLE_TEST_EMULATOR_ROOT selects a separate task."""
from pathlib import Path
import os,sys
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
