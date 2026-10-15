export function vocabularyBrief(words,supplement,terms){
 if(!Array.isArray(words)||words.some(w=>typeof w.word!=='string'||typeof w.known!=='boolean'))throw Error('Use the existing vocabulary export.')
 if(!Array.isArray(terms)||terms.length>80)throw Error('Supply at most 80 candidate terms for this excerpt.')
 const known=new Set(words.filter(w=>w.known).map(w=>w.word)),assumed=new Set(supplement);
 const status=word=>known.has(word)?'reviewed-known':assumed.has(word)?'assumed-familiar':'unfamiliar';
 return terms.map(term=>{
  if(typeof term.word!=='string'||!term.word.trim()||!Array.isArray(term.alternatives??[])||(term.alternatives??[]).some(w=>typeof w!=='string'||!w.trim()))throw Error('Each term needs a word and optional alternative words.')
  return {word:term.word,status:status(term.word),alternatives:(term.alternatives??[]).map(word=>({word,status:status(word)}))}
 });
}
