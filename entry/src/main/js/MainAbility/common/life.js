import Device from '@system.device';
import geometry from './geometry.js';
function start(page, ready) {
  if (page.active) { return; }
  page.active = true;
  var gen = (page.generation || 0) + 1;
  page.generation = gen;
  page.ready = false;
  page.message = '\u6b63\u5728\u8bfb\u53d6';
  function fail(code) {
    if (!alive(page,gen)) { return; }
    page.message = '\u65e0\u6cd5\u8bfb\u53d6\u8bbe\u5907\uff0c\u70b9\u6309\u91cd\u8bd5';
    console.error('LB2 DEVICE fail '+code);
  }
  try { Device.getInfo({success:function(info){
    if (!alive(page,gen)) { return; }
    try { if(!geometry.valid(info)){ fail('INVALID_WINDOW'); return; } } catch(e) { fail('INVALID_WINDOW'); return; }
    page.info = info;
    page.w = info.windowWidth;
    page.h = info.windowHeight;
    page.round = info.screenShape === 'circle';
    console.info('LB2 DEVICE w='+page.w+' h='+page.h+' shape='+info.screenShape);
    page.message = '';
    ready(gen);
  },fail:function(d,code){fail(code);}}); } catch(e) { fail('EXCEPTION'); }
}
function alive(page,gen) { return page.active === true && page.generation === gen; }
function apply(page,g) { for(var k in g) { if (Object.prototype.hasOwnProperty.call(g,k)) { page[k] = g[k]; } } }
function focus(page,name) {
  if (page.focusTimer) { clearTimeout(page.focusTimer); }
  var gen = page.generation;
  page.focusTimer = setTimeout(function(){
    page.focusTimer = null;
    if (!alive(page,gen)) { return; }
    var ref = page.$refs && page.$refs[name || 'crown'];
    if (ref && ref.rotation) { ref.rotation({focus:true}); }
  },32);
}
function cancelInit(page) {
  if (page.initTimer !== null && page.initTimer !== undefined) { clearTimeout(page.initTimer); }
  page.initTimer = null;
  var cancel = page.initCancel;
  page.initCancel = null;
  if (typeof cancel === 'function') {
    try { cancel(); } catch(e) { console.error('LB2 INIT cancel exception'); }
  }
}
function stop(page) {
  page.active = false;
  cancelInit(page);
  page.generation = (page.generation || 0) + 1;
  if (page.focusTimer) { clearTimeout(page.focusTimer); page.focusTimer=null; }
  if (page.draftTimer) { clearTimeout(page.draftTimer); page.draftTimer=null; }
  var ref = page.$refs && page.$refs.crown;
  if (ref && ref.rotation) { ref.rotation({focus:false}); }
}
function retry(page,ready) { stop(page); start(page,ready); }
export default {start:start,alive:alive,apply:apply,focus:focus,cancelInit:cancelInit,stop:stop,retry:retry};
