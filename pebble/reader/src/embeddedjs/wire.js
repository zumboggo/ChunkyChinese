// Index an ASCII NDJSON file without ever allocating the full episode in RAM.
export function openWire(size,read,expected,persistentRead=read){
 if(size<1||size>500000)throw Error('Invalid package size');
 const offsets=[0];let a=1,b=0;
 for(let offset=0;offset<size;offset+=512){const chunk=read(offset,Math.min(512,size-offset));for(let i=0;i<chunk.length;i++){const c=chunk.charCodeAt(i);a=(a+c)%65521;b=(b+a)%65521;if(c===10)offsets.push(offset+i+1);else if(c<32||c>126)throw Error('Invalid wire encoding');}}
 if(expected&&(size!==expected.total||(b*65536+a).toString(16)!==expected.hash))throw Error('Checksum '+size+'/'+expected.total+' '+(b*65536+a).toString(16)+'/'+expected.hash);
 if(offsets[offsets.length-1]!==size)throw Error('Incomplete package');
 for(let i=1;i<offsets.length;i++)if(offsets[i]-offsets[i-1]>12000)throw Error('Node too large');
 const meta=JSON.parse(read(0,offsets[1]-1));
 if(meta.nodeCount!==offsets.length-2||meta.nodeCount>2000||meta.nodeCount<1)throw Error('Invalid node count');
 if(expected&&meta.version!==expected.version)throw Error('Version mismatch');
 let cachedIndex=-1,cached;
 meta.nodeAt=function(index){if(index<0||index>=meta.nodeCount)return undefined;if(index!==cachedIndex){cached=JSON.parse(persistentRead(offsets[index+1],offsets[index+2]-offsets[index+1]-1));cachedIndex=index;}return cached;};
 return meta;
}
