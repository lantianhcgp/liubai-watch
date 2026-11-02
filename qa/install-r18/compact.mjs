import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {minify} from '../install-r17/minifier/node_modules/terser/main.js';
// Build only: no unsafe assumptions, no property names changed, no dead API stubs.
const input=process.argv[2],out=process.argv[3];if(!input||!out)throw Error('compact.mjs input out');
const files=['app.js',...['boot','index','read','edit','menu','history','day','trash'].map(p=>`pages/${p}/${p}.js`)];
const sha=s=>crypto.createHash('sha256').update(s).digest('hex'),rows=[];
for(const file of files){
 const src=fs.readFileSync(path.join(input,file),'utf8'),oldMap=JSON.parse(fs.readFileSync(path.join(input,file+'.map'),'utf8'));
 const dest=path.join(out,file);fs.mkdirSync(path.dirname(dest),{recursive:true});
 const opts={ecma:5,module:false,toplevel:false,keep_fnames:true,keep_classnames:true,
  compress:{defaults:true,unsafe:false,passes:1,keep_fargs:true,keep_fnames:true,drop_console:false,drop_debugger:false},
  mangle:{properties:false,keep_fnames:true},format:{ecma:5,ascii_only:true,comments:false,semicolons:true},
  sourceMap:{content:oldMap,filename:path.basename(file),url:path.basename(file)+'.map',includeSources:true}};
 const r=await minify({[file]:src},opts);if(!r.code||!r.map)throw Error('Missing output '+file);
 fs.writeFileSync(dest,r.code+'\n');fs.writeFileSync(dest+'.map',r.map+'\n');
 rows.push({entry:file,sourceBytes:Buffer.byteLength(src),sourceSha256:sha(src),bytes:Buffer.byteLength(r.code+'\n'),sha256:sha(r.code+'\n')});
}
fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({tool:'terser@5.44.1 (build only)',unsafe:false,propertyMangling:false,pagesSelected:false,rows},null,2)+'\n');
console.log(JSON.stringify({complete:true,rows}));
