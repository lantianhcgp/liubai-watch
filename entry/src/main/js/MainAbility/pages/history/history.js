import list from '../../common/list-view.js';
import context from '../../common/context.js';
export default {
 data:list.data('history'),
 onInit:function(){this.activate();},onShow:function(){this.activate();},onHide:function(){list.stop(this);},onDestroy:function(){this.onHide();this.rows=[];this.daysCache=null;this.store=null;},
 activate:function(){list.activate(this,'history');},
 retry:function(){this.onHide();this.activate();},turn:function(delta){list.turn(this,delta);},
 onSwipe:function(e){if(e.direction==='up'||e.direction==='down')list.turn(this,e.direction==='up'?1:-1);},
 crownChange:function(e){list.crown(this,e);},openRow:function(r){list.openRow(this,r);},
 home:function(){list.route(this,'pages/index/index',{});},history:function(){list.route(this,'pages/history/history',{});},
 back:function(){list.route(this,'pages/index/index',{});},
 prevMonth:function(){list.month(this,-1);},nextMonth:function(){list.month(this,1);},openDay:function(r){if(r)list.route(this,'pages/day/day',{day:r.day,month:this.month});},
};
