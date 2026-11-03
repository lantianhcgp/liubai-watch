import list from '../../common/list-view.js';
import context from '../../common/context.js';
import createStore from '../../common/store.js';
import File from '@system.file';
export default {
 data:list.data('index'),
 onInit:function(){this.activate();},onShow:function(){this.activate();},onHide:function(){list.stop(this);},onDestroy:function(){this.onHide();this.rows=[];this.daysCache=null;this.store=null;},
 activate:function(){list.activate(this,'index',createStore,File);},
 retry:function(){this.onHide();this.activate();},turn:function(delta){list.turn(this,delta);},
 onSwipe:function(e){if(e.direction==='up'||e.direction==='down')list.turn(this,e.direction==='up'?1:-1);},
 crownChange:function(e){list.crown(this,e);},openRow:function(r){list.openRow(this,r);},
 home:function(){list.route(this,'pages/index/index',{});},history:function(){list.route(this,'pages/history/history',{});},
 back:function(){list.route(this,'pages/index/index',{});},
 newNote:function(){list.newNote(this);},togglePinned:function(){list.toggle(this);},appMenu:function(){list.route(this,'pages/menu/menu',{mode:'app'});},
};
