import shell from '../../common/shell';
import layout from '../../common/layout';
import reader from '../../common/reader';
import store from '../../common/store-page';
function traceRevision(s){var h=0;for(var i=0;i<s.length;i++)h=(h*31+s.charCodeAt(i))|0;return s.length+':'+h;}
export default {
 data:{ready:false,message:'',w:0,h:0,hx:0,hy:0,hw:0,hit:46,lines:[],date:'',time:'',counter:'',progressW:0,trackW:0,trackX:0,footerY:0},
 onInit:function(){var p=this;this.token=1;this.id=shell.params(this).id||'';this.font=shell.params(this).font||'normal';this.anchor=shell.params(this).anchor||0;this.starts=[0];this.index=0;this.text='';shell.init(this,function(info){p.g=layout.reader(info,p.font);p.hx=p.g.hx;p.hy=p.g.hy;p.hw=p.g.hw;p.hit=p.g.hit;p.footerY=p.g.footerY;p.trackW=Math.round(p.w*.27);p.trackX=(p.w-p.trackW)/2;shell.ensure(p,function(initErr){if(initErr){p.message=String(initErr);return;}store.load(p.id,function(e,n){if(p.token!==1)return;if(e){p.message=String(e);return;}p.text=n.body;p.revision=n.revision;p.pinned=n.pinned;p.date=n.date.slice(5,7)+' / '+n.date.slice(8);p.time=n.time;store.settingGet('read-'+p.id,function(err,s){if(p.token!==1)return;if(s&&s.revision===p.revision){if(!shell.params(p).font)p.font=s.font||'normal';if(!shell.params(p).fromStart)p.anchor=s.anchor||0;}p.g=layout.reader(info,p.font);p.total=reader.count(p.text,p.g,{});p.locate();});});});});},
 locate:function(){var target=Math.max(0,Math.min(this.anchor,this.text.length)),s=0,idx=0,pg;this.starts=[0];while(s<=this.text.length){pg=reader.page(this.text,s,this.g,{});if(pg.end>target||pg.end>=this.text.length)break;if(pg.end<=s)break;s=pg.end;idx++;this.starts.push(s);}this.index=idx;this.renderPage(pg);},
 renderPage:function(pg){this.page=pg;this.anchor=pg.start;this.lines=pg.lines;this.counter=(this.index===this.total-1?'\u5df2\u8bfb\u5b8c \u00b7 ':'')+(this.index+1<10?'0':'')+(this.index+1)+' / '+(this.total<10?'0':'')+this.total;this.progressW=Math.round(this.trackW*(this.index+1)/Math.max(1,this.total));shell.focus(this);console.log('LBQA READ '+this.id+' chars='+this.text.length+' anchor='+pg.start+' end='+pg.end+' pages='+this.total+' font='+this.font+' rev='+traceRevision(this.text));},
 turn:function(d){if(!this.page)return;if(d>0){if(this.page.end>=this.text.length)return;var s=this.page.end;this.index++;this.starts[this.index]=s;this.renderPage(reader.page(this.text,s,this.g,{}));}else if(this.index>0){this.index--;this.renderPage(reader.page(this.text,this.starts[this.index],this.g,{}));}this.remember();},
 remember:function(){if(this.id)store.settingPut('read-'+this.id,{revision:this.revision,font:this.font,anchor:this.anchor},function(e){if(e)console.log('LIUBAI read position '+String(e));});},
 onSwipe:function(e){if(e&&e.direction==='up')this.turn(1);else if(e&&e.direction==='down')this.turn(-1);},
 onScroll:function(e){if(e&&e.direction)this.turn(e.direction==='bottom'?1:-1);},
 onRotate:function(e){var v=e&&(e.rotate||e.rotation||e.delta||e);if(typeof v==='number'&&v!==0)this.turn(v>0?1:-1);},
 more:function(){this.remember();shell.nav(this,'menu',{mode:'read',id:this.id,anchor:this.anchor,font:this.font,revision:this.revision,pinned:this.pinned});},
 back:function(){this.remember();shell.nav(this,'index',{});},
 retry:function(){this.onInit();},onShow:function(){if(this.g)shell.focus(this);},onHide:function(){this.remember();shell.clear(this);},onDestroy:function(){this.token=0;shell.clear(this);this.text='';this.lines=[];this.starts=[];},onBackPress:function(){this.back();return true;}
};
