/******/ (function() {
function __r15_date(v,n){var s=String(v),i,c;if(s.length!==n)return false;for(i=0;i<n;i++){c=s.charCodeAt(i);if(i===4||i===7){if(c!==45)return false;}else if(c<48||c>57)return false;}return true;}
 // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 211:
/***/ (function(module, __unused_webpack_exports, __webpack_require__) {

var $app_template$ = __webpack_require__(614)
var $app_style$ = __webpack_require__(489)
var $app_script$ = __webpack_require__(545)
var options=$app_script$
 if ($app_script$.__esModule) {

      options = $app_script$.default;
 }
options.styleSheet=$app_style$
options.render=$app_template$;
module.exports=new ViewModel(options);

/***/ }),

/***/ 489:
/***/ (function(module) {

module.exports = {"classSelectors":{"page":{"width":"100%","height":"100%","backgroundColor":395272},"surface":{"backgroundColor":395272,"alignItems":"flex-start","justifyContent":"flex-start"},"header":{"flexDirection":"row","alignItems":"center","justifyContent":"space-between"},"hit":{"alignItems":"center","justifyContent":"center"},"head-small":{"fontFamily":"HYQiHei-65S","color":11383209,"textAlign":"center"},"head-title":{"fontFamily":"HYQiHei-65S","color":15855848,"textAlign":"center"},"new-note":{"backgroundColor":15124364,"flexDirection":"row","alignItems":"center","justifyContent":"flex-start"},"section":{"flexDirection":"row","alignItems":"center","justifyContent":"space-between"},"section-label":{"fontFamily":"HYQiHei-65S","color":11383209},"filter":{"fontFamily":"HYQiHei-65S","textAlign":"center"},"note-list":{"backgroundColor":395272},"row":{"alignItems":"center","justifyContent":"flex-start"},"row-divider":{"backgroundColor":2764590},"copy":{"flexDirection":"column","alignItems":"flex-start","justifyContent":"center"},"title-row":{"flexDirection":"row","alignItems":"center","justifyContent":"flex-start"},"row-title":{"fontFamily":"HYQiHei-65S","color":15855848,"textOverflow":"ellipsis"},"row-meta":{"fontFamily":"HYQiHei-65S","color":11383209,"textOverflow":"ellipsis"},"day-row":{"flexDirection":"row","alignItems":"center","justifyContent":"flex-start"},"day-num":{"fontFamily":"HYQiHei-65S","color":15124364},"quiet-empty":{"flexDirection":"column","alignItems":"center","justifyContent":"flex-start"},"empty-title":{"fontFamily":"HYQiHei-65S","color":15855848,"textAlign":"center"},"empty-prompt":{"fontFamily":"HYQiHei-65S","color":11383209,"textAlign":"center"},"quiet-status":{"flexDirection":"column","alignItems":"flex-start","justifyContent":"center"},"quiet":{"fontFamily":"HYQiHei-65S","color":11383209},"notice":{"alignItems":"center","justifyContent":"center"},"loading":{"width":"100%","height":"100%","alignItems":"center","justifyContent":"center"},"dock":{"flexDirection":"row","alignItems":"center","backgroundColor":1514267,"borderTopWidth":1,"borderRightWidth":1,"borderBottomWidth":1,"borderLeftWidth":1,"borderTopColor":2698795,"borderRightColor":2698795,"borderBottomColor":2698795,"borderLeftColor":2698795},"nav":{"flexDirection":"row","alignItems":"center","justifyContent":"center"},"nav-label":{"fontFamily":"HYQiHei-65S","color":11383209},"selected":{"fontFamily":"HYQiHei-65S","color":15124364},"dock-divider":{"backgroundColor":2896173},"pager":{"flexDirection":"row","alignItems":"center","justifyContent":"center"},"pager-text":{"fontFamily":"HYQiHei-65S","color":11383209,"fontSize":14,"textAlign":"center"}}}

/***/ }),

/***/ 614:
/***/ (function(module) {

module.exports = function (vm) { var _vm = vm || this; return _c('stack', {'staticClass' : ["page"]} , [_i((function () {return _vm.ready}),function(){return _c('stack', {'staticClass' : ["surface"],'dynamicStyle' :{'width' : function () {return (_vm.w)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.h)+ decodeURI('') +decodeURI('px')}}} , [_c('div', {'staticClass' : ["header"],'dynamicStyle' :{'left' : function () {return (_vm.hx)+ decodeURI('') +decodeURI('px')},'top' : function () {return (_vm.hy)+ decodeURI('') +decodeURI('px')},'width' : function () {return (_vm.hw)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.hit)+ decodeURI('') +decodeURI('px')}}} , [_c('image', {'attrs' : {'src' : "/common/type/app_name.png"},'dynamicStyle' :{'width' : function () {return (_vm.typeW)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.typeH)+ decodeURI('') +decodeURI('px')}}} ),_c('text', {'attrs' : {'value' : function () {return _vm.dateLabel}},'staticClass' : ["head-small"],'dynamicStyle' :{'width' : function () {return (60*_vm.w/412)+ decodeURI('') +decodeURI('px')},'height' : function () {return (26*_vm.w/412)+ decodeURI('') +decodeURI('px')},'fontSize' : function () {return (_vm.dateFont)+ decodeURI('') +decodeURI('px')}}} ),_c('div', {'staticClass' : ["hit"],'dynamicStyle' :{'width' : function () {return (_vm.hit)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.hit)+ decodeURI('') +decodeURI('px')}},'onBubbleEvents' : {'click' : _vm.appMenu}} , [_c('image', {'attrs' : {'src' : "/common/icons/dots_header_warm.png"},'dynamicStyle' :{'width' : function () {return (_vm.rowIcon)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.rowIcon)+ decodeURI('') +decodeURI('px')}}} )] )] ),_c('div', {'staticClass' : ["new-note"],'dynamicStyle' :{'left' : function () {return (_vm.contentX)+ decodeURI('') +decodeURI('px')},'top' : function () {return (_vm.newY)+ decodeURI('') +decodeURI('px')},'width' : function () {return (_vm.contentW)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.newH)+ decodeURI('') +decodeURI('px')},'borderRadius' : function () {return (_vm.newRadius)+ decodeURI('') +decodeURI('px')}},'onBubbleEvents' : {'click' : _vm.newNote}} , [_c('image', {'attrs' : {'src' : "/common/icons/plus_cta_ink.png"},'dynamicStyle' :{'width' : function () {return (_vm.plusSize)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.plusSize)+ decodeURI('') +decodeURI('px')},'marginLeft' : function () {return (_vm.newPad)+ decodeURI('') +decodeURI('px')}}} ),_c('image', {'attrs' : {'src' : "/common/type/write_note.png"},'dynamicStyle' :{'width' : function () {return (_vm.writeW)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.writeH)+ decodeURI('') +decodeURI('px')},'marginLeft' : function () {return (_vm.newGap)+ decodeURI('') +decodeURI('px')}}} )] ),_c('div', {'staticClass' : ["section"],'staticStyle' : {'height' : 44}, 'dynamicStyle' :{'left' : function () {return (_vm.contentX)+ decodeURI('') +decodeURI('px')},'top' : function () {return (_vm.sectionY)+ decodeURI('') +decodeURI('px')},'width' : function () {return (_vm.contentW)+ decodeURI('') +decodeURI('px')}}} , [_c('text', {'attrs' : {'value' : function () {return _vm.sectionTitle}},'staticClass' : ["section-label"],'dynamicStyle' :{'width' : function () {return (_vm.contentW-44)+ decodeURI('') +decodeURI('px')},'height' : function () {return (24*_vm.w/412)+ decodeURI('') +decodeURI('px')},'fontSize' : function () {return (_vm.sectionFont)+ decodeURI('') +decodeURI('px')}}} ),_c('div', {'staticClass' : ["hit"],'staticStyle' : {'width' : 44}, 'dynamicStyle' :{'height' : function () {return (_vm.hit)+ decodeURI('') +decodeURI('px')}},'onBubbleEvents' : {'click' : _vm.toggleFilter}} , [_c('text', {'attrs' : {'value' : "置顶"},'staticClass' : ["filter"],'staticStyle' : {'width' : 44}, 'dynamicStyle' :{'height' : function () {return (25*_vm.w/412)+ decodeURI('') +decodeURI('px')},'fontSize' : function () {return (_vm.filterFont)+ decodeURI('') +decodeURI('px')},'color' : function () {return _vm.filter==='pinned'?'#e6c78c':'#adb1a9'}}} )] )] ),_c('list', {'attrs' : {'ref' : "crown"},'staticClass' : ["note-list"],'dynamicStyle' :{'left' : function () {return (_vm.contentX)+ decodeURI('') +decodeURI('px')},'top' : function () {return (_vm.listY)+ decodeURI('') +decodeURI('px')},'width' : function () {return (_vm.contentW)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.listH)+ decodeURI('') +decodeURI('px')}},'onBubbleEvents' : {'swipe' : _vm.onSwipe,'scrollend' : _vm.onScrollEnd}} , [_l((function () {return _vm.rows}),function($item,$idx){return _c('list-item', {'staticClass' : ["row"],'dynamicStyle' :{'width' : function () {return (_vm.contentW)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.rowH)+ decodeURI('') +decodeURI('px')}},'onBubbleEvents' : {'click' : function (evt) {_vm.open($item,evt)}},'key' : $item.id} , [_c('stack', {'staticClass' : ["row-surface"],'dynamicStyle' :{'width' : function () {return (_vm.contentW)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.rowH)+ decodeURI('') +decodeURI('px')}}} , [_c('div', {'staticClass' : ["copy"],'dynamicStyle' :{'left' : function () {return (_vm.rowInset)+ decodeURI('') +decodeURI('px')},'top' : function () {return (_vm.rowPad)+ decodeURI('') +decodeURI('px')},'width' : function () {return (_vm.titleW)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.rowCopyH)+ decodeURI('') +decodeURI('px')}}} , [_c('div', {'staticClass' : ["title-row"],'dynamicStyle' :{'width' : function () {return (_vm.titleW)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.titleH)+ decodeURI('') +decodeURI('px')}}} , [_i((function () {return $item.pinned}),function(){return _c('image', {'attrs' : {'src' : "/common/icons/pin_row_gold.png"},'dynamicStyle' :{'width' : function () {return (_vm.pinSize)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.pinSize)+ decodeURI('') +decodeURI('px')},'marginRight' : function () {return (_vm.pinGap)+ decodeURI('') +decodeURI('px')}}} )}),_c('text', {'attrs' : {'value' : function () {return $item.title}},'staticClass' : ["row-title"],'dynamicStyle' :{'width' : function () {return (_vm.titleW-($item.pinned?_vm.pinSize+_vm.pinGap:0))+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.titleH)+ decodeURI('') +decodeURI('px')},'fontSize' : function () {return (_vm.titleFont)+ decodeURI('') +decodeURI('px')}}} )] ),_c('text', {'attrs' : {'value' : function () {return $item.meta}},'staticClass' : ["row-meta"],'dynamicStyle' :{'width' : function () {return (_vm.titleW)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.metaH)+ decodeURI('') +decodeURI('px')},'fontSize' : function () {return (_vm.metaFont)+ decodeURI('') +decodeURI('px')},'marginTop' : function () {return (_vm.copyGap)+ decodeURI('') +decodeURI('px')}}} )] ),_c('div', {'staticClass' : ["row-divider"],'staticStyle' : {'left' : 0,'height' : 1}, 'dynamicStyle' :{'top' : function () {return (_vm.rowH-1)+ decodeURI('') +decodeURI('px')},'width' : function () {return (_vm.contentW)+ decodeURI('') +decodeURI('px')}}} )] )] )}),_i((function () {return _vm.hasMore||_vm.hasPrev}),function(){return _c('list-item', {'staticClass' : ["pager"],'dynamicStyle' :{'width' : function () {return (_vm.contentW)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.hit)+ decodeURI('') +decodeURI('px')}}} , [_i((function () {return _vm.hasPrev}),function(){return _c('div', {'staticClass' : ["hit"],'dynamicStyle' :{'width' : function () {return (_vm.contentW/2)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.hit)+ decodeURI('') +decodeURI('px')}},'onBubbleEvents' : {'click' : _vm.prev}} , [_c('text', {'attrs' : {'value' : "上一屏"},'staticClass' : ["pager-text"]} )] )}),_i((function () {return _vm.hasMore}),function(){return _c('div', {'staticClass' : ["hit"],'dynamicStyle' :{'width' : function () {return (_vm.contentW/2)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.hit)+ decodeURI('') +decodeURI('px')}},'onBubbleEvents' : {'click' : _vm.next}} , [_c('text', {'attrs' : {'value' : "下一屏"},'staticClass' : ["pager-text"]} )] )})] )})] ),_i((function () {return _vm.message||_vm.loading}),function(){return _c('div', {'staticClass' : ["notice"],'dynamicStyle' :{'left' : function () {return (_vm.contentX)+ decodeURI('') +decodeURI('px')},'top' : function () {return (_vm.listY)+ decodeURI('') +decodeURI('px')},'width' : function () {return (_vm.contentW)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.listH)+ decodeURI('') +decodeURI('px')}},'onBubbleEvents' : {'click' : _vm.retry}} , [_c('text', {'attrs' : {'value' : function () {return _vm.message||'正在读取'}},'staticClass' : ["quiet"],'dynamicStyle' :{'width' : function () {return (_vm.contentW)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.quietH)+ decodeURI('') +decodeURI('px')},'fontSize' : function () {return (_vm.quietFont)+ decodeURI('') +decodeURI('px')}}} )] )}),_i((function () {return _vm.empty&&!_vm.message&&!_vm.loading}),function(){return _c('div', {'staticClass' : ["quiet-status"],'dynamicStyle' :{'left' : function () {return (_vm.contentX)+ decodeURI('') +decodeURI('px')},'top' : function () {return (_vm.listY+16+16*_vm.w/412)+ decodeURI('') +decodeURI('px')},'width' : function () {return (_vm.contentW)+ decodeURI('') +decodeURI('px')},'height' : function () {return (32.3*_vm.w/412)+ decodeURI('') +decodeURI('px')}},'onBubbleEvents' : {'click' : _vm.retry}} , [_c('text', {'attrs' : {'value' : function () {return _vm.emptyText}},'staticClass' : ["quiet"],'dynamicStyle' :{'width' : function () {return (_vm.contentW)+ decodeURI('') +decodeURI('px')},'height' : function () {return (28.3*_vm.w/412)+ decodeURI('') +decodeURI('px')},'fontSize' : function () {return (_vm.quietFont)+ decodeURI('') +decodeURI('px')}}} )] )}),_c('div', {'staticClass' : ["dock"],'dynamicStyle' :{'left' : function () {return (_vm.dockX)+ decodeURI('') +decodeURI('px')},'top' : function () {return (_vm.dockY)+ decodeURI('') +decodeURI('px')},'width' : function () {return (_vm.dockW)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.hit)+ decodeURI('') +decodeURI('px')},'borderRadius' : function () {return (_vm.dockRadius)+ decodeURI('') +decodeURI('px')}}} , [_c('div', {'staticClass' : ["nav"],'dynamicStyle' :{'width' : function () {return (_vm.dockHalfW)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.dockInnerH)+ decodeURI('') +decodeURI('px')}},'onBubbleEvents' : {'click' : _vm.home}} , [_c('image', {'attrs' : {'src' : "/common/icons/book_nav_gold.png"},'staticStyle' : {'width' : 20,'height' : 20}, 'dynamicStyle' :{'marginRight' : function () {return (_vm.navGap)+ decodeURI('') +decodeURI('px')}}} ),_c('text', {'attrs' : {'value' : "随记"},'staticClass' : ["selected"],'dynamicStyle' :{'width' : function () {return (_vm.navFont*2)+ decodeURI('') +decodeURI('px')},'height' : function () {return (28*_vm.w/412)+ decodeURI('') +decodeURI('px')},'fontSize' : function () {return (_vm.navFont)+ decodeURI('') +decodeURI('px')}}} )] ),_c('div', {'staticClass' : ["dock-divider"],'staticStyle' : {'width' : 1}, 'dynamicStyle' :{'height' : function () {return (_vm.dockInnerH)+ decodeURI('') +decodeURI('px')}}} ),_c('div', {'staticClass' : ["nav"],'dynamicStyle' :{'width' : function () {return (_vm.dockHalfW)+ decodeURI('') +decodeURI('px')},'height' : function () {return (_vm.dockInnerH)+ decodeURI('') +decodeURI('px')}},'onBubbleEvents' : {'click' : _vm.history}} , [_c('image', {'attrs' : {'src' : "/common/icons/calendar_nav_muted.png"},'staticStyle' : {'width' : 20,'height' : 20}, 'dynamicStyle' :{'marginRight' : function () {return (_vm.navGap)+ decodeURI('') +decodeURI('px')}}} ),_c('text', {'attrs' : {'value' : "回看"},'staticClass' : ["nav-label"],'dynamicStyle' :{'width' : function () {return (_vm.navFont*2)+ decodeURI('') +decodeURI('px')},'height' : function () {return (28*_vm.w/412)+ decodeURI('') +decodeURI('px')},'fontSize' : function () {return (_vm.navFont)+ decodeURI('') +decodeURI('px')}}} )] )] )] )}),_i((function () {return !_vm.ready}),function(){return _c('div', {'staticClass' : ["loading"],'onBubbleEvents' : {'click' : _vm.retry}} , [_c('text', {'attrs' : {'value' : function () {return _vm.message}},'staticClass' : ["quiet"]} )] )})] ) }

