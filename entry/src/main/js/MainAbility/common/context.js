function state() {
  var a = typeof $app !== 'undefined' && $app ? ($app.$def || $app) : null;
  if (!a || typeof a.getState !== 'function') { throw new Error('APP_CONTEXT_UNAVAILABLE'); }
  return a.getState();
}
function setParams(uri, values) {
  var p = {uri:uri}, k;
  if (values) { for (k in values) { if (Object.prototype.hasOwnProperty.call(values,k)) { p[k] = values[k]; } } }
  state().params = p;
  return p;
}
function params() { return state().params; }
export default {state:state,setParams:setParams,params:params};
