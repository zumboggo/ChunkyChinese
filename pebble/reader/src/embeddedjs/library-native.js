import io from './native.js';
export default function lookup(kind,name){
 if(typeof name!=='string'||name.length>90)return 0;
 const key=kind+'|'+name;let hash=5381;
 for(let i=0;i<key.length;i++)hash=((hash*33)^key.charCodeAt(i))&65535;
 for(let i=0;;i++){const result=io.libraryFind(hash,i);if(!result)return 0;if(io.libraryText((result>>>16)-1)===key)return result&65535;}
}
