// V3 native geometry: device.getInfo values are mandatory, never a fallback.
function positive(n) { return typeof n === 'number' && isFinite(n) && n > 0; }
function valid(info) {
  if (!info || !positive(info.windowWidth) || !positive(info.windowHeight) ||
      (info.screenShape !== 'rect' && info.screenShape !== 'circle')) {
    throw new Error('Invalid device window');
  }
  return true;
}
function shapeBand(w, h, round, y0, y1, pad) {
  if (!positive(w) || !positive(h) || typeof round !== 'boolean' ||
      typeof y0 !== 'number' || typeof y1 !== 'number' || !isFinite(y0) || !isFinite(y1) ||
      y0 < 0 || y1 < y0 || y1 > h || typeof pad !== 'number' || !isFinite(pad) || pad < 0) {
    throw new Error('Invalid shape band');
  }
  var inset = 0, r, dy, depth;
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
  return { x: x, width: Math.max(0, w - 2 * x) };
}
function home(info) {
  valid(info);
  var w = info.windowWidth, h = info.windowHeight, round = info.screenShape === 'circle';
  var hit = Math.max(46, w * .106), hy = round ? h * .079 : Math.max(20, h * .048);
  var head = shapeBand(w, h, round, hy, hy + hit, 8);
  var dockY = h * (round ? .908 : .838) - hit;
  var dock = shapeBand(w, h, round, dockY, dockY + hit, 12);
  var dockW = Math.min(w * (round ? .56 : .80), dock.width);
  var newY = hy + hit + 4, newH = Math.max(50, Math.min(58, w * .132));
  var sectionY = newY + newH + 2, listY = sectionY + 44, listH = dockY - 7 - listY;
  var slots = Math.floor(listH / (round ? Math.max(50, 49.5 * w / 412) : 58));
  var content = shapeBand(w, h, round, newY, dockY - 7, round ? Math.max(10, w * .026) : Math.max(20, w * .06));
  if (slots < 1 || content.width < 2 * hit || dockW < 2 * hit || head.width < 2 * hit) throw new Error('Home window too small');
  return {w:w,h:h,round:round,hy:hy,hx:head.x,hw:head.width,hit:hit,newY:newY,newH:newH,
    sectionY:sectionY,listY:listY,listH:listH,rowH:listH/slots,slots:slots,
    contentX:content.x,contentW:content.width,dockX:(w-dockW)/2,dockY:dockY,dockW:dockW};
}
function reader(info, fontKey) {
  valid(info);
  if (fontKey === undefined) fontKey = 'normal';
  if (fontKey !== 'compact' && fontKey !== 'normal' && fontKey !== 'large') throw new Error('Invalid font key');
  var w = info.windowWidth, h = info.windowHeight, round = info.screenShape === 'circle';
  var hit = Math.max(46, w * .106), hy = round ? h * .079 : Math.max(20, h * .044);
  var head = shapeBand(w, h, round, hy, hy + hit, 8), top = hy + hit + 7;
  var footerY = h * .918, bottom = footerY - 6;
  var font = fontKey === 'compact' ? Math.max(20, Math.min(24, 22 * w / 412)) :
    fontKey === 'large' ? Math.max(26, Math.min(31, 28 * w / 412)) : Math.max(22, Math.min(27, 24 * w / 412));
  if (bottom - top < font * 1.42 || head.width < 2 * hit) throw new Error('Reader window too small');
  return {w:w,h:h,round:round,hy:hy,hx:head.x,hw:head.width,hit:hit,top:top,bottom:bottom,
    footerY:footerY,font:font,lineHeight:font*1.42,pad:round?Math.max(10,w*.026):Math.max(17,w*.047)};
}
function editor(info, open) {
  valid(info);
  if (typeof open !== 'boolean') throw new Error('Invalid keyboard state');
  var w = info.windowWidth, h = info.windowHeight, round = info.screenShape === 'circle';
  var hit = 46, hy = round ? h * .079 : Math.max(20, h * .044);
  var head = shapeBand(w, h, round, hy, hy + hit, 8);
  var footerBottom = h * (open ? (round ? .906 : .847) : (round ? .89 : .838));
  var footY = footerBottom - 44, keysY = footY - 4 - 141;
  // One native px less gap on rectangular windows meets the rounded V3 body minima.
  var top = hy + hit + 5, bottom = (open ? keysY : footY) - 17;
  var foot = shapeBand(w,h,round,footY,footerBottom,round?10:24);
  var key = shapeBand(w,h,round,keysY,keysY+141,round?8:24);
  var font = Math.max(21, Math.min(24, 22*w/412));
  if (bottom-top < font*1.34 || foot.width < 191 || head.width < 4 * hit || key.width < 44) throw new Error('Editor window too small');
  return {w:w,h:h,round:round,open:open,hit:hit,hy:hy,hx:head.x,hw:head.width,top:top,bottom:bottom,
    footY:footY,footerBottom:footerBottom,footX:foot.x,footW:foot.width,keysY:keysY,keyX:key.x,keyW:key.width,
    font:font,lineHeight:font*1.34,pad:round?Math.max(10,w*.026):Math.max(18,w*.047)};
}
export default {valid:valid,shapeBand:shapeBand,home:home,reader:reader,editor:editor};
