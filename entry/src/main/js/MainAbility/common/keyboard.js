import dict from './lookupDictV5';
import utf8 from './utf8';
import session from './session';
var SCALE=141/180;
var rows=['qwertyuiop','asdfghjkl','zxcvbnm,'];
var nums=['`~@#%&*-^+=$\u00d7','()[]<>\\|/_\u00b1\u2248',';:\"\u2018\u201c?!,.\u221e\u03c0'];
var shifted=['1234567890','{}\\|:=+-\u00d7','\uff1b\uff1a\u201d\u2019\u3002\uff01\uff1f\uff0c'];
function cp(s,i){var c=s.charCodeAt(i);return c>=55296&&c<=56319?((c-55296)*1024+s.charCodeAt(i+1)-56320+65536):c;}
function combining(c){return c>=768&&c<=879||c>=65024&&c<=65039||c>=127995&&c<=127999||c>=917760&&c<=917999;}
function endCluster(s,i){var c=cp(s,i),j=utf8.next(s,i);if(c>=127462&&c<=127487&&cp(s,j)>=127462&&cp(s,j)<=127487)j=utf8.next(s,j);while(j<s.length){c=cp(s,j);if(combining(c))j=utf8.next(s,j);else if(c===8205){j=utf8.next(s,j);j=utf8.next(s,j);}else break;}return j;}
function boundary(s,i){i=Math.max(0,Math.min(s.length,Math.floor(Number(i)||0)));var j=0,k;while(j<i){k=endCluster(s,j);if(k>i)return j;j=k;}return j;}
function previousCluster(s,i){var j=0,k;while(j<i){k=endCluster(s,j);if(k>=i)break;j=k;}return j;}
function create(o){o=o||{};var text=o.text||'',cursor=boundary(text,o.cursor===undefined?text.length:o.cursor),type=o.type||0,pinyin=o.pinyin||'',candidates=[],offset=0,dead=false,gen=0,cancel=null,lookupTimer=null,touch=null,release=null;
function error(e){if(o.onError&&!dead)o.onError(e);return false;}
function snap(){var a=[];for(var i=0;i<candidates.length;i++)a.push({text:candidates[i].text,matchLength:candidates[i].matchLength});return {text:text,cursor:cursor,type:type,pinyin:pinyin,candidates:a,image:'/common/keyboard/common/'+type+'.png',sheetWidth:(type===3?741:570)*SCALE,sheetOffset:offset};}
function emit(){if(o.onChange&&!dead)o.onChange(snap());}
function stopLookup(){if(lookupTimer!==null&&lookupTimer!==undefined)clearTimeout(lookupTimer);lookupTimer=null;if(cancel)cancel();cancel=null;}
function lookup(){var id=++gen,key=pinyin;stopLookup();candidates=[];if(!key)return;function query(){lookupTimer=null;if(dead||gen!==id)return;try{var stop=dict.lookupDict('internal://app/rawfile/pinyinDictV5_flash1001',key,function(match,value,err){if(dead||gen!==id)return;cancel=null;if(err)return error(err);if(value){var vals=value.split(' ');for(var i=0;i<vals.length&&candidates.length<20;i++)if(vals[i])candidates.push({text:vals[i],matchLength:match.length});}emit();});if(dead||gen!==id)stop();else cancel=stop;}catch(e){error('DICT_IO');}}if(!o.deferLookup)return query();try{lookupTimer=setTimeout(query,50);if(lookupTimer==null)error('DICT_TIMER');}catch(e){lookupTimer=null;error('DICT_TIMER');}}
function insert(s){if(dead)return false;if(!utf8.valid(s))return error('UNICODE');if(utf8.bytes(text)+utf8.bytes(s)>3072)return error('LIMIT');text=text.slice(0,cursor)+s+text.slice(cursor);cursor+=s.length;emit();return true;}
function compose(s){pinyin=s;lookup();emit();return true;}
function insertComposition(s){return insert(s)&&compose('');}
function commit(extra){return !dead&&insertComposition(pinyin||extra||'');}
function key(row,col,upper){var s=type===3?nums[row].charAt(col):rows[row].charAt(col);if(!s)return false;if(upper){s=shifted[row].charAt(col)||s;}if(type===2&&!upper)s=s.toUpperCase();if(type===0&&!upper&&!(row===2&&col===7)){if(pinyin.length>=32)return error('PINYIN_LIMIT');return compose(pinyin+s);}if(type===0&&row===2&&col===7&&!upper)s='\uff0c';if(pinyin){if(utf8.bytes(text)+utf8.bytes(pinyin+s)>3072)return error('LIMIT');return insertComposition(pinyin+s);}return insert(s);}
function typeTo(n){if(dead)return false;if(pinyin&&!commit(''))return false;type=(n+4)%4;offset=0;emit();return true;}
function coords(e,g){var t=e&&(e.touches&&e.touches[0]||e.changedTouches&&e.changedTouches[0]||e),x=t&&t.globalX,y=t&&t.globalY;if(!g||typeof x!=='number'||typeof y!=='number'||!isFinite(x)||!isFinite(y)||!(g.keyW>0)||typeof g.keyX!=='number'||typeof g.keysY!=='number')return null;return{x:x,y:y};}
// Private gesture records use r/c (row/column) and held (long-press consumed)
// to keep the real SDK editor within 48 KiB; the public snapshot is unchanged.
function hit(p,g){if(!p||p.x<g.keyX||p.x>=g.keyX+g.keyW||p.y<g.keysY||p.y>=g.keysY+141)return null;var r=Math.floor((p.y-g.keysY)/SCALE/60),c=Math.floor(((p.x-g.keyX-offset)/SCALE-r*29)/57),a=type===3?nums:rows;if(r<0||r>=a.length||c<0||c>=a[r].length)return null;return {r:r,c:c};}
function suppress(p){if(p)release={x:p.x,y:p.y,at:new Date().getTime()};}
function click(e,g){if(dead)return false;var p=coords(e,g),last=release;release=null;if(!p)return error('GEOMETRY');if(last&&new Date().getTime()-last.at<=80&&Math.abs(p.x-last.x)<12&&Math.abs(p.y-last.y)<12)return false;var k=hit(p,g);return k?key(k.r,k.c,false):false;}
function start(e,g){if(dead)return false;release=null;touch=null;var p=coords(e,g);if(!p)return error('GEOMETRY');var k=hit(p,g);if(!k)return false;touch={x:p.x,y:p.y,offset:offset,r:k.r,c:k.c,dx:0,dy:0,held:false};return true;}
function move(e,g){if(dead||!touch)return false;var p=coords(e,g);if(!p)return error('GEOMETRY');touch.dx=p.x-touch.x;touch.dy=p.y-touch.y;if(Math.abs(touch.dx)>18&&Math.abs(touch.dx)>Math.abs(touch.dy)){var min=Math.min(0,g.keyW-snap().sheetWidth);offset=Math.max(min-110*SCALE,Math.min(110*SCALE,touch.offset+touch.dx));emit();}return true;}
function cancelTouch(){if(dead)return false;if(touch){suppress(touch);offset=touch.offset;touch=null;emit();}return true;}
function end(e,g){if(dead||!touch)return false;var p=coords(e,g);if(!p){cancelTouch();return error('GEOMETRY');}move(e,g);var t=touch;touch=null;suppress(p);if(t.held)return true;if(Math.abs(t.dx)>18&&Math.abs(t.dx)>Math.abs(t.dy)){var min=Math.min(0,g.keyW-snap().sheetWidth);if(offset>95*SCALE)return typeTo(type-1);if(offset<min-95*SCALE)return typeTo(type+1);offset=Math.max(min,Math.min(0,offset));emit();return true;}if(t.dy>18)return true;return key(t.r,t.c,t.dy<-18);}
function long(e,g){if(dead)return false;if(!touch&&!start(e,g))return false;if(touch.held||Math.abs(touch.dx)>18||Math.abs(touch.dy)>18)return false;touch.held=true;suppress(coords(e,g));return key(touch.r,touch.c,true);}
var api={snapshot:snap,insert:insert,setCursor:function(i){if(dead)return false;cursor=boundary(text,i);emit();return true;},move:function(d){if(dead)return false;cursor=d>0?endCluster(text,cursor):previousCluster(text,cursor);emit();return true;},home:function(){return api.setCursor(0);},end:function(){return api.setCursor(text.length);},typeNext:function(){return typeTo(type+1);},space:function(){return commit(' ');},newline:function(){return commit('\n');},choose:function(i){if(dead||!candidates[i])return false;var c=candidates[i];if(!insert(c.text))return false;return compose(pinyin.slice(c.matchLength));},backspace:function(){if(dead)return false;if(pinyin)return compose(pinyin.slice(0,-1));if(!cursor)return false;var j=previousCluster(text,cursor);text=text.slice(0,j)+text.slice(cursor);cursor=j;emit();return true;},click:click,touchStart:start,touchMove:move,touchEnd:end,touchCancel:cancelTouch,longPress:long,copy:function(){if(dead)return false;return session.clipboardPut(text);},paste:function(i){var s=session.clipboardGet(i);return !dead&&!!s&&insert(s);},clipboard:function(){return session.clipboardValues();},dispose:function(){dead=true;gen++;stopLookup();touch=null;candidates=[];}};
lookup();return api;}
export default {create:create};
