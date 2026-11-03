/* Geometry transcribed from the approved design-only V3 HTML, not R18.
 * All coordinates are measured window pixels; a failed device query is not a screen.
 */
function number(value) {
  return typeof value === 'number' && isFinite(value);
}
function dimensions(w, h) {
  return number(w) && number(h) && w > 0 && h > 0;
}
function valid(info) {
  return !!info && dimensions(info.windowWidth, info.windowHeight) &&
    (info.screenShape === 'rect' || info.screenShape === 'circle');
}
function requireInfo(info) {
  if (!valid(info)) throw new Error('Invalid device window dimensions or screen shape');
}
function band(w, h, round, y0, y1, pad) {
  if (pad === undefined) pad = 10;
  if (!dimensions(w, h) || (round !== true && round !== false) ||
      !number(y0) || !number(y1) || y1 < y0 || !number(pad) || pad < 0) {
    throw new Error('Invalid screen dimensions or line band');
  }
  var radius;
  var inset = 0;
  var depth;
  if (round) {
    radius = Math.min(w, h) / 2;
    depth = Math.max(Math.abs(y0 - h / 2), Math.abs(y1 - h / 2));
    inset = w / 2 - Math.sqrt(Math.max(0, radius * radius - depth * depth));
  } else {
    radius = Math.min(w * 0.25, h * 0.25);
    depth = Math.max(0, Math.min(y0, h - y1));
    if (depth < radius) {
      inset = radius - Math.sqrt(Math.max(0, radius * radius - (radius - depth) * (radius - depth)));
    }
  }
  var x = Math.max(pad, inset + pad);
  return { x: x, width: Math.max(0, w - 2 * x) };
}
function home(info) {
  requireInfo(info);
  var w = info.windowWidth;
  var h = info.windowHeight;
  var round = info.screenShape === 'circle';
  var hit = Math.max(46, w * 0.106);
  var hy = round ? h * 0.079 : Math.max(20, h * 0.048);
  var header = band(w, h, round, hy, hy + hit, 8);
  var dockY = h * (round ? 0.908 : 0.838) - hit;
  var dock = band(w, h, round, dockY, dockY + hit, 12);
  var dockW = Math.min(w * (round ? 0.56 : 0.80), dock.width);
  var newY = hy + hit + 4;
  var newH = Math.max(50, Math.min(58, w * 0.132));
  var sectionY = newY + newH + 2;
  var listY = sectionY + 44;
  var listBottom = dockY - 7;
  var available = listBottom - listY;
  if (available <= 0) throw new Error('Device window has no complete home rows');
  var slots = Math.max(2, Math.floor(available / (round ? Math.max(50, 49.5 * w / 412) : 58)));
  var content = band(w, h, round, newY, listBottom, round ? Math.max(10, w * 0.026) : Math.max(20, w * 0.06));
  var historyY = newY + hit + 9;
  return {
    w: w, h: h, round: round, hy: hy, hx: header.x, hw: header.width, hit: hit,
    newY: newY, newH: newH, sectionY: sectionY, listY: listY,
    listH: Math.max(48, available), rowH: available / slots, slots: slots,
    contentX: content.x, contentW: content.width,
    dockX: (w - dockW) / 2, dockY: dockY, dockW: dockW,
    historyY: historyY, historyH: Math.max(60, dockY - historyY - 8)
  };
}
function reader(info, size) {
  requireInfo(info);
  var w = info.windowWidth;
  var h = info.windowHeight;
  var round = info.screenShape === 'circle';
  var hit = Math.max(46, w * 0.106);
  var hy = round ? h * 0.079 : Math.max(20, h * 0.044);
  var header = band(w, h, round, hy, hy + hit, 8);
  var font;
  if (size === 'compact') font = Math.max(20, Math.min(24, 22 * w / 412));
  else if (size === 'large') font = Math.max(26, Math.min(31, 28 * w / 412));
  else font = Math.max(22, Math.min(27, 24 * w / 412));
  var footerY = h * 0.918;
  return {
    w: w, h: h, round: round, hy: hy, hx: header.x, hw: header.width, hit: hit,
    top: hy + hit + 7, bottom: footerY - 6, footerY: footerY,
    font: font, lineHeight: font * 1.42,
    pad: round ? Math.max(10, w * 0.026) : Math.max(17, w * 0.047)
  };
}
function editor(info, open) {
  requireInfo(info);
  var w = info.windowWidth;
  var h = info.windowHeight;
  var round = info.screenShape === 'circle';
  open = open === true;
  var hit = 46;
  var hy = round ? h * 0.079 : Math.max(20, h * 0.044);
  var header = band(w, h, round, hy, hy + hit, 8);
  var footerBottom = open ? h * (round ? 0.906 : 0.847) : h * (round ? 0.89 : 0.838);
  var footY = footerBottom - 44;
  var keysY = footY - 4 - 141;
  var foot = band(w, h, round, footY, footerBottom, round ? 10 : 24);
  var key = band(w, h, round, keysY, keysY + 141, round ? 8 : 24);
  var font = Math.max(21, Math.min(24, 22 * w / 412));
  return {
    w: w, h: h, round: round, open: open, hy: hy, hx: header.x, hw: header.width, hit: hit,
    top: hy + hit + 6, bottom: (open ? keysY : footY) - 17,
    footY: footY, footerBottom: footerBottom, footX: foot.x, footW: foot.width,
    keysY: keysY, keyX: key.x, keyW: key.width, font: font, lineHeight: font * 1.34,
    pad: round ? Math.max(10, w * 0.026) : Math.max(18, w * 0.047)
  };
}
export default { valid: valid, band: band, home: home, reader: reader, editor: editor };
