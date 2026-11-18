// Watch credits use the existing per-account review-event key and garden counters.
export function watchCompletion(value: unknown, owner: string, now = Date.now()) {
 const e = value as {id?: unknown; episode?: unknown; at?: unknown} | null
 if (!e || typeof e.id !== 'string' || !/^pebble-[a-z0-9]{1,16}-[a-z0-9]{1,16}$/.test(e.id)
  || typeof e.episode !== 'string' || !/^[a-z0-9]{1,30}-\d{1,5}(?:-v\d{1,5})?$/.test(e.episode)
  || typeof e.at !== 'number' || !Number.isSafeInteger(e.at) || e.at < Date.UTC(2026,0,1) || e.at > now + 300000) throw Error('Invalid watch completion')
 const timestamp = new Date(e.at).toISOString(), id = 'episode-complete:' + e.id
 return {user_id: owner, event_id: id, timestamp, event_data: {
  id, timestamp, type:'complete', source:'game', device:'pebble', itemType:'lesson',
  itemId:e.episode, sessionId:e.id, seconds:0, partialTiming:true,
 }}
}
