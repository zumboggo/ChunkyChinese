export function failedTargets(report){
 const targets=[];
 const visit=s=>{for(const spec of s.specs??[])for(const test of spec.tests??[]){const last=test.results?.at(-1);if(last&&last.status!=='passed'&&last.status!=='skipped')targets.push({title:spec.title,project:test.projectName});}for(const child of s.suites??[])visit(child)};
 for(const suite of report.suites??[])visit(suite);
 if(!targets.length)throw Error('No failed tests found; inspect the report before retrying.');
 if(targets.some(t=>!t.title||!['desktop','phone'].includes(t.project)))throw Error('Unexpected episode test report.');
 return targets;
}
