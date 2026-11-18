"""One explicit paid request or read-only poll. No paid retries. Prices verified 2026-11-14.
Use only after rechecking provider prices on a later date. Token never persisted.
"""
import argparse,base64,hashlib,json,os,urllib.request
from datetime import date
from pathlib import Path
ROOT=Path(__file__).resolve().parent
OUT=ROOT/'characters/alden/originals'
def api(path, data=None):
    token=os.environ.get('REPLICATE_API_TOKEN') or Path.home().joinpath('.claude/replicate-token').read_text().strip()
    req=urllib.request.Request('https://api.replicate.com/v1/'+path,data=json.dumps(data).encode() if data else None,
        headers={'Authorization':'Bearer '+token,'User-Agent':'ChunkyChinese/1.0','Accept':'application/json','Content-Type':'application/json'})
    with urllib.request.urlopen(req,timeout=35) as response:return json.load(response)
def main():
    parser=argparse.ArgumentParser();parser.add_argument('action',choices=['submit','poll']);parser.add_argument('name');parser.add_argument('--plan');a=parser.parse_args()
    if not a.name.replace('-','').isalnum():raise ValueError('Invalid job name')
    OUT.mkdir(parents=True,exist_ok=True);file=OUT/(a.name+'.json');ledger_file=OUT/'ledger.json'
    if a.action=='submit':
        if date.today()!=date(2026,11,14):raise ValueError('Reverify pricing before submitting on another day')
        if file.exists():raise ValueError('Job already exists; poll it instead')
        plan=json.loads(Path(a.plan).read_text());model=plan['model'];inputs=plan['input']
        if inputs.get('width')!=32 or inputs.get('height')!=32:raise ValueError('Only priced 32x32 requests supported')
        if model=='rd-plus' and inputs.get('style')=='classic' and inputs.get('num_images')==1:cost=25
        elif model=='rd-animation' and inputs.get('style')=='small_sprites':cost=70
        else:raise ValueError('Unpriced settings')
        ledger=json.loads(ledger_file.read_text()) if ledger_file.exists() else []
        if any(e['name']==a.name for e in ledger):raise ValueError('Reserved request exists; do not resubmit automatically')
        if sum(e['reservedMilliUsd'] for e in ledger)+cost>1000:raise ValueError('$1 total cap reached')
        provenance=json.loads(json.dumps(plan))
        provenance['files']={k:{'filename':Path(v).name,'sha256':hashlib.sha256(Path(v).read_bytes()).hexdigest()} for k,v in plan.get('files',{}).items()}
        (OUT/(a.name+'-request.json')).write_text(json.dumps(provenance,indent=2)+'\n')
        for field,reference in plan.get('files',{}).items():
            raw=Path(reference).read_bytes();inputs[field]='data:image/png;base64,'+base64.b64encode(raw).decode()
        ledger.append({'name':a.name,'model':model,'reservedMilliUsd':cost,'status':'reserved'})
        ledger_file.write_text(json.dumps(ledger,indent=2)+'\n')
        result=api('models/retro-diffusion/'+model+'/predictions',{'input':inputs})
    else:
        result=api('predictions/'+json.loads(file.read_text())['id'])
    # Input data URLs are already retained as local files; avoid bulky duplicate images.
    result.pop('input',None);file.write_text(json.dumps(result,indent=2)+'\n')
    if ledger_file.exists():
        ledger=json.loads(ledger_file.read_text())
        for entry in ledger:
            if entry['name']==a.name:entry.update(status=result['status'],predictionId=result['id'])
        ledger_file.write_text(json.dumps(ledger,indent=2)+'\n')
    print(a.name,result['status'],'id='+result['id'])
    if result['status']=='succeeded':
        outputs=result['output'];outputs=[outputs] if isinstance(outputs,str) else outputs
        for i,url in enumerate(outputs):
            dest=OUT/(a.name+'-'+str(i)+'.png')
            if not dest.exists():
                with urllib.request.urlopen(url,timeout=35) as response:dest.write_bytes(response.read())
            print('Saved',dest.name,hashlib.sha256(dest.read_bytes()).hexdigest())
    elif result['status']=='failed':print('Generation failed; inspect saved metadata, do not auto-retry.')
if __name__=='__main__':main()