/***/ }),

/***/ 576:
/***/ (function(__unused_webpack_module, exports) {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
function positive(n) {
  return typeof n === 'number' && isFinite(n) && n > 0;
}
function valid(info) {
  if (!info || !positive(info.windowWidth) || !positive(info.windowHeight) || info.screenShape !== 'rect' && info.screenShape !== 'circle') {
    throw new Error('Invalid device window');
  }
  return true;
}
function shapeBand(w, h, round, y0, y1, pad) {
  if (!positive(w) || !positive(h) || typeof round !== 'boolean' || typeof y0 !== 'number' || typeof y1 !== 'number' || !isFinite(y0) || !isFinite(y1) || y0 < 0 || y1 < y0 || y1 > h || typeof pad !== 'number' || !isFinite(pad) || pad < 0) {
    throw new Error('Invalid shape band');
  }
  var inset = 0,
    r,
    dy,
    depth;
  if (round) {
    r = Math.min(w, h) / 2;
    dy = Math.max(Math.abs(y0 - h / 2), Math.abs(y1 - h / 2));
    inset = w / 2 - Math.sqrt(Math.max(0, r * r - dy * dy));
  } else {
    r = Math.min(w, h) * .25;
    depth = Math.min(y0, h - y1);
    if (depth < r) inset = r - Math.sqrt(Math.max(0, r * r - (r - depth) * (r - depth)));
  }
  var x = inset + pad;
  return {
    x: x,
    width: Math.max(0, w - 2 * x)
  };
}
function home(info) {
  valid(info);
  var w = info.windowWidth,
    h = info.windowHeight,
    round = info.screenShape === 'circle';
  var hit = Math.max(46, w * .106),
    hy = round ? h * .079 : Math.max(20, h * .048);
  var head = shapeBand(w, h, round, hy, hy + hit, 8);
  var dockY = h * (round ? .908 : .838) - hit;
  var dock = shapeBand(w, h, round, dockY, dockY + hit, 12);
  var dockW = Math.min(w * (round ? .56 : .80), dock.width);
  var newY = hy + hit + 4,
    newH = Math.max(50, Math.min(58, w * .132));
  var sectionY = newY + newH + 2,
    listY = sectionY + 44,
    listH = dockY - 7 - listY;
  var slots = Math.floor(listH / (round ? Math.max(50, 49.5 * w / 412) : 58));
  var content = shapeBand(w, h, round, newY, dockY - 7, round ? Math.max(10, w * .026) : Math.max(20, w * .06));
  if (slots < 1 || content.width < 2 * hit || dockW < 2 * hit || head.width < 2 * hit) throw new Error('Home window too small');
  return {
    w: w,
    h: h,
    round: round,
    hy: hy,
    hx: head.x,
    hw: head.width,
    hit: hit,
    newY: newY,
    newH: newH,
    sectionY: sectionY,
    listY: listY,
    listH: listH,
    rowH: listH / slots,
    slots: slots,
    contentX: content.x,
    contentW: content.width,
    dockX: (w - dockW) / 2,
    dockY: dockY,
    dockW: dockW
  };
}
function reader(info, fontKey) {
  valid(info);
  if (fontKey === undefined) fontKey = 'normal';
  if (fontKey !== 'compact' && fontKey !== 'normal' && fontKey !== 'large') throw new Error('Invalid font key');
  var w = info.windowWidth,
    h = info.windowHeight,
    round = info.screenShape === 'circle';
  var hit = Math.max(46, w * .106),
    hy = round ? h * .079 : Math.max(20, h * .044);
  var head = shapeBand(w, h, round, hy, hy + hit, 8),
    top = hy + hit + 7;
  var footerY = h * .918,
    bottom = footerY - 6;
  var font = fontKey === 'compact' ? Math.max(20, Math.min(24, 22 * w / 412)) : fontKey === 'large' ? Math.max(26, Math.min(31, 28 * w / 412)) : Math.max(22, Math.min(27, 24 * w / 412));
  if (bottom - top < font * 1.42 || head.width < 2 * hit) throw new Error('Reader window too small');
  return {
    w: w,
    h: h,
    round: round,
    hy: hy,
    hx: head.x,
    hw: head.width,
    hit: hit,
    top: top,
    bottom: bottom,
    footerY: footerY,
    font: font,
    lineHeight: font * 1.42,
    pad: round ? Math.max(10, w * .026) : Math.max(17, w * .047)
  };
}
function editor(info, open) {
  valid(info);
  if (typeof open !== 'boolean') throw new Error('Invalid keyboard state');
  var w = info.windowWidth,
    h = info.windowHeight,
    round = info.screenShape === 'circle';
  var hit = 46,
    hy = round ? h * .079 : Math.max(20, h * .044);
  var head = shapeBand(w, h, round, hy, hy + hit, 8);
  var footerBottom = h * (open ? round ? .906 : .847 : round ? .89 : .838);
  var footY = footerBottom - 44,
    keysY = footY - 4 - 141;
  var top = hy + hit + 5,
    bottom = (open ? keysY : footY) - 17;
  var foot = shapeBand(w, h, round, footY, footerBottom, round ? 10 : 24);
  var key = shapeBand(w, h, round, keysY, keysY + 141, round ? 8 : 24);
  var font = Math.max(21, Math.min(24, 22 * w / 412));
  if (bottom - top < font * 1.34 || foot.width < 191 || head.width < 4 * hit || key.width < 44) throw new Error('Editor window too small');
  return {
    w: w,
    h: h,
    round: round,
    open: open,
    hit: hit,
    hy: hy,
    hx: head.x,
    hw: head.width,
    top: top,
    bottom: bottom,
    footY: footY,
    footerBottom: footerBottom,
    footX: foot.x,
    footW: foot.width,
    keysY: keysY,
    keyX: key.x,
    keyW: key.width,
    font: font,
    lineHeight: font * 1.34,
    pad: round ? Math.max(10, w * .026) : Math.max(18, w * .047)
  };
}
var _default = {
  valid: valid,
  shapeBand: shapeBand,
  home: home,
  reader: reader,
  editor: editor
};
exports["default"] = _default;

function requireModule(moduleName) {
  return requireNative(moduleName.slice(1));
}


/***/ }),

