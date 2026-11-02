import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const acorn = require(process.env.R15_ACORN_MODULE || path.join(process.env.HOME, 'liubai-watch-sign-private/signer/node_modules/acorn'));

// Small ES5 implementations for ONLY the literal expressions present in r14.
// String-domain behavior is tested against the unchanged original expressions.
const definitions = {
  space: "function __r15_space(c){return c>=9&&c<=13||c===32||c===160||c===5760||c>=8192&&c<=8202||c===8232||c===8233||c===8239||c===8287||c===12288||c===65279;}",
  string: "function __r15_string(s){if(typeof s==='string')return s;if(Object.prototype.toString.call(s)==='[object String]')return String(s);throw new TypeError('String receiver required');}",
  key: "function __r15_key(v){var s=String(v),i,c;if(s.length<1||s.length>40)return false;for(i=0;i<s.length;i++){c=s.charCodeAt(i);if(!(c>=65&&c<=90||c>=97&&c<=122||c>=48&&c<=57||c===95||c===45))return false;}return true;}",
  corrupt: "function __r15_corrupt(v){return String(v).indexOf('Corrupt')>=0;}",
  nonspace: "function __r15_nonspace(v){var s=String(v),i;for(i=0;i<s.length;i++)if(!__r15_space(s.charCodeAt(i)))return true;return false;}",
  filter: "function __r15_filter(v){var s=String(v);return s==='all'||s==='pinned'||s==='trash'||s==='day'||s==='month';}",
  date: "function __r15_date(v,n){var s=String(v),i,c;if(s.length!==n)return false;for(i=0;i<n;i++){c=s.charCodeAt(i);if(i===4||i===7){if(c!==45)return false;}else if(c<48||c>57)return false;}return true;}",
  trim: "function __r15_trim(s){s=__r15_string(s);var a=0,b=s.length;while(a<b&&__r15_space(s.charCodeAt(a)))a++;while(b>a&&__r15_space(s.charCodeAt(b-1)))b--;return s.slice(a,b);}",
  collapse: "function __r15_collapse(s){s=__r15_string(s);var r='',i,w=false,c;for(i=0;i<s.length;i++){c=s.charAt(i);if(__r15_space(s.charCodeAt(i))){if(!w)r+=' ';w=true;}else{r+=c;w=false;}}return r;}"
};
const dependencies = {nonspace:['space'], trim:['space','string'], collapse:['space','string']};
function walk(node, fn) {
  if (!node || typeof node !== 'object') return;
  if (node.type) fn(node);
  for (const value of Object.values(node)) {
    if (Array.isArray(value)) value.forEach(child => walk(child, fn));
    else if (value && typeof value === 'object') walk(value, fn);
  }
}

