/** Author-directed shots bind to stable script labels, never translated text. */
export interface ReadingPresentation {mode:'reading'; layout?:'intertitles'; animationLabels:string[]}
export function animationCursors(story:{labels:Record<string,number>;nodes:{type:string}[]},labels:string[]):Set<number>{
 const cursors=new Set<number>()
 for(const label of labels){
  const start=story.labels[label]
  if(start===undefined)throw Error(`Unknown animation label: ${label}`)
  let index=start+1
  while(index<story.nodes.length&&!['say','act','choice','goto','if','chance','end','label'].includes(story.nodes[index].type))index++
  if(!['say','act'].includes(story.nodes[index]?.type))throw Error(`Animation label ${label} must lead directly to a readable beat`)
  cursors.add(index)
 }
 return cursors
}
