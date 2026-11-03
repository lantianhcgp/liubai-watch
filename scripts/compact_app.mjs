import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import JSZip from '../tools/sign/node_modules/jszip/lib/index.js';
import {minify} from '../tools/sign/node_modules/terser/main.js';
const [input,output]=process.argv.slice(2);if(!input||!output)throw Error('actual.app output.app');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const raw=fs.readFileSync(input),app=await JSZip.loadAsync(raw);const entries=Object.values(app.files).filter(f=>!f.dir&&f.name.endsWith('.hap'));if(entries.length!==1)throw Error('One genuine Lite HAP needed');
const hap=await JSZip.loadAsync(await entries[0].async('nodebuffer'));const proof=[];
for(const file of Object.values(hap.files)){
 if(file.dir||!file.name.endsWith('.js'))continue;
 const oldMapFile=hap.file(file.name+'.map');const oldMap=oldMapFile?JSON.parse(await oldMapFile.async('string')):null;
 const source=await file.async('string');const transformed=await minify({[file.name]:source},{keep_fnames:true,keep_classnames:true,compress:{defaults:true,expression:true,negate_iife:false,unsafe:false,passes:1,keep_fargs:true,keep_fnames:true,drop_console:false},mangle:{toplevel:false,properties:false,keep_fnames:true},ecma:5,format:{ascii_only:true,comments:false},sourceMap:{content:oldMap||undefined,filename:path.basename(file.name),url:path.basename(file.name)+'.map',includeSources:true}});
 if(!transformed.code||!transformed.map)throw Error('Missing minified compiler file '+file.name);
 const result=transformed.code;hap.file(file.name,result);hap.file(file.name+'.map',transformed.map);
 proof.push({file:file.name,before:Buffer.byteLength(source),after:Buffer.byteLength(result),beforeSha256:sha(source),afterSha256:sha(result)});
}
app.file(entries[0].name,await hap.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));const result=await app.generateAsync({type:'nodebuffer',compression:'DEFLATE'});fs.mkdirSync(path.dirname(output),{recursive:true});fs.writeFileSync(output,result);fs.writeFileSync(output+'.compaction.json',JSON.stringify({scope:'safe build-host compiler minification; no template replacement, page selection or property mangling',sourceAppSha256:sha(raw),appSha256:sha(result),files:proof},null,2)+'\n');console.log(JSON.stringify({sourceAppSha256:sha(raw),appSha256:sha(result),files:proof.map(({file,before,after})=>({file,before,after}))}));