export function transformForLite(text) {
  const tree = acorn.parse(text, {ecmaVersion:5});
  let literalCount = 0;
  walk(tree, node => {if (node.regex) literalCount++;});
  if (!literalCount) return {code:text, replacements:[], edits:[]};
  const used = new Set(), calls = [];
  function use(kind) {
    for (const dependency of dependencies[kind] || []) use(dependency);
    used.add(kind);
    return '__r15_' + kind;
  }
  walk(tree, node => {
    if (node.type !== 'CallExpression' || node.callee.type !== 'MemberExpression' || node.callee.computed) return;
    const callee = node.callee;
    let kind, arg, extra = '', literal;
    if (callee.property.name === 'test' && callee.object.regex && node.arguments.length === 1) {
      literal = callee.object;
      arg = node.arguments[0];
      if (literal.regex.flags) throw new Error('R15_UNSUPPORTED_REGEXP_FLAGS');
      const pattern = literal.regex.pattern;
      if (pattern === '^[A-Za-z0-9_-]{1,40}$') kind = 'key';
      else if (pattern === 'Corrupt') kind = 'corrupt';
      else if (pattern === '\\S') kind = 'nonspace';
      else if (pattern === '^(all|pinned|trash|day|month)$') kind = 'filter';
      else if (pattern === '^\\d{4}-\\d{2}$') {kind = 'date';extra = ',7';}
      else if (pattern === '^\\d{4}-\\d{2}-\\d{2}$') {kind = 'date';extra = ',10';}
    } else if (callee.property.name === 'replace' && node.arguments.length === 2 && node.arguments[0].regex) {
      literal = node.arguments[0];
      arg = callee.object;
      if (literal.regex.flags === 'g' && literal.regex.pattern === '^\\s+|\\s+$' && node.arguments[1].value === '') kind = 'trim';
      else if (literal.regex.flags === 'g' && literal.regex.pattern === '\\s+' && node.arguments[1].value === ' ') kind = 'collapse';
    }
    if (literal) {
      if (!kind) throw new Error('R15_UNSUPPORTED_REGEXP_EXPRESSION');
      calls.push({node, arg, fn:use(kind), extra, literal});
    }
  });
  if (calls.length !== literalCount) throw new Error('R15_REGEXP_NOT_IN_SUPPORTED_CALL');
  // Reject name collisions before injecting helpers into the existing IIFE.
  walk(tree, node => {
    if (node.type === 'Identifier' && node.name.startsWith('__r15_')) throw new Error('R15_HELPER_NAME_COLLISION');
  });
  const root = tree.body[0];
  if (tree.body.length !== 1 || root.type !== 'ExpressionStatement' || root.expression.type !== 'CallExpression' || root.expression.callee.type !== 'FunctionExpression') {
    throw new Error('R15_EXPECTED_SINGLE_COMPILER_IIFE');
  }
  function outermost(start, end, skip) {
    const contained = calls.filter(call => call !== skip && call.node.start >= start && call.node.end <= end);
    return contained.filter(call => !contained.some(parent => parent !== call && parent.node.start <= call.node.start && parent.node.end >= call.node.end)).sort((a,b) => a.node.start-b.node.start);
  }
  function rewritten(call) {
    return call.fn + '(' + range(call.arg.start, call.arg.end, call) + call.extra + ')';
  }
  function range(start, end, skip) {
    let cursor = start, output = '';
    for (const call of outermost(start,end,skip)) {
      output += text.slice(cursor,call.node.start) + rewritten(call);
      cursor = call.node.end;
    }
    return output + text.slice(cursor,end);
  }
  const edits = outermost(0,text.length).map(call => ({start:call.node.start,end:call.node.end,text:rewritten(call),kind:'regexp-call'}));
  const position = root.expression.callee.body.start + 1;
  edits.push({start:position,end:position,text:'\n' + [...used].map(kind=>definitions[kind]).join('\n') + '\n',kind:'scoped-helpers'});
  edits.sort((a,b) => a.start-b.start);
  let output = '', cursor = 0;
  for (const edit of edits) {
    if (edit.start < cursor) throw new Error('R15_OVERLAPPING_EDITS');
    output += text.slice(cursor,edit.start) + edit.text;
    cursor = edit.end;
  }
  output += text.slice(cursor);
  let remaining = 0;
  walk(acorn.parse(output,{ecmaVersion:5}), node=>{if(node.regex)remaining++;});
  if (remaining) throw new Error('R15_REGEXP_REMAINS');
  return {code:output,edits,replacements:calls.map(call=>({start:call.node.start,end:call.node.end,pattern:call.literal.regex.pattern,flags:call.literal.regex.flags,before:text.slice(call.node.start,call.node.end),after:rewritten(call)}))};
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const here = path.dirname(fileURLToPath(import.meta.url));
  const dest = path.join(here,'variants');
  fs.mkdirSync(dest,{recursive:true});
  const report = [];
  for (const name of ['liubai-boot.js','liubai-index.js']) {
    const text = fs.readFileSync(path.join(here,'original',name),'utf8');
    const result = transformForLite(text);
    fs.writeFileSync(path.join(dest,name),result.code);
    report.push({file:name,originalBytes:Buffer.byteLength(text),outputBytes:Buffer.byteLength(result.code),replacements:result.replacements,edits:result.edits});
  }
  fs.writeFileSync(path.join(here,'regexp-transformation.json'),JSON.stringify({scope:'Isolated r14 regex-call translation only; not an installation fix',files:report},null,2)+'\n');
  console.log(JSON.stringify(report.map(r=>({file:r.file,originalBytes:r.originalBytes,outputBytes:r.outputBytes,replacements:r.replacements.length}))));
}
