import Store from '../../common/store';
import Router from '@system.router';
// Own the storage engine on the bootstrap page to keep app.js small.
// ACE exposes the application as global $app, not this.$vm.$app.$def.
export default {
  data: { attached: false, message: '\u6b63\u5728\u6253\u5f00\u7559\u767d' },
  onInit: function () {
    var def = typeof $app !== 'undefined' && $app ? ($app.$def || $app) : null;
    this.attached = false;
    if (!def || typeof def.attachStore !== 'function') {
      this.message = '\u5e94\u7528\u521d\u59cb\u5316\u5931\u8d25';
      return;
    }
    try {
      def.attachStore(Store);
      if (def.setLiubaiParams) def.setLiubaiParams({});
      this.attached = true;
    } catch (e) {
      this.message = '\u5b58\u50a8\u521d\u59cb\u5316\u5931\u8d25';
    }
  },
  onReady: function () {
    if (this.attached) Router.replace({ uri: 'pages/index/index', params: {} });
  }
};
