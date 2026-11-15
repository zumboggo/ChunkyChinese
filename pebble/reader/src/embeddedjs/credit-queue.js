// Keep completion credits on disk; only one event is decoded at a time.
export class CreditQueue {
 constructor(io){this.io=io;}
 number(key){return Number(this.io.get(key)||0);}
 peek(){const n=this.number('credit-head');return n<this.number('credit-tail')?JSON.parse(this.io.read('credit-'+n)):null;}
 enqueue(event){
  const n=this.number('credit-tail');
  if(n>this.number('credit-head')&&JSON.parse(this.io.read('credit-'+(n-1))).id===event.id)return;
  this.io.write('credit-'+n,JSON.stringify(event));this.io.set('credit-tail',String(n+1));
 }
 acknowledge(id){const first=this.peek();if(!first||first.id!==id)return;const n=this.number('credit-head');this.io.set('credit-head',String(n+1));this.io.remove('credit-'+n);}
 migrate(){
  const raw=this.io.get('episodeCredits');if(!raw)return;
  let offset=this.number('credit-migration');
  for(;;){const start=raw.indexOf('{',offset);if(start<0)break;const end=raw.indexOf('}',start);if(end<0)throw Error('Invalid saved credit');
   const event=JSON.parse(raw.slice(start,end+1));this.enqueue(event);offset=end+1;this.io.set('credit-migration',String(offset));
  }
  this.io.set('episodeCredits','');this.io.set('credit-migration','0');
 }
}
