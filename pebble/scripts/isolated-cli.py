#!/usr/bin/env python3
"""Pebble CLI with a separate emulator profile; never touches the usual watch save.
SDK binaries stay shared. Emulator flash, phone storage, ports and logs stay local.
"""
from pathlib import Path
import sys
from pebble_tool import run_tool
import pebble_tool.sdk.emulator as emulator
from pebble_tool.util.config import config
root=Path(__file__).resolve().parents[1]/'.local'/'isolated-emulator'
root.mkdir(parents=True,exist_ok=True)
def persist(platform,version=None):
 path=root/(version or '4.44')/platform;path.mkdir(parents=True,exist_ok=True);return str(path)
emulator.get_sdk_persist_dir=persist
emulator.get_emulator_info_path=lambda:str(root/'emulators.json')
config.skip_save=True
sys.exit(run_tool())
