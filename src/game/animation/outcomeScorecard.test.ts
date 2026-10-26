import {describe,it,expect} from 'vitest'
import {evaluateOutcomeScorecard,validateOutcomeScorecard,type OutcomeScorecard} from './outcomeScorecard'
import {compileStory,replayStory} from './shared/engine/story-engine.js'
const script='story 2\nvariable water = 4 range 0 10 visible\nlabel start\nchoice rescue\noption save "Save" -> end ; water -= 4\noption keep "Keep" -> end\nlabel end\nend'
const story=compileStory(script).story!
const definition:OutcomeScorecard={title:'Outcome',note:'Episode only',categories:[{id:'lives',label:'Lives',base:0,description:'Lives'},{id:'fairness',label:'Fairness',base:50,description:'Fairness'},{id:'future',label:'Future',base:80,description:'Future'}],rules:[{when:{all:['save']},points:{lives:100},reason:'Saved someone'}],facts:[{when:{all:['save']},text:'Alive'},{when:{none:['save']},text:'Lost'}],resources:[{variable:'water',label:'Water',unit:'buckets'}]}
describe('outcome scoring',()=>{
 it('uses the geometric mean, named reasons and actual remaining resources',()=>{const r=evaluateOutcomeScorecard(definition,replayStory(story,['save'],1));expect(r.balance).toBe(74);expect(r.facts).toEqual(['Alive']);expect(r.resources[0].value).toBe(0);expect(r.categories[0].reasons).toEqual(['Saved someone'])})
 it('does not hide a zero behind strong other values',()=>expect(evaluateOutcomeScorecard(definition,replayStory(story,['keep'],1)).balance).toBe(0))
 it('recomputes identically after serialization and replay',()=>{const progress=JSON.parse(JSON.stringify({steps:['save'],seed:1}));expect(evaluateOutcomeScorecard(definition,replayStory(story,progress.steps,progress.seed))).toEqual(evaluateOutcomeScorecard(definition,replayStory(story,['save'],1)))})
 it('accepts absence for existing episodes and rejects invalid metadata',()=>{expect(validateOutcomeScorecard(undefined,story)).toEqual([]);expect(validateOutcomeScorecard(definition,story)).toEqual([]);for(const bad of [null,{}, {...definition,rules:[{when:{all:['missing']},points:{lives:1},reason:'x'}]}, {...definition,resources:[{variable:'missing',label:'x',unit:'x'}]}, {...definition,categories:[...definition.categories.slice(0,2),definition.categories[0]]}, {...definition,rules:[{when:{},points:{lives:NaN},reason:'x'}]}])expect(validateOutcomeScorecard(bad,story).length).toBeGreaterThan(0)})
})