/***/ 538:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(143);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _storePage = _interopRequireDefault(__webpack_require__(313));
var _shell = _interopRequireDefault(__webpack_require__(872));
var _layout = _interopRequireDefault(__webpack_require__(576));
function two(n) {
  return n < 10 ? '0' + n : '' + n;
}
function validMonth(s) {
  if (typeof s !== 'string' || !__r15_date(s,7) || +s.slice(5) < 1 || +s.slice(5) > 12 || +s.slice(0, 4) < 1) throw new Error('Invalid month');
  return s;
}
function validDay(s) {
  if (typeof s !== 'string' || !__r15_date(s,10)) throw new Error('Invalid day');
  validMonth(s.slice(0, 7));
  var y = +s.slice(0, 4),
    m = +s.slice(5, 7),
    d = +s.slice(8),
    max = m === 2 ? y % 4 === 0 && y % 100 !== 0 || y % 400 === 0 ? 29 : 28 : [4, 6, 9, 11].indexOf(m) >= 0 ? 30 : 31;
  if (d < 1 || d > max) throw new Error('Invalid day');
  return s;
}
function shiftMonth(s, delta) {
  validMonth(s);
  if (delta !== 1 && delta !== -1) throw new Error('Invalid month delta');
  var y = +s.slice(0, 4),
    m = +s.slice(5) + delta;
  if (m === 13) {
    m = 1;
    y++;
  }
  if (m === 0) {
    m = 12;
    y--;
  }
  return validMonth(('0000' + y).slice(-4) + '-' + two(m));
}
function today() {
  var d = new Date();
  return d.getFullYear() + '-' + two(d.getMonth() + 1) + '-' + two(d.getDate());
}
function geometry(p, info, kind) {
  var g = _layout["default"].home(info),
    k,
    u = g.w / 412;
  for (k in g) p[k] = g[k];
  p.titleFont = Math.max(20, (g.round ? 20 : 22) * u);
  p.metaFont = Math.max(13, 14 * u);
  p.headFont = (g.round && g.w < 420 ? 20 : 24) * u;
  p.navFont = Math.max(16, 18 * u);
  p.sectionFont = 16 * u;
  p.filterFont = 17 * u;
  p.dateFont = 18 * u;
  p.typeW = 58 * u;
  p.typeH = 37 * u;
  p.writeW = 69 * u;
  p.writeH = 34 * u;
  p.plusSize = 27 * u;
  p.newPad = 18 * u;
  p.newGap = 12 * u;
  p.newRadius = 15 * u;
  p.rowIcon = 23 * u;
  p.pinSize = 17 * u;
  p.pinGap = 7 * u;
  p.navIcon = 20;
  p.navGap = 7 * u;
  p.dockInnerH = g.hit - 2;
  p.dockHalfW = (g.dockW - 3) / 2;
  p.dockSingleW = g.dockW - 2;
  p.dockRadius = 22 * u;
  p.monthFont = 22 * u;
  p.dayNumFont = 29 * u;
  p.dayNumW = 42 * u;
  p.dayNumH = 42 * u;
  p.dayGap = 10 * u;
  p.titleH = p.titleFont * 1.26;
  p.metaH = p.metaFont * 1.25;
  p.copyGap = 3 * u;
  p.rowCopyH = p.titleH + p.metaH + p.copyGap;
  if (kind === 'history') {
    p.listY = g.newY + g.hit + 9;
    p.listH = g.dockY - p.listY - 8;
    p.rowH = 65 * u;
    p.titleFont = 21 * u;
    p.metaFont = 14 * u;
    p.titleH = 31 * u;
    p.metaH = 20 * u;
    p.copyGap = u;
    p.rowCopyH = 52 * u;
  } else if (kind === 'day' || kind === 'trash') {
    p.listY = g.hy + g.hit + 8 + 3 * u;
    p.listH = g.dockY - p.listY - 8 - 14 * u;
    p.rowH = Math.max(60 * u, p.rowCopyH + 2 * (g.round ? 4 : 5) * u + 1);
  }
  p.slots = Math.max(1, Math.floor(p.listH / p.rowH));
  p.rowPad = Math.max(0, (p.rowH - 1 - p.rowCopyH) / 2);
  p.rowInset = 2 * u;
  p.titleW = p.contentW - 4 * u;
  p.dayCopyW = p.contentW - p.dayNumW - 2 * p.dayGap - p.rowIcon;
  p.listBottom = p.listY + p.listH;
  p.headCenterW = p.hw - p.hit - 8;
  p.emptyY = Math.max(g.hy + g.hit + 36, g.h * .285);
  p.emptyIconSize = 43 * u;
  p.emptyIconGap = 18 * u;
  p.emptyTitleFont = 25 * u;
  p.emptyTitleH = 36 * u;
  p.emptyTitleGap = 13 * u;
  p.emptyPromptFont = 18 * u;
  p.emptyPromptH = 29 * u;
  p.emptyH = p.emptyIconSize + p.emptyIconGap + p.emptyTitleH + p.emptyTitleGap + p.emptyPromptH;
  p.emptyX = p.contentX;
  p.emptyW = p.contentW;
  p.quietFont = 19 * u;
  p.quietH = 32 * u;
}
function metaRows(items, limit) {
  if (!Array.isArray(items) || items.length > limit) throw new Error('Invalid index page');
  var out = [],
    seen = {},
    m,
    i;
  for (i = 0; i < items.length; i++) {
    m = items[i];
    if (!m || typeof m.id !== 'string' || !m.id || seen[m.id] || m.body !== undefined || typeof m.title !== 'string' || typeof m.preview !== 'string') throw new Error('Invalid index metadata');
    validDay(m.date);
    seen[m.id] = true;
    out.push({
      id: m.id,
      date: m.date,
      time: m.time,
      title: m.title,
      preview: m.preview,
      pinned: m.pinned === true,
      deleted: m.deleted === true,
      revision: m.revision,
      bytes: m.bytes,
      meta: m.date.slice(5).replace('-', ' / ') + " \xB7 " + m.time + '  ' + m.preview,
      pinColor: m.pinned ? '#e6c78c' : '#f1f0e8'
    });
  }
  return out;
}
function error(p, e) {
  p.loading = false;
  p.busy = false;
  p.message = "\u6CA1\u8BFB\u5230\uFF0C\u70B9\u6309\u91CD\u8BD5";
  p.errorDetail = String(e && e.message || e);
}
function paint(p, rows, more, offset) {
  p.rows = rows;
  p.hasMore = more;
  p.hasPrev = offset > 0;
  p.offset = offset;
  p.loading = false;
  p.message = '';
  p.empty = rows.length === 0;
  p.pageText = Math.floor(offset / p.slots) + 1 + (more ? ' +' : '');
  _shell["default"].focus(p);
}
function fetch(p, offset) {
  var gen = ++p.listGen,
    limit = p.slots;
  p.loading = true;
  p.message = '';
  _storePage["default"].list({
    offset: offset,
    limit: limit,
    filter: p.filter,
    day: p.day || '',
    month: p.month || ''
  }, function (e, r) {
    if (!p.alive || gen !== p.listGen) return;
    if (e) {
      error(p, e);
      return;
    }
    try {
      if (!r || typeof r.hasMore !== 'boolean') throw new Error('Invalid list result');
      var rows = metaRows(r.items, limit);
      if (r.hasMore && rows.length !== limit) throw new Error('Incomplete index page');
      paint(p, rows, r.hasMore, offset);
    } catch (x) {
      error(p, x);
    }
  });
}
function monthFetch(p) {
  var gen = ++p.listGen,
    summaries = [],
    byDay = {},
    offset = 0;
  p.loading = true;
  p.message = '';
  function scan() {
    _storePage["default"].list({
      offset: offset,
      limit: 12,
      filter: 'month',
      month: p.month
    }, function (e, r) {
      if (!p.alive || gen !== p.listGen) return;
      if (e) {
        error(p, e);
        return;
      }
      try {
        if (!r || typeof r.hasMore !== 'boolean') throw new Error('Invalid month result');
        var rows = metaRows(r.items, 12),
          i,
          m,
          a;
        for (i = 0; i < rows.length; i++) {
          m = rows[i];
          if (m.date.slice(0, 7) !== p.month) throw new Error('Month filter mismatch');
          a = byDay[m.date];
          if (!a) {
            a = {
              id: m.date,
              date: m.date,
              num: m.date.slice(8),
              title: m.date === p.today ? "\u4ECA\u5929" : m.date.slice(5, 7) + " \u6708 " + m.date.slice(8) + " \u65E5",
              count: 0,
              preview: m.title
            };
            byDay[m.date] = a;
            summaries.push(a);
          }
          a.count++;
        }
        if (r.hasMore) {
          if (rows.length !== 12) throw new Error('Incomplete month index');
          offset += rows.length;
          scan();
          return;
        }
        summaries.sort(function (a, b) {
          return a.date < b.date ? 1 : a.date > b.date ? -1 : 0;
        });
        for (i = 0; i < summaries.length; i++) summaries[i].meta = summaries[i].count + " \u6761 \xB7 " + summaries[i].preview;
        p.days = summaries;
        monthPaint(p, 0);
      } catch (x) {
        error(p, x);
      }
    });
  }
  scan();
}
function monthPaint(p, offset) {
  paint(p, p.days.slice(offset, offset + p.slots), offset + p.slots < p.days.length, offset);
}
function refresh(p) {
  if (!p.ready) return;
  if (!p.allowed) {
    var gen = p.listGen;
    p.loading = true;
    _shell["default"].ensure(p, function (e) {
      if (!p.alive || gen !== p.listGen) return;
      if (e) {
        error(p, e);
        return;
      }
      p.allowed = true;
      refresh(p);
    });
    return;
  }
  if (p.kind === 'history') monthFetch(p);else fetch(p, p.offset);
}
function init(p, kind) {
  p.kind = kind;
  p.alive = true;
  p.allowed = false;
  p.listGen = (p.listGen || 0) + 1;
  p.rows = [];
  p.days = [];
  p.offset = 0;
  p.hasMore = false;
  p.hasPrev = false;
  p.empty = false;
  p.busy = false;
  p.message = '';
  var q = _shell["default"].params(p);
  p.today = today();
  p.day = q.day || '';
  p.month = q.month || p.today.slice(0, 7);
  p.filter = kind === 'trash' ? 'trash' : kind === 'day' ? 'day' : kind === 'history' ? 'month' : 'all';
  try {
    if (kind === 'day') validDay(p.day);
    validMonth(p.month);
  } catch (e) {
    p.ready = false;
    p.message = "\u65E5\u671F\u53C2\u6570\u65E0\u6548";
    return;
  }
  p.emptyIcon = kind === 'trash' ? 'restore' : 'book';
  p.emptyPrompt = kind === 'history' ? "\u7A7A\u767D\u4E5F\u6CA1\u5173\u7CFB\u3002" : kind === 'trash' ? "\u8FD9\u91CC\u7684\u5185\u5BB9\u53EF\u4EE5\u6062\u590D\u3002" : '';
  p.headerTitle = kind === 'history' ? "\u6309\u65E5\u56DE\u770B" : kind === 'day' ? p.day.slice(5, 7) + " \u6708 " + p.day.slice(8) + " \u65E5" : kind === 'trash' ? "\u56DE\u6536\u7AD9" : "\u7559\u767D";
  p.sectionTitle = "\u6700\u8FD1\u8BB0\u5F55";
  p.dateLabel = p.today.slice(5).replace('-', ' / ');
  p.emptyText = kind === 'history' ? "\u8FD9\u6708\u8FD8\u6CA1\u6709\u8BB0\u5F55" : kind === 'trash' ? "\u6CA1\u6709\u5220\u6389\u7684\u8BB0\u5F55" : kind === 'day' ? "\u8FD9\u5929\u8FD8\u6CA1\u6709\u8BB0\u5F55" : "\u4ECA\u5929\u60F3\u7559\u4E0B\u4EC0\u4E48\uFF1F";
  p.monthLabel = p.month.replace('-', " \u5E74 ") + " \u6708";
  _shell["default"].init(p, function (info) {
    geometry(p, info, kind);
    var gen = p.listGen;
    p.loading = true;
    _shell["default"].ensure(p, function (e) {
      if (!p.alive || gen !== p.listGen) return;
      if (e) {
        error(p, e);
        return;
      }
      p.allowed = true;
      refresh(p);
    });
  });
}
function next(p) {
  if (p.loading || !p.hasMore) return;
  var at = p.offset + p.slots;
  if (p.kind === 'history') monthPaint(p, at);else fetch(p, at);
}
function prev(p) {
  if (p.loading || !p.hasPrev) return;
  var at = Math.max(0, p.offset - p.slots);
  if (p.kind === 'history') monthPaint(p, at);else fetch(p, at);
}
function toggle(p) {
  p.filter = p.filter === 'pinned' ? 'all' : 'pinned';
  p.offset = 0;
  p.rows = [];
  p.empty = false;
  p.sectionTitle = p.filter === 'pinned' ? "\u7F6E\u9876\u8BB0\u5F55" : "\u6700\u8FD1\u8BB0\u5F55";
  p.emptyText = p.filter === 'pinned' ? "\u8FD8\u6CA1\u6709\u7F6E\u9876\u7684\u8BB0\u5F55" : "\u4ECA\u5929\u60F3\u7559\u4E0B\u4EC0\u4E48\uFF1F";
  fetch(p, 0);
}
function open(p, row) {
  if (p.loading || p.busy || !row || !row.id) return;
  if (p.kind === 'history') {
    _shell["default"].nav(p, 'day', {
      day: row.date,
      month: p.month
    });
    return;
  }
  if (p.kind !== 'trash') {
    _shell["default"].nav(p, 'read', {
      id: row.id
    });
    return;
  }
  p.busy = true;
  var gen = p.listGen;
  _storePage["default"].flag(row.id, {
    deleted: false
  }, function (e) {
    if (!p.alive || gen !== p.listGen) return;
    p.busy = false;
    if (e) {
      error(p, e);
      return;
    }
    _shell["default"].nav(p, 'read', {
      id: row.id,
      notice: 'restored'
    });
  });
}
function month(p, delta) {
  if (p.loading) return;
  p.month = shiftMonth(p.month, delta);
  p.monthLabel = p.month.replace('-', " \u5E74 ") + " \u6708";
  p.offset = 0;
  p.rows = [];
  p.empty = false;
  monthFetch(p);
}
function destroy(p) {
  p.alive = false;
  p.listGen = (p.listGen || 0) + 1;
  p.rows = [];
  p.days = [];
  p.loading = false;
  _shell["default"].clear(p);
}
function swipe(p, e) {
  var d = e && e.direction;
  if (d === 'up') next(p);else if (d === 'down') prev(p);
}
var _default = {
  init: init,
  geometry: geometry,
  refresh: refresh,
  next: next,
  prev: prev,
  toggle: toggle,
  open: open,
  month: month,
  destroy: destroy,
  swipe: swipe,
  validDay: validDay,
  validMonth: validMonth,
  shiftMonth: shiftMonth
};
exports["default"] = _default;

