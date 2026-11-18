import test from 'node:test'
import assert from 'node:assert/strict'
import {watchCompletion} from './completion.ts'
test('watch events use the existing Garden format and account-scoped idempotency key',()=>{
 const now=Date.now(),e={id:'pebble-test-ab12',episode:'supportive-12',at:now}
 const a=watchCompletion(e,'owner-a',now),b=watchCompletion(e,'owner-b',now)
 assert.equal(a.event_id,b.event_id);assert.notEqual(a.user_id,b.user_id)
 assert.equal(a.event_data.source,'game');assert.equal(a.event_data.type,'complete')
 assert.equal(a.event_data.sessionId,e.id);assert.equal(a.timestamp,new Date(now).toISOString())
})
test('invalid IDs, timestamps and malformed completions cannot become review events',()=>{
 const now=Date.now(),e={id:'pebble-test-ab12',episode:'supportive-12',at:now}
 for(const bad of [{...e,at:now+400000},{...e,id:'../../x'},{...e,episode:'../x'},null,{...e,at:'today'},{...e,at:0}])assert.throws(()=>watchCompletion(bad,'owner-a',now))
})
