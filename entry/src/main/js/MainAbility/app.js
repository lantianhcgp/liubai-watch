var shared = null;
export default {
  onCreate: function () {
    shared = {store:null,params:{uri:'pages/index/index'},clipboard:[],editor:null,positions:[],font:'normal',revision:0};
    console.info('LB2 APP create');
  },
  getState: function () {
    if (!shared) { throw new Error('APP_CONTEXT_UNAVAILABLE'); }
    return shared;
  },
  onDestroy: function () {
    if (shared && shared.store && shared.store.dispose) { shared.store.dispose(); }
    shared = null;
    console.info('LB2 APP destroy');
  }
};
