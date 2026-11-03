import Router from '@system.router';
import context from './context.js';
function nav(uri, params) {
  context.setParams(uri,params);
  console.info('LB2 NAV '+uri);
  Router.replace({uri:uri});
}
export default nav;
