// UTF-16 offsets; never split a surrogate pair. No Node/TypedArray runtime.
function high(c) { return c >= 55296 && c <= 56319; }
function low(c) { return c >= 56320 && c <= 57343; }
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
  var n = 0, i = 0;
  for (; i < s.length; i++) { var c=s.charCodeAt(i);if(c<128)n++;else if(c<2048)n+=2;else if(high(c)&&low(s.charCodeAt(i+1))){n+=4;i++;}else n+=3; }
  return n;
}
function endBytes(s, start, max) {
  var i = bound(s, start), used = 0, w;
  while (i < s.length) {
    w = width(s, i);
    if (used + w > max) break;
    used += w; i += high(s.charCodeAt(i))&&low(s.charCodeAt(i+1))?2:1;
  }
  return i;
}
function sliceBytes(s, max) { return s.slice(0, endBytes(s, 0, max)); }
// ECMAScript WhiteSpace + LineTerminator (not Unicode White_Space).
function whitespace(c) {
  return (c >= 9 && c <= 13) || c === 32 || c === 160 || c === 5760 ||
    (c >= 8192 && c <= 8202) || c === 8232 || c === 8233 || c === 8239 ||
    c === 8287 || c === 12288 || c === 65279;
}
function hasText(s) {
  for (var i = 0; i < s.length; i++) if (!whitespace(s.charCodeAt(i))) return true;
  return false;
}
function trimWhitespace(s) {
  var start = 0, end = s.length;
  while (start < end && whitespace(s.charCodeAt(start))) start++;
  while (end > start && whitespace(s.charCodeAt(end - 1))) end--;
  return s.slice(start, end);
}
function compactWhitespace(s) {
  var out = '', i = 0, end = s.length, start;
  while (i < end && whitespace(s.charCodeAt(i))) i++;
  start = i;
  while (i < end) {
    if (!whitespace(s.charCodeAt(i))) { i++; continue; }
    out += s.slice(start, i);
    while (i < end && whitespace(s.charCodeAt(i))) i++;
    if (i < end) out += ' ';
    start = i;
  }
  return out + s.slice(start, end);
}
function valid(s) {
  var i, c;
  for (i = 0; i < s.length; i++) {
    c = s.charCodeAt(i);
    if (high(c)) { if (!low(s.charCodeAt(i + 1))) return false; i++; }
    else if (low(c)) return false;
  }
  return true;
}
export default {bytes: bytes, prev: prev, next: next, bound: bound,
  sliceBytes: sliceBytes, endBytes: endBytes, valid: valid,
  hasText: hasText, trimWhitespace: trimWhitespace, compactWhitespace: compactWhitespace};
