"""Read-only vocabulary audit. Inputs and outputs contain personal study data.

Usage: python audit-listening-vocabulary.py official.pdf known-words.json output.json
Requires pdfplumber. Never writes to the app's database or changes study progress.
Matches are candidates, not verified translations or proof of listening mastery.
"""
import collections
import json
import re
import sys
from pathlib import Path

import pdfplumber


def normalize(text):
    text = re.sub(r"\([^)]*\)", "", text.lower())
    text = re.sub(r"^(to |a |an |the )", "", text.strip())
    return re.sub(r"\s+", " ", text).strip()


def extract_entries(path):
    entries = []
    with pdfplumber.open(path) as pdf:
        if len(pdf.pages) != 4:
            raise ValueError('Expected the four-page 2014 alphabetical source list')
        for page_index, page in enumerate(pdf.pages):
            starts = ([70.8, 193.2, 314.6, 440.6] if page_index < 2 else
                      [70.8, 193.2, 303.1, 427.2] if page_index == 2 else
                      [70.8, 187.0, 303.1, 413.8])
            rows = collections.defaultdict(list)
            for word in page.extract_words():
                if word['top'] < (130 if page_index == 0 else 65) or word['top'] > 795:
                    continue
                col = max((i for i, x in enumerate(starts) if word['x0'] >= x - 1), default=0)
                rows[(col, round(word['top']))].append(word['text'])
            for (col, _), words in sorted(rows.items()):
                entry = ' '.join(words).strip()
                if entry.isdigit():
                    continue
                entries.append({'sourceEntry': entry, 'sourcePage': page_index + 1, 'sourceColumn': col + 1})
    if not entries or entries[0]['sourceEntry'] != 'actor' or entries[-1]['sourceEntry'] != 'zero':
        raise ValueError('Source extraction failed; inspect PDF layout before proceeding')
    return entries


def evidence(word):
    practiced = int(word.get('repetitions') or 0) > 0 or bool(word.get('last_reviewed'))
    if (practiced and float(word.get('interval_days') or 0) >= 14) or int(word.get('reading_exposures') or 0) >= 6:
        return 'strong-or-mastered'
    if word.get('status') == 'known':
        return 'legacy-known-needs-listening-check'
    if practiced or int(word.get('reading_exposures') or 0) > 0:
        return 'learning'
    return 'unpracticed'


def main():
    source, snapshot, output = map(Path, sys.argv[1:])
    words = json.loads(snapshot.read_text())
    active = [w for w in words if re.search(r'[\u3400-\u9fff]', w['word']) and not w.get('archived_at')]
    lookup = collections.defaultdict(list)
    for word in active:
        for meaning in re.split(r'[;/]', word['meaning'] or ''):
            key = normalize(meaning)
            if key:
                lookup[key].append({'word': word['word'], 'meaning': word['meaning'], 'evidence': evidence(word)})
    entries = extract_entries(source)
    for entry in entries:
        candidates = []
        for key in normalize(entry['sourceEntry']).split('/'):
            for match in lookup.get(key.strip(), []):
                if match not in candidates:
                    candidates.append(match)
        entry['candidates'] = candidates
        entry['mappingStatus'] = 'candidate-needs-sense-review' if candidates else 'unmapped'
    report = {
        'sourceUrl': 'https://www.fluent-forever.com/wp-content/uploads/2014/05/625-List-Alphabetical.pdf',
        'sourceLabel': 'Fluent Forever 625 (2014 alphabetical PDF)',
        'sourceEntryCount': len(entries),
        'note': 'Printed entries include grouped concepts (e.g. twenty-one etc.). Entry count is not a verified count of 625 distinct concepts. Gloss matching is provisional. No listening mastery inferred.',
        'activeChineseWords': len(active),
        'evidenceCounts': dict(collections.Counter(evidence(w) for w in active)),
        'entriesWithCandidate': sum(bool(e['candidates']) for e in entries),
        'entriesWithoutCandidate': sum(not e['candidates'] for e in entries),
        'entries': entries,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps({k: v for k, v in report.items() if k != 'entries'}, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
