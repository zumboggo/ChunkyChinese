import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory,initialStoryState,settleStory,advanceStory,replayStory} from './shared/engine/story-engine.js'
const characters=JSON.parse(readFileSync('public/stories/animated/cast/wind.json','utf8'))
it('keeps five seated characters through dialogue, gaze and saved replay',()=>{
 const ids=['Kvothe','Simmon','Wilem','Manet','Sovoy'],positions=['far-left','left','center','right','far-right']
 const script=['story 2',...ids.flatMap((id,i)=>[`show ${id} neutral ${positions[i]}`,`rest ${id} seated`]),'look Simmon Kvothe','Kvothe [happy]: Hello.','camera listener Simmon cut','Simmon [happy]: Welcome.','end'].join('\n')
 const {story,errors}=compileStory(script,{characters,backgrounds:{}});expect(errors).toEqual([])
 const first=settleStory(story,initialStoryState(story,1)),next=advanceStory(story,first,null)
 for(const state of [first,next,replayStory(story,[null],1)]){expect(Object.keys(state.stage.actors)).toHaveLength(5);for(const id of ids)expect(state.stage.actors[id].rest).toBe('seated')}
})
it('holds lying and reclining until a deliberate return to standing',()=>{
 const {story,errors}=compileStory('story 2\nshow Kvothe neutral center\nrest Kvothe lying\nKvothe: Rest.\nrest Kvothe reclining\nKvothe: Awake.\nrest Kvothe relaxed\nKvothe: Up.\nend',{characters,backgrounds:{}})
 expect(errors).toEqual([]);let state=settleStory(story,initialStoryState(story,3));expect(state.stage.actors.Kvothe.rest).toBe('lying');state=advanceStory(story,state,null);expect(state.stage.actors.Kvothe.rest).toBe('reclining');state=advanceStory(story,state,null);expect(state.stage.actors.Kvothe.rest).toBe('relaxed')
})
