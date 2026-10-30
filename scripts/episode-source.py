#!/usr/bin/env python3
"""Read one exact, fingerprinted EPUB passage. Never search across Downloads."""
import argparse, hashlib, json, re, zipfile
from html.parser import HTMLParser
from pathlib import Path

class ChapterText(HTMLParser):
    def __init__(self):
        super().__init__(); self.parts=[]; self.skip=0
    def handle_starttag(self, tag, attrs):
        if tag in ('script','style'): self.skip+=1
        if tag in ('p','div','h1','h2','h3','br'): self.parts.append(' ')
    def handle_endtag(self, tag):
        if tag in ('script','style'): self.skip=max(0,self.skip-1)
        if tag in ('p','div','h1','h2','h3'): self.parts.append(' ')
    def handle_data(self, data):
        if not self.skip: self.parts.append(data)

def extract(record, epub=None, limit=16000):
    source=record['source']; path=Path(epub or source['epub']).expanduser()
    if hashlib.sha256(path.read_bytes()).hexdigest()!=source['sha256']:
        raise ValueError('EPUB fingerprint differs. Inspect the supplied book and update the series record deliberately.')
    with zipfile.ZipFile(path) as book:
        parser=ChapterText(); parser.feed(book.read(source['chapter']).decode('utf-8'))
    text=re.sub(r'\s+',' ',''.join(parser.parts)).strip()
    start,end=source['nextStart'],source['nextEndBefore']
    if text.count(start)!=1 or text.count(end)!=1:
        raise ValueError('Source anchors must each occur exactly once. Check the series stopping point.')
    a,b=text.index(start),text.index(end)
    if b<=a: raise ValueError('End anchor must follow start anchor.')
    passage=text[a:b].strip()
    if len(passage)>limit: raise ValueError(f'Passage has {len(passage)} characters. Narrow the anchors or explicitly raise --limit.')
    return passage

def main():
    p=argparse.ArgumentParser(description=__doc__); p.add_argument('--series',required=True); p.add_argument('--epub'); p.add_argument('--record'); p.add_argument('--limit',type=int,default=16000); p.add_argument('--output')
    a=p.parse_args()
    if not re.fullmatch('[a-z0-9-]+',a.series): p.error('Invalid series ID')
    record_path=Path(a.record) if a.record else Path(f'stories/authoring/series/{a.series}.json')
    if a.record and Path('.local').resolve() not in record_path.resolve().parents:p.error('Override source records must remain under .local/.')
    record=json.loads(record_path.read_text())
    if record.get('id')!=a.series:p.error('Source record series mismatch.')
    passage=extract(record,a.epub,a.limit)
    if a.output:
        out=Path(a.output).resolve(); private=Path('.local').resolve()
        if private not in out.parents: p.error('Extracted book text must stay in ignored .local/.')
        out.parent.mkdir(parents=True,exist_ok=True); out.write_text(passage+'\n')
        print(f'Validated {record["source"]["chapter"]}: {len(passage)} characters saved to {out}')
    else: print(passage)
if __name__=='__main__': main()
