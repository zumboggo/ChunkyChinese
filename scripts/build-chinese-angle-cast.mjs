/** Additive cast release. Never rebuild the pre-angle bundles or episode packages. */
import {readFileSync,writeFileSync} from 'node:fs';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'..'),check=process.argv.includes('--check');
for(const [name,actor] of [['lms-lineup','Hyun'],['wind','Kvothe']]){
 const source=`public/stories/animated/cast/${name}.json`,target=`public/stories/animated/cast/${name}-angles-v2.json`;
 const cast=JSON.parse(readFileSync(resolve(root,source),'utf8'));cast[actor].version=2;
 cast[actor].provenance+=' Reusable angle release v2: approved custom front preserved; identity-specific vector three-quarter/profile data in chinese-angle-designs-v2.ts.';
 const output=JSON.stringify(cast,null,2)+'\n';
 if(check){if(readFileSync(resolve(root,target),'utf8')!==output)throw Error('Cast angle drift: '+target)}else writeFileSync(resolve(root,target),output);
}
console.log(`${check?'Verified':'Built'} additive Chinese cast angle bundles v2.`);
