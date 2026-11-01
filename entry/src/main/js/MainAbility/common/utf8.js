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
  sliceBytes: sliceBytes, endBytes: endBytes, valid: valid};
