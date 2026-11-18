// At most five titles in memory; ranges contain ten numbered episodes.
export function validPage(p){
 if(!p||typeof p.kind!=='string'||(p.kind!=='groups'&&!/^\d{1,5}$/.test(p.kind))||!Number.isInteger(p.total)||p.total<0||p.total>2000||!Number.isInteger(p.offset)||p.offset<0||p.offset%5||p.offset>Math.max(0,p.total-1)||!Array.isArray(p.items)||p.items.length!==Math.min(5,p.total-p.offset))throw Error('Invalid catalogue page');
 for(const e of p.items){if(!Array.isArray(e))throw Error('Invalid entry');if(p.kind==='groups'){if(e.length!==2||!Number.isInteger(e[0])||e[0]<1||(e[0]-1)%10||e[1]!==e[0]+9)throw Error('Invalid range');}
 else if(e.length!==4||typeof e[0]!=='string'||e[0].length>48||!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*-\d+(?:-v\d+)?$/.test(e[0])||!Number.isInteger(e[1])||e[1]<Number(p.kind)||e[1]>=Number(p.kind)+10||typeof e[2]!=='string'||e[2].length>80||!/^[ -~]+$/.test(e[2])||!/^\w{12}$/.test(e[3]))throw Error('Invalid episode');}
 return p;
}
export function localPage(pack){return {kind:String(Math.floor((pack.number-1)/10)*10+1),offset:0,total:1,items:[[pack.id,pack.number,pack.title,pack.version]],offline:true};}
export function actions(page){return [...(page.offset>=5?['Previous page']:[]),...(page.offset+page.items.length<page.total?['Next page']:[]),'Choose range','Update list','Back'];}