function requireModule(moduleName) {
  return requireNative(moduleName.slice(1));
}


/***/ }),

/***/ 756:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(143);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _utf = _interopRequireDefault(__webpack_require__(703));
var current = null,
  clips = [];
function set(s) {
  current = s;
}
function get() {
  return current;
}
function clear() {
  current = null;
}
function put(s) {
  if (!s) return;
  if (typeof s !== 'string' || !_utf["default"].valid(s) || _utf["default"].bytes(s) > 3072) return false;
  var text = s;
  for (var i = clips.length - 1; i >= 0; i--) if (clips[i] === text) clips.splice(i, 1);
  clips.unshift(text);
  if (clips.length > 8) clips.pop();
  var total = 0;
  for (var j = 0; j < clips.length; j++) total += _utf["default"].bytes(clips[j]);
  while (total > 8192) total -= _utf["default"].bytes(clips.pop());
  return true;
}
function clip(i) {
  return clips[i || 0] || '';
}
function list() {
  var a = [];
  for (var i = 0; i < clips.length; i++) a.push({
    index: i,
    title: clips[i].substring(0, 20),
    bytes: _utf["default"].bytes(clips[i])
  });
  return a;
}
var api = {
  set: set,
  get: get,
  clear: clear,
  clipboardPut: put,
  clipboardGet: clip,
  clipboardList: list,
  clipboardValues: function clipboardValues() {
    return clips.slice();
  }
};
api.bind = function (t) {
  if (!t || t === api) return;
  for (var k in t) if (k !== 'bind') api[k] = t[k];
};
var _default = api;
exports["default"] = _default;

