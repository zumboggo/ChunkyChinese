// Count visuals along reachable complete paths, not across mutually exclusive branches.
export function presentationCounts(pack){
 const memo=new Map(),visiting=new Set();
 function at(i){
  if(memo.has(i))return memo.get(i);
  if(visiting.has(i)||!pack.nodes[i])throw Error('Invalid presentation graph');
  visiting.add(i);const n=pack.nodes[i];
  const children=n.type==='end'?[]:n.type==='choice'?n.options.map(o=>o.to):[n.type==='goto'?n.to:i+1];
  const paths=children.map(at),result={routes:paths.length?paths.reduce((s,p)=>s+p.routes,0):1};
  for(const [key,type] of [['animations','animation'],['reactions','reaction']]){
   const own=n.type===type?1:0;
   result[key]={min:own+(paths.length?Math.min(...paths.map(p=>p[key].min)):0),max:own+(paths.length?Math.max(...paths.map(p=>p[key].max)):0)};
  }
  visiting.delete(i);memo.set(i,result);return result;
 }
 return at(pack.entry);
}
