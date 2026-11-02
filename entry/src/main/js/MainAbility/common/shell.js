import sharedStore from './store-page';
import sharedSession from './session';
import Device from '@system.device';
import Router from '@system.router';
import layout from './layout';
var lastNav=0;
function app(p){var a=typeof $app!=='undefined'&&$app?($app.$def||$app):null;return a&&typeof a.whenLiubaiReady==='function'?a:null;}
function params(p){var a=app(p);if(a&&a.getLiubaiParams)return a.getLiubaiParams()||{};return {};}
function nav(p,page,values){if(Date.now()-lastNav<200)return;lastNav=Date.now();var a=app(p);if(a&&a.setLiubaiParams)a.setLiubaiParams(values||{});Router.replace({uri:'pages/'+page+'/'+page,params:values||{}});}
function init(p,cb){p.ready=false;p.message='\u6b63\u5728\u8bfb\u53d6\u8bbe\u5907';var token=(p.deviceGen||0)+1;p.deviceGen=token;clearTimeout(p.deviceTimer);p.deviceTimer=setTimeout(function(){if(p.deviceGen===token&&!p.ready)p.message='\u8bbe\u5907\u4fe1\u606f\u8d85\u65f6\uff0c\u70b9\u6309\u91cd\u8bd5';},6000);Device.getInfo({success:function(d){if(p.deviceGen!==token)return;clearTimeout(p.deviceTimer);try{if(!layout.valid(d))throw new Error('invalid device');p.info=d;p.w=d.windowWidth;p.h=d.windowHeight;p.ready=true;p.message='';cb(d);}catch(e){p.ready=false;p.message='\u8bbe\u5907\u5c3a\u5bf8\u65e0\u6548\uff0c\u70b9\u6309\u91cd\u8bd5';}},fail:function(){if(p.deviceGen!==token)return;clearTimeout(p.deviceTimer);p.message='\u8bbe\u5907\u4fe1\u606f\u5931\u8d25\uff0c\u70b9\u6309\u91cd\u8bd5';}});}
function focus(p){clearTimeout(p.focusTimer);p.focusTimer=setTimeout(function(){try{var r=p.$refs.crown;if(r&&r.rotation)r.rotation({focus:true});}catch(e){}},70);}
function clear(p){p.deviceGen=(p.deviceGen||0)+1;clearTimeout(p.deviceTimer);clearTimeout(p.focusTimer);try{if(p.$refs.crown&&p.$refs.crown.rotation)p.$refs.crown.rotation({focus:false});}catch(e){}}
function ensure(p,cb){var a=app(p);if(a&&a.whenLiubaiReady){sharedStore.bind(a.getStore());sharedSession.bind(a.getSession());a.whenLiubaiReady(cb);}else cb(new Error('App store readiness unavailable'));}
export default {init:init,params:params,nav:nav,focus:focus,clear:clear,ensure:ensure};
