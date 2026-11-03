/* CrabKeyboard v1.1.5 MIT adapter: original key/shift tables and on-disk V5 trie.
 * Copyright (c) 2026 kqakqakqa / crabKun. Business editor state is separate.
 */
var EN=['qwertyuiop','asdfghjkl','zxcvbnm,'];
var SY=[['`','~','@','#','%','&','*','-','^','+','=','$','\u00d7'],['(',')','[',']','<','>','\\','|','/','_','\u00b1','\u2248'],[';',':','"','\u2018','\u201c','?','!',',','.','\u221e','\u03c0']];
var CN=[['1','2','3','4','5','6','7','8','9','0'],['\u300a','\u300b','~','\u2026','\u2014','\uff08','\uff09','\u2018','\u2019'],['\u201c','\u201d','\uff1b','\uff1a','\uff01','\uff1f','\u3001','\u3002']];
var ES=[['1','2','3','4','5','6','7','8','9','0'],['@','#','$','&','(',')','/','_','-'],["'",'"',';',':','!','?','\\','.']];
var SS=[['1','2','3','4','5','6','7','8','9','0','\u2260','\uffe5','\u00f7'],['{','}','\u3010','\u3011','\u300a','\u300b','\u3001','\u00b7','\u2026','\u2014','\u2264','\u2265'],['\uff1b','\uff1a',"'",'\u2019','\u201d','\uff1f','\uff01','\uff0c','\u3002','\u2211','\u221a']];
var SCALE=141/180,DIR='internal://app/rawfile/pinyinDictV5_flash1001';
function typeValid(t){return typeof t==='number'&&Math.floor(t)===t&&t>=0&&t<=3;}
function charAt(row,col,type,shift){if(!typeValid(type)||row<0||row>2||Math.floor(row)!==row||col<0||Math.floor(col)!==col)return '';var arr=shift?(type===3?SS:type===0?CN:ES):type===3?SY:EN;var line=arr[row];if(col>=line.length)return '';var ch=typeof line==='string'?line.charAt(col):line[col];if(!shift&&type===0&&row===2&&col===7)return '\uff0c';if(!shift&&type===2)return ch.toUpperCase();return ch;}
function keyAt(x,y,offset,type){if(!typeValid(type)||!isFinite(x)||!isFinite(y)||!isFinite(offset)||x<0||y<0||y>=141)return null;var row=Math.floor(y/47),col=Math.floor((x-offset-row*29*SCALE)/(57*SCALE));var ch=charAt(row,col,type,false);return ch?{row:row,col:col,char:ch,shift:charAt(row,col,type,true)}:null;}
function from94(s){var out=0;for(var i=0;i<s.length;i++){var c=s.charCodeAt(i)-33;if(c<0||c>=94)throw new Error('DICT_FORMAT');out=out*94+c;}return out;}
function createKeyboard(fileApi){var token=0,dead=false,timer=null;
 function cancelTimer(){if(timer!==null){clearTimeout(timer);timer=null;}}
 function lookup(pinyin,cb){if(dead)return;var mine=++token;cancelTimer();var query=String(pinyin).toLowerCase(),ended=false,rows=[],seen={},matched='';
  function finish(err){if(ended||dead||token!==mine)return;ended=true;cancelTimer();cb(err||null,{pinyin:pinyin,matched:matched,candidates:rows,token:mine});}
  if(query.length>48){finish('PINYIN_LIMIT');return;}for(var q=0;q<query.length;q++){var c=query.charCodeAt(q);if(c<97||c>122){finish('PINYIN_INVALID');return;}}
  if(!query){finish(null);return;}
  timer=setTimeout(function(){finish('DICT_TIMEOUT');},15000);
  function read(name,position,length,then){if(dead||mine!==token||ended)return;if(position<0||length<1||length>4096){finish('DICT_READ_LIMIT');return;}var called=false;try{fileApi.readText({uri:DIR+'/'+name,position:position,length:length,success:function(d){if(called||dead||mine!==token||ended)return;called=true;if(!d||typeof d.text!=='string'){finish('DICT_INVALID_TEXT');return;}then(d.text);},fail:function(d,code){if(called)return;called=true;finish('DICT_IO_'+code);}});}catch(e){finish('DICT_EXCEPTION');}}
  function search(key,done){var depth=0,best=null;
   function step(off,len){read('key'+depth+'.dat',off,len,function(s){var entries=s.split('\u001e'),branch=null;try{for(var i=0;i<entries.length;i++){var entry=entries[i];if(!entry)continue;var part=entry.slice(1).split('\u001f');if(part.length!==2)throw new Error('DICT_FORMAT');var vo=from94(part[0]),vl=from94(part[1]);if(entry.charAt(0)==='_')best={key:key.slice(0,depth),off:vo,len:vl,depth:depth};if(depth<key.length&&entry.charAt(0)===key.charAt(depth))branch={off:vo,len:vl};}}catch(e){finish('DICT_FORMAT');return;}if(branch){depth++;step(branch.off,branch.len);return;}if(best){read('value'+best.depth+'.dat',best.off,best.len,function(v){done(best.key,v);});}else done('',null);});}
   step(0,1024);
  }
  function gather(key){if(dead||mine!==token||ended)return;search(key,function(prefix,value){if(value){if(!matched)matched=prefix;var words=value.split(' ');for(var i=0;i<words.length&&rows.length<20;i++){var word=words[i];if(word&&!seen[word]){seen[word]=true;rows.push({text:word,len:prefix.length});}}}if(rows.length<20&&prefix.length>1)gather(prefix.slice(0,-1));else finish(null);});}
  gather(query);
 }
 function dispose(){dead=true;token++;cancelTimer();}
 return {charAt:charAt,keyAt:keyAt,lookup:lookup,dispose:dispose};
}
export default createKeyboard;
