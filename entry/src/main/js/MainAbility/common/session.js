import utf8 from './utf8';
var current=null,clips=[];
function set(s){current=s;}
function get(){return current;}
function clear(){current=null;}
function put(s){if(!s)return;if(typeof s!=='string'||!utf8.valid(s)||utf8.bytes(s)>3072)return false;var text=s;for(var i=clips.length-1;i>=0;i--)if(clips[i]===text)clips.splice(i,1);clips.unshift(text);if(clips.length>8)clips.pop();var total=0;for(var j=0;j<clips.length;j++)total+=utf8.bytes(clips[j]);while(total>8192)total-=utf8.bytes(clips.pop());return true;}
function clip(i){return clips[i||0]||'';}
function list(){var a=[];for(var i=0;i<clips.length;i++)a.push({index:i,title:clips[i].substring(0,20),bytes:utf8.bytes(clips[i])});return a;}
var api={set:set,get:get,clear:clear,clipboardPut:put,clipboardGet:clip,clipboardList:list,clipboardValues:function(){return clips.slice();}};
api.bind=function(t){if(!t||t===api)return;for(var k in t)if(k!=='bind')api[k]=t[k];};
export default api;
