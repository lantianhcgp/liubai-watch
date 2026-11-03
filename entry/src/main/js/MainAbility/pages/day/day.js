import list from '../../common/list-view.js';
import context from '../../common/context.js';
export default {
 data:list.data('day'),
 onInit:function(){this.activate();},onShow:function(){this.activate();},onHide:function(){list.stop(this);},onDestroy:function(){this.onHide();this.rows=[];this.daysCache=null;this.store=null;},
 activate:function(){list.activate(this,'day');},
 retry:function(){this.onHide();this.activate();},turn:function(delta){list.turn(this,delta);},
 onSwipe:function(e){if(e.direction==='up'||e.direction==='down')list.turn(this,e.direction==='up'?1:-1);},
 crownChange:function(e){list.crown(this,e);},openRow:function(r){list.openRow(this,r);},
 home:function(){list.route(this,'pages/index/index',{});},history:function(){list.route(this,'pages/history/history',{});},
 back:function(){list.route(this,'pages/history/history',{month:this.month});},
};
