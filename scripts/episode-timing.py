#!/usr/bin/env python3
"""Audit one exact Codex turn. No transcript text, images, secrets or cumulative-counter sums."""
import argparse,json
from collections import Counter
from datetime import datetime

def audit(rows,turn):
    active=False;events=[];usage=Counter();seen=set();pending=set();gaps=[];previous=None
    for row in rows:
        payload=row.get('payload',{});kind=payload.get('type');time=row.get('timestamp')
        if row['type']=='event_msg' and kind=='task_started':active=payload.get('turn_id')==turn
        if row['type']=='token_usage_record' and payload.get('turn_id')==turn:
            identifier=payload.get('response_id')
            if identifier not in seen:seen.add(identifier);usage.update(payload.get('usage',{}))
        if not active or not time:continue
        instant=datetime.fromisoformat(time.replace('Z','+00:00'))
        if previous and (instant-previous).total_seconds()>=60:gaps.append({'from':previous.isoformat(),'to':time,'seconds':(instant-previous).total_seconds(),'classification':'tool pending; inspect its completion' if pending else 'unattributed; no recorded tool activity'})
        previous=instant;events.append(instant)
        if row['type']=='response_item':
            if kind in ('function_call','custom_tool_call'):pending.add(payload.get('call_id'))
            if kind in ('function_call_output','custom_tool_call_output'):pending.discard(payload.get('call_id'))
        if row['type']=='event_msg' and kind=='task_complete':active=False
    return {'turn':turn,'elapsedSeconds':(events[-1]-events[0]).total_seconds() if events else None,'responses':len(seen),'usage':dict(usage),'uncachedInputTokens':usage['input_tokens']-usage['cached_input_tokens'],'gapsOver60Seconds':gaps,'note':'Gaps are observations, not attribution to model/network/authoring. Cached input is included in input_tokens; reasoning tokens are not added again to output. No monetary estimate.'}
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--transcript',required=True);p.add_argument('--turn',required=True);a=p.parse_args()
    with open(a.transcript) as f:print(json.dumps(audit((json.loads(line) for line in f),a.turn),indent=2))
