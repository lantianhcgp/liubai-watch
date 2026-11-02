import Store from '../../common/store';
import Router from '@system.router';
// Bootstrap page: the FIT3 installer budgets app.js together with each page
// js against 48 KB, so the storage engine must not live in app.js. It is
// loaded here (first page), published to the application, then the app is
// handed straight to the home page. No UI of its own beyond the backdrop.
export default {
  onInit: function () {
    var def = this.$vm && this.$vm.$app && this.$vm.$app.$def;
    if (def && def.attachStore) def.attachStore(Store);
    if (def && def.setLiubaiParams) def.setLiubaiParams({});
    Router.replace({ uri: 'pages/index/index', params: {} });
  }
};
