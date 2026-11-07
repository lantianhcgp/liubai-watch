import sharedStore from './store-page';
import sharedSession from './session';
import Device from '@system.device';
import Router from '@system.router';
import layout from './layout';
var lastNav=0;
// Direct module state: lifecycle cleanup must never depend on the optional $app outlet.
var pageVisible = true;
var visibilityHook = null;
function setVisibilityHook(fn) { visibilityHook = typeof fn === 'function' ? fn : null; }
function markVisible(v) { pageVisible = v === true; if (visibilityHook) { try { visibilityHook(pageVisible); } catch (ignored) {} return; } try { var a = appRoot(); if (a && typeof a.diagVisibility === 'function') a.diagVisibility(pageVisible); } catch (ignored) {} }
function isVisible() { return pageVisible; }
function app(p){var a=typeof $app==='undefined'?null:$app;a=a&&a.$def?a.$def:a;return a&&typeof a.whenLiubaiReady==='function'&&typeof a.getStore==='function'&&typeof a.getSession==='function'?a:null;}
function params(p){var a=app(p);if(a&&typeof a.getLiubaiParams==='function')return a.getLiubaiParams()||{};return {};}
function nav(p,page,values){if(Date.now()-lastNav<200)return;lastNav=Date.now();var a=app(p);if(a&&typeof a.setLiubaiParams==='function')a.setLiubaiParams(values||{});Router.replace({uri:'pages/'+page+'/'+page,params:values||{}});}
function appRoot(){try{var a=typeof $app==='undefined'?null:$app;if(a){var o=a;while(o){var d=Object.getOwnPropertyDescriptor(o,'$def');if(d){if(d.get||d.set)return null;break;}o=Object.getPrototypeOf(o);}var v=a.$def;if(v)a=v;}return a;}catch(ignored){return null;}}
function trace(p,stage,err){try{var a=appRoot();if(!a)return;if(arguments.length>2&&typeof a.errorLiubai==='function'){a.errorLiubai(stage,err);return;}if(typeof a.traceLiubai==='function')a.traceLiubai(stage,p);}catch(ignored){}}
function init(p,cb){
 p.ready=false;p.message='\u6b63\u5728\u8bfb\u53d6\u8bbe\u5907';var token=(p.deviceGen||0)+1;p.deviceGen=token;
 try{clearTimeout(p.deviceTimer);p.deviceTimer=setTimeout(function(){try{if(p.deviceGen===token&&!p.ready){trace(p,'L/device.timeout');p.message='\u8bbe\u5907\u4fe1\u606f\u8d85\u65f6\uff0c\u70b9\u6309\u91cd\u8bd5';}}catch(err){trace(p,'L/device.timeout.callback.error',err);throw err;}},6000);}catch(e){trace(p,'L/device.timer.schedule.error',e);throw e;}
 trace(p,'L/device.getInfo.enter');
 try{Device.getInfo({success:function(d){
  try{if(p.deviceGen!==token)return;}catch(err){trace(p,'L/device.success.guard.error',err);throw err;}trace(p,'L/device.success');try{clearTimeout(p.deviceTimer);}catch(e){trace(p,'L/device.timer.clear.error',e);throw e;}
  try{if(!layout.valid(d))throw new Error('invalid device');p.info=d;p.w=d.windowWidth;p.h=d.windowHeight;p.ready=true;p.message='';trace(p,'L/device.valid');cb(d);trace(p,'L/device.callback.exit');}
  catch(e){trace(p,'L/device.callback.error',e);p.ready=false;p.message='\u8bbe\u5907\u5c3a\u5bf8\u65e0\u6548\uff0c\u70b9\u6309\u91cd\u8bd5';}
 },fail:function(){try{if(p.deviceGen!==token)return;}catch(err){trace(p,'L/device.fail.guard.error',err);throw err;}trace(p,'L/device.fail');try{clearTimeout(p.deviceTimer);}catch(e){trace(p,'L/device.timer.clear.error',e);throw e;}try{p.message='\u8bbe\u5907\u4fe1\u606f\u5931\u8d25\uff0c\u70b9\u6309\u91cd\u8bd5';}catch(err){trace(p,'L/device.fail.message.error',err);throw err;}}});}
 catch(e){trace(p,'L/device.getInfo.throw',e);throw e;}
 trace(p,'L/device.getInfo.return');
}
function focus(p){try{clearTimeout(p.focusTimer);p.focusTimer=setTimeout(function(){try{trace(p,'L/focus.enter');var r=p.$refs&&p.$refs.crown;if(r&&r.rotation)r.rotation({focus:true});trace(p,'L/focus.exit');}catch(e){trace(p,'L/focus.error',e);}},70);}catch(e){trace(p,'L/focus.schedule.error',e);throw e;}}
function clear(p){p.deviceGen=(p.deviceGen||0)+1;try{clearTimeout(p.deviceTimer);clearTimeout(p.focusTimer);}catch(e){trace(p,'L/focus.clear.timer.error',e);throw e;}try{if(p.$refs&&p.$refs.crown&&p.$refs.crown.rotation)p.$refs.crown.rotation({focus:false});}catch(e){trace(p,'L/focus.clear.error',e);}}
function ensure(p,cb){
 try{var a=app(p);trace(p,'L/app.ready.wait');if(a&&a.whenLiubaiReady){sharedStore.bind(a.getStore());sharedSession.bind(a.getSession());a.whenLiubaiReady(cb);trace(p,'L/app.ready.dispatched');}else cb(new Error('App store readiness unavailable'));}
 catch(e){trace(p,'L/app.ready.throw',e);throw e;}
}
export default {init:init,params:params,nav:nav,focus:focus,clear:clear,ensure:ensure,trace:trace,markVisible:markVisible,isVisible:isVisible,setVisibilityHook:setVisibilityHook};