function requireModule(moduleName) {
  return requireNative(moduleName.slice(1));
}


/***/ }),

/***/ 872:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(143);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _storePage = _interopRequireDefault(__webpack_require__(313));
var _session = _interopRequireDefault(__webpack_require__(756));
var _system = _interopRequireDefault(requireModule("@system.device"));
var _system2 = _interopRequireDefault(requireModule("@system.router"));
var _layout = _interopRequireDefault(__webpack_require__(576));
var lastNav = 0;
function app(p) {
  return p.$vm && p.$vm.$app && p.$vm.$app.$def;
}
function params(p) {
  var a = app(p);
  if (a && a.getLiubaiParams) return a.getLiubaiParams() || {};
  return {};
}
function nav(p, page, values) {
  if (Date.now() - lastNav < 200) return;
  lastNav = Date.now();
  var a = app(p);
  if (a && a.setLiubaiParams) a.setLiubaiParams(values || {});
  _system2["default"].replace({
    uri: 'pages/' + page + '/' + page,
    params: values || {}
  });
}
function init(p, cb) {
  p.ready = false;
  p.message = "\u6B63\u5728\u8BFB\u53D6\u8BBE\u5907";
  var token = (p.deviceGen || 0) + 1;
  p.deviceGen = token;
  clearTimeout(p.deviceTimer);
  p.deviceTimer = setTimeout(function () {
    if (p.deviceGen === token && !p.ready) p.message = "\u8BBE\u5907\u4FE1\u606F\u8D85\u65F6\uFF0C\u70B9\u6309\u91CD\u8BD5";
  }, 6000);
  _system["default"].getInfo({
    success: function success(d) {
      if (p.deviceGen !== token) return;
      clearTimeout(p.deviceTimer);
      try {
        if (!_layout["default"].valid(d)) throw new Error('invalid device');
        p.info = d;
        p.w = d.windowWidth;
        p.h = d.windowHeight;
        p.ready = true;
        p.message = '';
        cb(d);
      } catch (e) {
        p.ready = false;
        p.message = "\u8BBE\u5907\u5C3A\u5BF8\u65E0\u6548\uFF0C\u70B9\u6309\u91CD\u8BD5";
      }
    },
    fail: function fail() {
      if (p.deviceGen !== token) return;
      clearTimeout(p.deviceTimer);
      p.message = "\u8BBE\u5907\u4FE1\u606F\u5931\u8D25\uFF0C\u70B9\u6309\u91CD\u8BD5";
    }
  });
}
function focus(p) {
  clearTimeout(p.focusTimer);
  p.focusTimer = setTimeout(function () {
    try {
      var r = p.$refs.crown;
      if (r && r.rotation) r.rotation({
        focus: true
      });
    } catch (e) {}
  }, 70);
}
function clear(p) {
  p.deviceGen = (p.deviceGen || 0) + 1;
  clearTimeout(p.deviceTimer);
  clearTimeout(p.focusTimer);
  try {
    if (p.$refs.crown && p.$refs.crown.rotation) p.$refs.crown.rotation({
      focus: false
    });
  } catch (e) {}
}
function ensure(p, cb) {
  var a = app(p);
  if (a && a.whenLiubaiReady) {
    _storePage["default"].bind(a.getStore());
    _session["default"].bind(a.getSession());
    a.whenLiubaiReady(cb);
  } else cb(new Error('App store readiness unavailable'));
}
var _default = {
  init: init,
  params: params,
  nav: nav,
  focus: focus,
  clear: clear,
  ensure: ensure
};
exports["default"] = _default;

