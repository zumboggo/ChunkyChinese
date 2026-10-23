import {categoryOf,episodeNumber} from './EpisodeLibrary'
import type {Release} from './animation/storage'
// Questions and premises only: avoid revealing the next episode's resolution.
const teasers:Record<number,string>={
 2:'A phone call interrupts the evening. What could be so urgent?',
 3:'What does it take to keep a family safe?',
 4:'When starting over feels impossible, where do you begin?',
 5:'Before entering a new world, there is work to do in this one.',
 6:'A new world is waiting on the other side of the capsule.',
 7:'The city feels real. So do the eyes watching him.',
 8:'One more swing. How long until something changes?',
 9:'Keep training, or take a break? Even determination needs fuel.',
 10:'Everyone has an opinion about the way he trains.',
 11:'How much progress is enough?',
 12:'At lunchtime, a familiar smell changes the mood.',
 13:'A simple question. How honest should the answer be?',
 14:'Can something as fleeting as moonlight be carved?',
 15:'An unusual request comes with something unexpected.',
 16:'A shop door opens. Will the conversation go as planned?',
 17:'One detail in the shop catches his eye.',
 18:'Behind the statues, there may be more than a business.',
 19:'There is still one question he wants to ask.',
 20:'A bard has a story. What will it cost to hear it?',
 21:'A promise made long ago is still waiting for an answer.',
 22:'Another witness remembers that day differently.',
 23:'A sword, moonlight, and a promise. How do they fit together?',
 24:'A new path appears. Is it the one he wants?'
}
export function episodePreview(release:Release){
 const number=episodeNumber(release)
 return {number:number||undefined,title:release.pack.title,teaser:categoryOf(release)==='lms'&&teasers[number]||'A new scene is waiting. Pick up the story when you’re ready.'}
}
