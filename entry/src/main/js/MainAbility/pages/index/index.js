import list from '../../common/list-page';
import shell from '../../common/shell';
function trace(p,stage,err){try{if(shell.trace){if(arguments.length>2)shell.trace(p,stage,err);else shell.trace(p,stage);}}catch(ignored){}}
trace(null,'L/index.module');
function kindOf(o,n){var d;while(o){try{d=Object.getOwnPropertyDescriptor(o,n);}catch(e){return 'E';}if(d){if('get' in d||'set' in d)return 'acc';return typeof d.value;}try{o=Object.getPrototypeOf(o);}catch(e2){return 'E';}}return 'm';}
function refsType(p){try{return typeof p.$refs;}catch(e){return 'THROW';}}
function probeDef(){try{var d=(typeof $app==='undefined'||!$app)?null:$app.$def;trace(null,'L/probe.def getL='+kindOf(d,'getLiubaiParams')+' setL='+kindOf(d,'setLiubaiParams')+' when='+kindOf(d,'whenLiubaiReady')+' store='+kindOf(d,'getStore')+' sess='+kindOf(d,'getSession')+' def='+typeof d);var ks='',i,o;try{o=Object.keys(d||{});for(i=0;i<o.length&&i<10;i++)ks+=(i?',':'')+o[i];}catch(e){ks='E';}trace(null,'L/probe.keys['+ks+']');}catch(e){trace(null,'L/probe.def.throw');}}
export default {
 data:{ready:false,w:0,h:0,message:'',rows:[],days:[],loading:false,busy:false,empty:false,hasMore:false,hasPrev:false,offset:0,listGen:0,hit:46,hy:0,hx:0,hw:0,contentX:0,contentW:0,listY:0,listH:0,rowH:0,rowPad:0,titleH:0,metaH:0,rowCopyH:0,titleW:0,dayCopyW:0,titleFont:20,metaFont:13,headFont:20,navFont:16,sectionFont:16,headCenterW:0,dockX:0,dockY:0,dockW:0,newY:0,newH:0,sectionY:0,headerTitle:'',emptyText:'',dateLabel:'',sectionTitle:'',monthLabel:''},
 onInit:function(){trace(this,'L/index.onInit.enter');probeDef();try{list.init(this,'index');}catch(e){trace(this,'L/index.onInit.throw',e);throw e;}trace(this,'L/index.onInit.exit');},
 onShow:function(){shell.markVisible(true);trace(this,'L/index.onShow');trace(this,'L/index.refs='+refsType(this));try{shell.focus(this);}catch(e){trace(this,'L/index.onShow.focus.throw',e);throw e;}},
 onHide:function(){shell.markVisible(false);trace(this,'L/index.onHide');try{list.destroy(this);}catch(e){trace(this,'L/index.onHide.destroy.throw',e);throw e;}},
 onDestroy:function(){shell.markVisible(false);trace(this,'L/index.onDestroy');try{list.destroy(this);}catch(e){trace(this,'L/index.onDestroy.destroy.throw',e);throw e;}},
 retry:function(){trace(this,'L/index.retry.enter');try{if(!this.ready)list.init(this,'index');else list.refresh(this);}catch(e){trace(this,'L/index.retry.throw',e);throw e;}trace(this,'L/index.retry.exit');},
 next:function(){list.next(this);},prev:function(){list.prev(this);},
 open:function(row){list.open(this,row);},onSwipe:function(e){list.swipe(this,e);},
 onScrollEnd:function(e){if(e&&e.direction==='bottom')list.next(this);},
 home:function(){shell.nav(this,'index',{});},history:function(){shell.nav(this,'history',{});},
 back:function(){shell.nav(this,'index',{});},toggleFilter:function(){list.toggle(this);},newNote:function(){shell.nav(this,'edit',{action:'new'});},appMenu:function(){shell.nav(this,'menu',{mode:'app'});},
};
