"""Verify the PBW's native story resource and app version, not just generated input files."""
import json,sys,zipfile
from pathlib import Path
root=Path(__file__).resolve().parents[1]
pack=json.loads((root/'reader/src/pkjs/bundled.json').read_text())
wire=(root/'reader/resources/data/story.ndjson').read_bytes()
meta=json.loads(wire.splitlines()[0])
if (meta['id'],meta['version'])!=(pack['id'],pack['version']):raise SystemExit('Generated native story differs from selected bundle')
with zipfile.ZipFile(root/'reader/build/reader.pbw') as archive:
 if wire not in archive.read('emery/app_resources.pbpack'):raise SystemExit('PBW does not contain the selected episode resource; rebuild before reporting/packaging')
 version=json.loads(archive.read('appinfo.json'))['versionLabel']
 if version!=json.loads((root/'reader/package.json').read_text())['version']:raise SystemExit('PBW app version differs from package.json; rebuild before packaging')
print(json.dumps({'id':pack['id'],'version':pack['version'],'appVersion':version}))
