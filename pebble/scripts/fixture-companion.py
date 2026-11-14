"""SDK Python: controlled companion for a dedicated emulator.
Retains the Moddable readiness handshake, but Python tests supply story messages
instead of live catalogue/network requests. Accepts normal pypkjs runner flags.
"""
from pypkjs.runner import Runner
from pypkjs.runner.websocket import run_tool
start = Runner.start_js
proxy = """function ready(){Pebble.sendAppMessage({'15025':1});}
Pebble.addEventListener('ready',ready);
Pebble.addEventListener('appmessage',function(e){if(e.payload[15025]!==undefined)ready();});"""
Runner.start_js = lambda self, pbw: start(self, pbw._replace(src=proxy))
run_tool()