function requireModule(moduleName) {
  return requireNative(moduleName.slice(1));
}


/***/ }),

/***/ 313:
/***/ (function(__unused_webpack_module, exports) {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var target = null;
function bind(t) {
  target = t;
}
function call(name, args) {
  if (!target) {
    var cb = args[args.length - 1];
    if (typeof cb === 'function') cb(new Error('Store unavailable'));
    return;
  }
  return target[name].apply(target, args);
}
var api = {
  bind: bind
};
function method(name) {
  api[name] = function () {
    return call(name, arguments);
  };
}
var names = ['list', 'load', 'save', 'flag', 'draftGet', 'draftPut', 'draftClear', 'settingGet', 'settingPut'];
for (var i = 0; i < names.length; i++) method(names[i]);
var _default = api;
exports["default"] = _default;

function requireModule(moduleName) {
  return requireNative(moduleName.slice(1));
}


/***/ }),

/***/ 703:
/***/ (function(__unused_webpack_module, exports) {

"use strict";


Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
function high(c) {
  return c >= 55296 && c <= 56319;
}
function low(c) {
  return c >= 56320 && c <= 57343;
}
function bound(s, i) {
  i = Math.max(0, Math.min(s.length, Math.floor(Number(i) || 0)));
  if (i > 0 && i < s.length && high(s.charCodeAt(i - 1)) && low(s.charCodeAt(i))) i--;
  return i;
}
function next(s, i) {
  i = bound(s, i);
  if (i >= s.length) return s.length;
  return i + (high(s.charCodeAt(i)) && low(s.charCodeAt(i + 1)) ? 2 : 1);
}
function prev(s, i) {
  i = bound(s, i);
  if (i <= 0) return 0;
  i--;
  if (i > 0 && low(s.charCodeAt(i)) && high(s.charCodeAt(i - 1))) i--;
  return i;
}
function width(s, i) {
  var c = s.charCodeAt(i);
  if (c < 128) return 1;
  if (c < 2048) return 2;
  if (high(c) && low(s.charCodeAt(i + 1))) return 4;
  return 3;
}
function bytes(s) {
  var n = 0,
    i = 0;
  for (; i < s.length; i++) {
    var c = s.charCodeAt(i);
    if (c < 128) n++;else if (c < 2048) n += 2;else if (high(c) && low(s.charCodeAt(i + 1))) {
      n += 4;
      i++;
    } else n += 3;
  }
  return n;
}
function endBytes(s, start, max) {
  var i = bound(s, start),
    used = 0,
    w;
  while (i < s.length) {
    w = width(s, i);
    if (used + w > max) break;
    used += w;
    i += high(s.charCodeAt(i)) && low(s.charCodeAt(i + 1)) ? 2 : 1;
  }
  return i;
}
function sliceBytes(s, max) {
  return s.slice(0, endBytes(s, 0, max));
}
function valid(s) {
  var i, c;
  for (i = 0; i < s.length; i++) {
    c = s.charCodeAt(i);
    if (high(c)) {
      if (!low(s.charCodeAt(i + 1))) return false;
      i++;
    } else if (low(c)) return false;
  }
  return true;
}
var _default = {
  bytes: bytes,
  prev: prev,
  next: next,
  bound: bound,
  sliceBytes: sliceBytes,
  endBytes: endBytes,
  valid: valid
};
exports["default"] = _default;

function requireModule(moduleName) {
  return requireNative(moduleName.slice(1));
}


/***/ }),

