// Index an ASCII NDJSON file without ever allocating the full episode in RAM.
export function openWire(size,read,expected,persistentRead=read,compact=false){
 if(size<1||size>65536)throw Error('Invalid package size');
 const offsets=[0];let a=1,b=0;
 for(let offset=0;offset<size;offset+=512){const chunk=read(offset,Math.min(512,size-offset));for(let i=0;i<chunk.length;i++){const c=chunk.charCodeAt(i);a=(a+c)%65521;b=(b+a)%65521;if(c===10)offsets.push(offset+i+1);else if(c<32||c>126)throw Error('Invalid wire encoding');}}
 if(expected&&(size!==expected.total||(b*65536+a).toString(16)!==expected.hash))throw Error('Checksum '+size+'/'+expected.total+' '+(b*65536+a).toString(16)+'/'+expected.hash);
 if(offsets[offsets.length-1]!==size)throw Error('Incomplete package');
 for(let i=1;i<offsets.length;i++)if(offsets[i]-offsets[i-1]>2048)throw Error('Node too large');
 const meta=JSON.parse(read(0,offsets[1]-1));
 if(meta.nodeCount!==offsets.length-2||meta.nodeCount>160||meta.nodeCount<1)throw Error('Invalid node count');
 if(expected&&meta.version!==expected.version)throw Error('Version mismatch');
 // Attribution is already available in the reader; omit duplicate descriptive metadata on constrained watches.
 if(compact){delete meta.sources;delete meta.notice;delete meta.art;delete meta.cast;}
 let cachedIndex=-1,cached;
 meta.nodeAt=function(index){if(index<0||index>=meta.nodeCount)return undefined;if(index!==cachedIndex){cached=undefined;cached=JSON.parse(persistentRead(offsets[index+1],offsets[index+2]-offsets[index+1]-1));cachedIndex=index;}return cached;};
 return meta;
}
