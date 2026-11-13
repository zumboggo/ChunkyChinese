import fs from 'node:fs';import crypto from 'node:crypto';
const root=new URL('../',import.meta.url),pbw=fs.readFileSync(new URL('reader/build/reader.pbw',root));
const hash=p=>crypto.createHash('sha256').update(fs.readFileSync(new URL(p,root))).digest('hex');
const report={schema:1,pbwSha256:crypto.createHash('sha256').update(pbw).digest('hex'),pbwBytes:pbw.length,librarySha256:hash('scenes/library.json'),episodeSha256:hash('content/supportive-11.json'),physicalWatchTested:false};
fs.mkdirSync(new URL('.local/',root),{recursive:true});fs.writeFileSync(new URL('.local/build-report.json',root),JSON.stringify(report,null,2)+'\n');console.log(report);
