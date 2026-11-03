import geometry from './geometry.js';
/* Native glyph ratios: original crabKeyboard keyboard_rect/keyboard.js W,
 * MIT, copyright (c) 2026 kqakqakqa / crabKun. No browser measurement.
 * Keep only the 96 ASCII entries; sparse full-Unicode arrays waste Lite heap.
 */
var LATIN = [
  0.27,32/128,48/128,20/30,74/128,24/30,22/30,26/128,11/30,11/30,57/128,0.57,8/30,15/30,31/128,52/128,
  147/255,147/255,147/255,147/255,147/255,147/255,147/255,147/255,147/255,147/255,8/30,35/128,74/128,74/128,74/128,58/128,
  126/128,21/30,20/30,20/30,22/30,77/128,73/128,91/128,23/30,35/128,62/128,90/128,73/128,111/128,96/128,99/128,
  78/128,99/128,20/30,74/128,75/128,95/128,87/128,126/128,87/128,82/128,75/128,11/30,52/128,11/30,15/30,56/128,
  41/128,17/30,79/128,64/128,79/128,17/30,11/30,79/128,18/30,8/30,8/30,70/128,8/30,26/30,18/30,18/30,
  79/128,79/128,12/30,14/30,12/30,18/30,16/30,24/30,66/128,69/128,61/128,49/128,26/128,49/128,74/128,0
];
function value(text) {
  return text === undefined || text === null ? '' : String(text);
}
function code(text, at) {
  var first = text.charCodeAt(at);
  var second;
  if (first >= 0xD800 && first <= 0xDBFF && at + 1 < text.length) {
    second = text.charCodeAt(at + 1);
    if (second >= 0xDC00 && second <= 0xDFFF) {
      return 0x10000 + (first - 0xD800) * 1024 + second - 0xDC00;
    }
  }
  return first;
}
function step(text, at) {
  return at + (code(text, at) > 0xFFFF ? 2 : 1);
}
function extend(c) {
  return c >= 0x0300 && c <= 0x036F || c >= 0x1AB0 && c <= 0x1AFF ||
    c >= 0x1DC0 && c <= 0x1DFF || c >= 0x20D0 && c <= 0x20FF ||
    c >= 0xFE00 && c <= 0xFE0F || c >= 0xFE20 && c <= 0xFE2F ||
    c >= 0xE0100 && c <= 0xE01EF || c >= 0x1F3FB && c <= 0x1F3FF ||
    c >= 0xE0020 && c <= 0xE007F;
}
function nextCluster(text, at) {
  if (at >= text.length) return text.length;
  var first = code(text, at);
  var end = step(text, at);
  if (first === 13 && code(text, end) === 10) return end + 1;
  if (first >= 0x1F1E6 && first <= 0x1F1FF) {
    var flag = code(text, end);
    if (flag >= 0x1F1E6 && flag <= 0x1F1FF) end = step(text, end);
  }
  while (end < text.length) {
    var c = code(text, end);
    if (extend(c)) end = step(text, end);
    else if (c === 0x200D) {
      end = step(text, end);
      if (end < text.length && code(text, end) !== 10 && code(text, end) !== 13) end = step(text, end);
    } else break;
  }
  return end;
}
function bytes(text) {
  text = value(text);
  var total = 0;
  var at = 0;
  while (at < text.length) {
    var c = code(text, at);
    if (c <= 0x7F) total++;
    else if (c <= 0x7FF) total += 2;
    else if (c <= 0xFFFF) total += 3;
    else total += 4;
    at = step(text, at);
  }
  return total;
}
function ratio(c) {
  var r = 1;
  if (c === 9) return 1.2;
  if (c < 32 || c === 127 || c === 0x200D || extend(c)) return 0;
  if (c >= 32 && c < 128) r = LATIN[c - 32];
  else if (c === 0xB7) r = 15/30;
  else if (c === 0xB1 || c === 0xD7 || c === 0xF7 || c === 0x2248 || c === 0x2260 || c === 0x2264 || c === 0x2265 || c === 0x2211) r = 17/30;
  else if (c === 0x3C0) r = 18/30;
  else if (c === 0x2018 || c === 0x2019) r = 41/128;
  else if (c === 0x201C || c === 0x201D) r = 15/30;
  else if (c === 0x221A) r = 22/30;
  else if (c >= 0x1F000) r = 1.08;
  return Math.ceil(r * 30 - 0.000001) / 30;
}
function clusterWidth(text, at, end, font) {
  var total = 0;
  var maximum = 0;
  var joined = false;
  var first = code(text, at);
  if (first >= 0x1F1E6 && first <= 0x1F1FF) joined = true;
  while (at < end) {
    var c = code(text, at);
    if (c === 0x200D) joined = true;
    var n = ratio(c) * font;
    total += n;
    if (n > maximum) maximum = n;
    at = step(text, at);
  }
  return joined ? maximum : total;
}
function width(text, font) {
  text = value(text);
  if (typeof font !== 'number' || !isFinite(font) || font <= 0) throw new Error('Invalid text font');
  var total = 0;
  var at = 0;
  while (at < text.length) {
    var end = nextCluster(text, at);
    total += clusterWidth(text, at, end, font);
    at = end;
  }
  return total;
}
function boundary(text, pos) {
  text=value(text);pos=typeof pos==='number'&&isFinite(pos)?Math.max(0,Math.min(text.length,Math.floor(pos))):0;
  var at=0;while(at<pos){var n=nextCluster(text,at);if(n>pos)return at;at=n;}return at;
}
function move(text,pos,delta){text=value(text);pos=boundary(text,pos);if(delta>0)return nextCluster(text,pos);if(delta===0||pos===0)return pos;var at=0,prev=0;while(at<pos){prev=at;at=nextCluster(text,at);}return prev;}
function insert(text,pos,addition,maxBytes){text=value(text);addition=value(addition);if(typeof maxBytes!=='number'||maxBytes<0||bytes(text)+bytes(addition)>maxBytes)return{ok:false,text:text,cursor:pos,error:'INPUT_LIMIT'};pos=boundary(text,pos);return{ok:true,text:text.slice(0,pos)+addition+text.slice(pos),cursor:pos+addition.length,error:''};}
function space(c){return c<=32||c===12288||c===65279;}
function trim(s){var a=0,b=s.length;while(a<b&&space(s.charCodeAt(a)))a++;while(b>a&&space(s.charCodeAt(b-1)))b--;return s.slice(a,b);}
function short(s,limit){var at=0,n=0;while(at<s.length&&n<limit){at=nextCluster(s,at);n++;}return s.slice(0,at);}
function title(s){s=value(s);var at=0;while(at<s.length){var end=s.indexOf('\n',at);if(end<0)end=s.length;var line=trim(s.slice(at,end));if(line)return short(line,36);at=end+1;}return '\u672a\u547d\u540d\u8bb0\u5f55';}
function preview(s){s=value(s);var at=0,found=false,out='';while(at<s.length){var end=s.indexOf('\n',at);if(end<0)end=s.length;var line=trim(s.slice(at,end));if(line){if(found)out+=(out?' ':'')+line;else found=true;}if(out.length>120)break;at=end+1;}return short(out,60);}
function latin(c){return c>=48&&c<=57||c>=65&&c<=90||c>=97&&c<=122;}
function wrap(s,start,limit,font){var at=start,last=start,widthNow=0,lastSpace=-1;while(at<s.length&&s.charCodeAt(at)!==10&&s.charCodeAt(at)!==13){var end=nextCluster(s,at),add=clusterWidth(s,at,end,font);if(at>start&&widthNow+add>limit-3)break;last=at;at=end;widthNow+=add;if(space(s.charCodeAt(last)))lastSpace=at;}
 if(at<s.length&&at>start){var next=s.charAt(at);if('\uff0c\u3002\uff01\uff1f\uff1b\uff1a\u3001\uff09\u300b\u3011\u300d\u300f\u2026,.!?;:'.indexOf(next)>=0&&last>start)at=last;else if('\uff08\u300a\u3010\u300c\u300e('.indexOf(s.charAt(last))>=0&&last>start)at=last;else if(latin(s.charCodeAt(at))&&latin(s.charCodeAt(at-1))&&lastSpace>start+4&&lastSpace-start>=(at-start)*.45)at=lastSpace;}
 return at;
}
function headingEnd(s){var at=0;while(at<s.length&&space(s.charCodeAt(at)))at++;var e=s.indexOf('\n',at);return e>at&&e-at<=18&&s.charAt(e+1)==='\n'?e:-1;}
function pageAt(s,g,start,editor,cursor,heading){var at=start,y=g.top,lines=[],tail=false;while(at<s.length||editor&&at===s.length&&(s.length===0||s.charAt(s.length-1)==='\n')&&!tail){
 var c=s.charCodeAt(at),bold=!editor&&start===0&&heading>=0&&at<heading,font=bold?g.font*1.12:g.font,lh=bold?font*1.3:g.lineHeight;
 if(at===s.length){if(y+lh>g.bottom+.01)break;var emptyBand=geometry.band(g.w,g.h,g.round,y,y+lh,g.pad);lines.push({text:'',x:emptyBand.x,y:y,width:emptyBand.width,height:lh,font:font,start:at,end:at,bold:false,blank:true});tail=true;break;}
 if(c===10||c===13){var next=nextCluster(s,at);if(editor){var gap=cursor===at?g.lineHeight:Math.max(6,g.font*.25);if(y+gap>g.bottom+.01)break;var blankBand=geometry.band(g.w,g.h,g.round,y,y+gap,g.pad);lines.push({text:'',x:blankBand.x,y:y,width:blankBand.width,height:gap,font:g.font,start:at,end:at,bold:false,blank:true});y+=gap;at=next;}else{while(at<s.length&&(s.charCodeAt(at)===10||s.charCodeAt(at)===13))at=nextCluster(s,at);if(lines.length)y+=g.font*.34;}continue;}
 if(y+lh>g.bottom+.01)break;var band=geometry.band(g.w,g.h,g.round,y,y+lh,g.pad),end=wrap(s,at,band.width,font);if(end<=at)throw new Error('NO_COMPLETE_TEXT_LINE');lines.push({text:s.slice(at,end),x:band.x,y:y,width:band.width,height:lh,font:font,start:at,end:end,bold:bold,blank:false});at=end;y+=lh;if(at<s.length&&(s.charCodeAt(at)===10||s.charCodeAt(at)===13))at=nextCluster(s,at);
 }
 if(!lines.length&&at===start&&s.length)throw new Error('TEXT_VIEWPORT_TOO_SMALL');return{lines:lines,start:start,end:at,tail:tail};}
function paginate(s,g,anchor,editor,cursor){s=value(s);anchor=boundary(s,anchor);cursor=boundary(s,cursor);var at=0,count=0,current=null,previous=-1,prevStart=-1,head=headingEnd(s),tail=false;
 do{var page=pageAt(s,g,at,editor===true,cursor,head);if(!current||anchor>=page.start&&anchor<page.end||page.end===s.length&&anchor===s.length){current=page;current.page=count;prevStart=previous;}previous=at;count++;if(page.end===at&&s.length&&page.end<s.length)throw new Error('PAGINATION_STALLED');at=page.end;tail=page.tail;if(count>512)throw new Error('PAGINATION_LIMIT');}while(at<s.length);
 if(!current)current=pageAt(s,g,0,editor===true,cursor,head);return{lines:current.lines,start:current.start,end:current.end,prev:prevStart,next:current.end<s.length?current.end:-1,page:current.page||0,count:count,anchor:anchor};}
export default {bytes:bytes,width:width,boundary:boundary,move:move,insert:insert,title:title,preview:preview,paginate:paginate};
