import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {minify} from './minifier/node_modules/terser/main.js';

// Build-side transform only. All strings, properties and public functions stay.
// No unsafe transforms, pure-func claims, mangle.properties, modern syntax,
// source-loader/Eval seam or replacement of the product JS by test output.
const input=process.argv[2],out=process.argv[3];
if(!input||!out)throw Error('Usage: compact.mjs fixtures output');
const modes={
 'format':{compress:false,mangle:false},
 'locals':{compress:false,mangle:{properties:false,keep_fnames:true}},
 'compress':{compress:{defaults:true,unsafe:false,passes:1,keep_fargs:true,keep_fnames:true,drop_console:false,drop_debugger:false},mangle:{properties:false,keep_fnames:true}}
};
const sha=s=>crypto.createHash('sha256').update(s).digest('hex');
const report={tool:'terser@5.44.1 (build only)',modes:{}};
for(const [mode,opts] of Object.entries(modes)){
 const dir=path.join(out,mode);fs.mkdirSync(dir,{recursive:true});const rows=[];
 for(const part of ['app','boot','index']){
  const name='r16-'+part+'.js',source=fs.readFileSync(path.join(input,name),'utf8');
  const options={ecma:5,module:false,toplevel:false,keep_fnames:true,keep_classnames:true,...opts,
   format:{ecma:5,ascii_only:true,comments:false,semicolons:true}};
  const result=await minify({[name]:source},options);if(!result.code)throw Error('No output '+name);
  fs.writeFileSync(path.join(dir,name),result.code+'\n');
  rows.push({file:name,sourceBytes:Buffer.byteLength(source),sourceSha256:sha(source),outputBytes:Buffer.byteLength(result.code+'\n'),outputSha256:sha(result.code+'\n')});
 }
 report.modes[mode]={options:opts,files:rows};
}
fs.writeFileSync(path.join(out,'compact-provenance.json'),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report));
