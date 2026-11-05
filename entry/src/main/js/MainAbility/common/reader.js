import layout from './layout';
var W=[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,.27,.25,.375,20/30,74/128,24/30,22/30,26/128,11/30,11/30,57/128,.57,8/30,.5,31/128,52/128,147/255,147/255,147/255,147/255,147/255,147/255,147/255,147/255,147/255,147/255,8/30,35/128,74/128,74/128,74/128,58/128,126/128,21/30,20/30,20/30,22/30,77/128,73/128,91/128,23/30,35/128,62/128,90/128,73/128,111/128,96/128,99/128,78/128,99/128,20/30,74/128,75/128,95/128,87/128,126/128,87/128,82/128,75/128,11/30,52/128,11/30,.5,56/128,41/128,17/30,79/128,.5,79/128,17/30,11/30,79/128,.6,8/30,8/30,70/128,8/30,26/30,.6,.6,79/128,79/128,.4,14/30,.4,.6,16/30,.8,66/128,69/128,61/128,49/128,26/128,49/128,74/128,0];
function ws(ch){var c=ch.charCodeAt(0);return c>=9&&c<=13||c===32||c===160||c===5760||c>=8192&&c<=8202||c===8232||c===8233||c===8239||c===8287||c===12288||c===65279;}
function isAZ(ch){var c=ch.charCodeAt(0);return c>=65&&c<=90||c>=97&&c<=122;}
function crlfEnd(s){var c=s.charCodeAt(s.length-1);return c===10||c===13;}
function hasNonWs(s){for(var i=0;i<s.length;i++)if(!ws(s.charAt(i)))return true;return false;}
function cp(s,i){var c=s.charCodeAt(i);return c>=55296&&c<=56319?((c-55296)*1024+s.charCodeAt(i+1)-56320+65536):c;}
function step(s,i){return Math.min(s.length,i+(cp(s,i)>65535?2:1));}
function mark(c){return c>=768&&c<=879||c>=65024&&c<=65039||c>=127995&&c<=127999||c>=917760&&c<=917999||c>=2304&&c<=2307||c>=2366&&c<=2381||c===8419;}
function next(s,i){var c=cp(s,i),j=step(s,i);if(c===13&&cp(s,j)===10)return step(s,j);if(c>=127462&&c<=127487&&cp(s,j)>=127462&&cp(s,j)<=127487)j=step(s,j);while(j<s.length){c=cp(s,j);if(mark(c))j=step(s,j);else if(c===8205){j=step(s,j);j=step(s,j);}else break;}return j;}
function bound(s,a){a=Number(a);if(a===Infinity)return s.length;if(!isFinite(a)||a<0)a=0;a=Math.min(s.length,Math.floor(a));var i=0,j;while(i<a){j=next(s,i);if(j>a)return i;i=j;}return i;}
function glyph(s,i,font){var c=cp(s,i);if(c===10||c===13)return 0;var r=W[c];return (r===undefined?1:Math.ceil(r*30-1e-6)/30)*font;}
function measure(s,font){var n=0;for(var i=0;i<s.length;i=next(s,i))n+=glyph(s,i,font);return n;}
function hit(s,x,font){if(x===Infinity)return s.length;if(!isFinite(x)||x<=0)return 0;var n=0,i,j,w;for(i=0;i<s.length;i=j){j=next(s,i);w=glyph(s,i,font);if(x<n+w/2)return i;if(x<n+w)return j;n+=w;}return s.length;}
function check(g){if(!g||!(g.font>0)||!(g.lineHeight>=g.font)||!isFinite(g.lineHeight)||!(g.top>=0)||!(g.bottom>g.top)||g.bottom>g.h||!isFinite(g.w)||!(g.w>0)||typeof g.round!=='boolean'||!(g.pad>=0))throw new Error('Invalid reading geometry');var b=layout.shapeBand(g.w,g.h,g.round,g.top,Math.min(g.bottom,g.top+g.lineHeight),g.pad);if(b.width<1)throw new Error('Unfittable reading band');}
var closing='\uff0c\u3002\uff01\uff1f\uff1b\uff1a\u3001\uff09\u300b\u3011\u3015\u300d\u300f\u2026,.!?;:',opening='\uff08\u300a\u3010\u3014\u300c\u300e(';
function lastStart(s,a,end){var i=a,p=a;while(i<end){p=i;i=next(s,i);}return p;}
function page(s,anchor,g,o){check(g);o=o||{};var start=bound(s,anchor),i=start,y=g.top,lines=[],titleEnd=s.indexOf('\n'),title=!o.editor&&start===0&&titleEnd>0&&titleEnd<=16&&s.charAt(titleEnd+1)==='\n'&&hasNonWs(s.slice(titleEnd+2))&&g.bottom-g.top>=2*g.lineHeight;
while(y+g.lineHeight<=g.bottom+.0001){if(i>=s.length){if(o.editor&&(i===start||s.charAt(i-1)==='\n')){var eb=layout.shapeBand(g.w,g.h,g.round,y,y+g.lineHeight,g.pad);lines.push({start:i,end:i,text:'',x:eb.x,y:y,width:eb.width,height:g.lineHeight,font:g.font,bold:false});}break;}
if(!o.editor&&(s.charAt(i)==='\n'||s.charAt(i)==='\r')){while(i<s.length&&(s.charAt(i)==='\n'||s.charAt(i)==='\r'))i=next(s,i);y+=Math.min(8,g.lineHeight*.2);continue;}
var font=title&&i===0?g.font*1.08:g.font,height=g.lineHeight*(font/g.font);if(y+height>g.bottom)break;var band=layout.shapeBand(g.w,g.h,g.round,y,y+height,g.pad),a=i,end=i,width=0,lastSpace=-1;
while(end<s.length&&s.charAt(end)!=='\n'&&s.charAt(end)!=='\r'){var j=next(s,end),w=glyph(s,end,font);if(width+w>band.width+.0001)break;width+=w;end=j;if(ws(s.charAt(end-1)))lastSpace=end;}
if(end===a&&s.charAt(a)!=='\n'&&s.charAt(a)!=='\r')throw new Error('Glyph cannot fit without clipping');
if(end<s.length&&end>a&&s.charAt(end)!=='\n'&&s.charAt(end)!=='\r'){if(isAZ(s.charAt(end))&&isAZ(s.charAt(end-1))&&lastSpace>a)end=lastSpace;while(end>a&&(closing.indexOf(s.charAt(end))>=0||opening.indexOf(s.charAt(lastStart(s,a,end)))>=0))end=lastStart(s,a,end);if(end===a)throw new Error('Punctuation group cannot fit');}
lines.push({start:a,end:end,text:s.slice(a,end),x:band.x,y:y,width:band.width,height:height,font:font,bold:font!==g.font});i=end;y+=height;if(i<s.length&&(s.charAt(i)==='\n'||s.charAt(i)==='\r')){i=next(s,i);if(!o.editor){while(i<s.length&&(s.charAt(i)==='\n'||s.charAt(i)==='\r'))i=next(s,i);y+=Math.min(8,g.lineHeight*.2);}}
}
return {start:start,end:i,lines:lines};}
function count(s,g,o){check(g);var n=0,i=0,p;do{p=page(s,i,g,o);n++;if(p.end===s.length){if(o&&o.editor&&s.length&&crlfEnd(s)&&!p.lines.length)break;if(o&&o.editor&&crlfEnd(s)&&!hasEnd(p,s.length))n++;break;}if(p.end<=i)throw new Error('Pagination did not progress');i=p.end;}while(true);return n;}
function hasEnd(p,n){for(var i=0;i<p.lines.length;i++)if(p.lines[i].start===n)return true;return false;}
function locate(s,a,g,o){check(g);var target=bound(s,a),i=0,index=0,previous=0,p;do{p=page(s,i,g,o);if(o&&o.editor&&target===s.length&&crlfEnd(s)&&p.end===s.length&&!hasEnd(p,s.length)){previous=p.start;p=page(s,s.length,g,o);index++;break;}if(o&&o.editor&&s.charAt(target)==='\n'&&!hasEnd(p,target)&&target>=p.start&&target<=p.end){p=page(s,target,g,o);break;}if(target<p.end||p.end===s.length)break;if(p.end<=i)throw new Error('Pagination did not progress');previous=i;i=p.end;index++;}while(true);return {page:p,index:index,previousStart:previous};}
export default {page:page,count:count,locate:locate,measure:measure,hit:hit};
