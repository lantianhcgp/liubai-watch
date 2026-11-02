import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {transformForLite} from '../install-r15/regexp-control.mjs';
const input=process.argv[2],output=process.argv[3];
if(!input||!output)throw Error('Usage: transform-pages.mjs originals variants');
fs.mkdirSync(output,{recursive:true});const results=[];
for(const file of ['liubai-app.js','liubai-boot.js','liubai-index.js']){
 const source=fs.readFileSync(path.join(input,file),'utf8');const result=transformForLite(source);
 fs.writeFileSync(path.join(output,file),result.code);
 results.push({file,sourceSha256:crypto.createHash('sha256').update(source).digest('hex'),outputSha256:crypto.createHash('sha256').update(result.code).digest('hex'),sourceBytes:Buffer.byteLength(source),outputBytes:Buffer.byteLength(result.code),edits:result.edits,replacements:result.replacements});
}
fs.writeFileSync(path.join(output,'regexp-transformation.json'),JSON.stringify({scope:'Same SDK-proven r15 regex-call translation after r16 source-only startup fix',files:results},null,2)+'\n');
console.log(JSON.stringify(results.map(r=>({file:r.file,replacements:r.replacements.length,bytes:r.outputBytes}))));