/***/ 545:
/***/ (function(__unused_webpack_module, exports, __webpack_require__) {

"use strict";


var _interopRequireDefault = __webpack_require__(143);
Object.defineProperty(exports, "__esModule", ({
  value: true
}));
exports["default"] = void 0;
var _listPage = _interopRequireDefault(__webpack_require__(538));
var _shell = _interopRequireDefault(__webpack_require__(872));
var _default = {
  data: {
    typeW: 0,
    typeH: 0,
    writeW: 0,
    writeH: 0,
    plusSize: 0,
    newPad: 0,
    newGap: 0,
    newRadius: 0,
    rowIcon: 0,
    pinSize: 0,
    pinGap: 0,
    navIcon: 20,
    navGap: 0,
    dockInnerH: 0,
    dockHalfW: 0,
    dockSingleW: 0,
    dockRadius: 0,
    monthFont: 0,
    dayNumFont: 0,
    dayNumW: 0,
    dayNumH: 0,
    dayGap: 0,
    copyGap: 0,
    rowInset: 0,
    emptyY: 0,
    emptyIconSize: 0,
    emptyIconGap: 0,
    emptyTitleFont: 0,
    emptyTitleH: 0,
    emptyTitleGap: 0,
    emptyPromptFont: 0,
    emptyPromptH: 0,
    emptyH: 0,
    emptyX: 0,
    emptyW: 0,
    quietFont: 0,
    quietH: 0,
    emptyIcon: 'book',
    emptyPrompt: '',
    filterFont: 0,
    dateFont: 0,
    ready: false,
    w: 0,
    h: 0,
    message: '',
    rows: [],
    days: [],
    loading: false,
    busy: false,
    empty: false,
    hasMore: false,
    hasPrev: false,
    offset: 0,
    listGen: 0,
    hit: 46,
    hy: 0,
    hx: 0,
    hw: 0,
    contentX: 0,
    contentW: 0,
    listY: 0,
    listH: 0,
    rowH: 0,
    rowPad: 0,
    titleH: 0,
    metaH: 0,
    rowCopyH: 0,
    titleW: 0,
    dayCopyW: 0,
    titleFont: 20,
    metaFont: 13,
    headFont: 20,
    navFont: 16,
    sectionFont: 16,
    headCenterW: 0,
    dockX: 0,
    dockY: 0,
    dockW: 0,
    newY: 0,
    newH: 0,
    sectionY: 0,
    headerTitle: '',
    emptyText: '',
    dateLabel: '',
    sectionTitle: '',
    monthLabel: ''
  },
  onInit: function onInit() {
    _listPage["default"].init(this, 'index');
  },
  onShow: function onShow() {
    _shell["default"].focus(this);
  },
  onHide: function onHide() {
    _listPage["default"].destroy(this);
  },
  onDestroy: function onDestroy() {
    _listPage["default"].destroy(this);
  },
  retry: function retry() {
    if (!this.ready) _listPage["default"].init(this, 'index');else _listPage["default"].refresh(this);
  },
  next: function next() {
    _listPage["default"].next(this);
  },
  prev: function prev() {
    _listPage["default"].prev(this);
  },
  open: function open(row) {
    _listPage["default"].open(this, row);
  },
  onSwipe: function onSwipe(e) {
    _listPage["default"].swipe(this, e);
  },
  onScrollEnd: function onScrollEnd(e) {
    if (e && e.direction === 'bottom') _listPage["default"].next(this);
  },
  home: function home() {
    _shell["default"].nav(this, 'index', {});
  },
  history: function history() {
    _shell["default"].nav(this, 'history', {});
  },
  back: function back() {
    _shell["default"].nav(this, 'index', {});
  },
  toggleFilter: function toggleFilter() {
    _listPage["default"].toggle(this);
  },
  newNote: function newNote() {
    _shell["default"].nav(this, 'edit', {
      action: 'new'
    });
  },
  appMenu: function appMenu() {
    _shell["default"].nav(this, 'menu', {
      mode: 'app'
    });
  }
};
exports["default"] = _default;

function requireModule(moduleName) {
  return requireNative(moduleName.slice(1));
}


/***/ }),

/***/ 143:
/***/ (function(module) {

"use strict";


function _interopRequireDefault(obj) {
  return obj && obj.__esModule ? obj : {
    "default": obj
  };
}
module.exports = _interopRequireDefault, module.exports.__esModule = true, module.exports["default"] = module.exports;

function requireModule(moduleName) {
  return requireNative(moduleName.slice(1));
}


/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(211);
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
//# sourceMappingURL=index.js.map