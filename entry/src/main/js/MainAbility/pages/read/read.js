import context from '../../common/context.js';
import geometry from '../../common/geometry.js';
import text from '../../common/text.js';
import life from '../../common/life.js';
import nav from '../../common/nav.js';
import Storage from '@system.storage';
function positionKey(id) { return 'lb2p_'+id; }
export default {
  data:{ready:false,w:0,h:0,round:false,hx:0,hy:0,hw:0,hit:46,top:0,bottom:0,footerY:0,trackX:0,trackW:0,progressW:0,lines:[],id:'',date:'',time:'',counter:'',anchor:0,fontKey:'normal',message:'',swipeY:0,crownValue:50},
  onInit:function(){this.activate();},
  onShow:function(){this.activate();},
  onHide:function(){this.remember();life.stop(this);},
  onDestroy:function(){this.onHide();this.record=null;this.lines=[];this.model=null;},
  activate:function(){var self=this;life.start(this,function(gen){
    var p=context.params(),s=context.state();self.source=p.source||'index';self.day=p.day||'';self.month=p.month||'';self.id=p.id;self.fontKey=s.font;self.anchor=typeof p.anchor==='number'?p.anchor:0;
    if(!s.store){self.message='\u8bb0\u5f55\u4ed3\u672a\u5c31\u7eea';return;}
    s.store.read(self.id,function(err,r){if(!life.alive(self,gen))return;
      if(err||!r){self.message='\u8bb0\u5f55\u8bfb\u53d6\u5931\u8d25\uff0c\u70b9\u6309\u91cd\u8bd5';console.error('LB2 READ fail '+err);return;}
      self.record=r;self.date=r.date.slice(5).split('-').join(' / ');self.time=r.time;
      function render(){if(life.alive(self,gen))self.reflow();}
      if(typeof p.anchor==='number'){render();return;}
      try{Storage.get({key:positionKey(self.id),default:'',success:function(v){if(!life.alive(self,gen))return;try{var saved=JSON.parse(v);if(saved.version===r.version)self.anchor=saved.anchor;}catch(e){}render();},fail:render});}catch(e){render();}
    });
  });},
  retry:function(){life.stop(this);this.activate();},
  reflow:function(){var g=geometry.reader(this.info,this.fontKey);life.apply(this,g);var m=text.paginate(this.record.text,g,this.anchor,false,0);this.model=m;this.lines=m.lines;this.anchor=m.anchor;this.trackW=this.w*.27;this.trackX=(this.w-this.trackW)/2;this.progressW=this.trackW*(m.page+1)/m.count;this.counter=(m.page===m.count-1?'\u5df2\u8bfb\u5b8c \u00b7 ':'')+(m.page+1)+' / '+m.count;this.ready=true;this.message='';life.focus(this,'crown');console.info('LB2 READ id='+this.id+' version='+this.record.version+' anchor='+this.anchor+' page='+m.page+' count='+m.count+' font='+this.fontKey);},
  remember:function(){if(!this.record)return;try{Storage.set({key:positionKey(this.id),value:JSON.stringify({version:this.record.version,anchor:this.anchor}),fail:function(){console.error('LB2 POSITION fail');}});}catch(e){}},
  turn:function(delta){if(!this.ready||!this.model)return;var at=delta>0?this.model.next:this.model.prev;if(at<0)return;this.anchor=at;this.reflow();this.remember();},
  startTouch:function(e){this.swipeY=e.globalY;this.touchX=e.globalX;this.touching=true;},
  endTouch:function(e){if(!this.touching)return;this.touching=false;var dy=e.globalY-this.swipeY,dx=e.globalX-this.touchX;if(Math.abs(dy)>28&&Math.abs(dy)>Math.abs(dx)){this.gestureAt=Date.now();this.turn(dy<0?1:-1);}},
  cancelTouch:function(){this.touching=false;},
  onSwipe:function(e){if(Date.now()-(this.gestureAt||0)<240)return;if(e.direction==='up'||e.direction==='down'){this.gestureAt=Date.now();this.turn(e.direction==='up'?1:-1);}},
  onScroll:function(e){this.turn(e.direction==='bottom'?1:-1);},
  crownChange:function(e){var value=e.value,delta=this.crownValue-value;this.crownValue=value;if(Math.abs(delta)>=1)this.turn(delta>0?1:-1);if(value===0||value===100)this.crownValue=50;}, 
  more:function(){if(!this.ready)return;this.remember();nav('pages/menu/menu',{mode:'read-options',id:this.id,anchor:this.anchor,source:this.source,day:this.day,month:this.month});},
  back:function(){if(!this.ready)return;this.remember();var dest=this.source==='day'?'day':this.source==='trash'?'trash':'index';nav('pages/'+dest+'/'+dest,{day:this.day,month:this.month});}
};
