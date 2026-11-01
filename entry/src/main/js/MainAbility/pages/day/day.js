import list from '../../common/list-page';
import shell from '../../common/shell';
export default {
 data:{typeW:0,typeH:0,writeW:0,writeH:0,plusSize:0,newPad:0,newGap:0,newRadius:0,rowIcon:0,pinSize:0,pinGap:0,navIcon:20,navGap:0,dockInnerH:0,dockHalfW:0,dockSingleW:0,dockRadius:0,monthFont:0,dayNumFont:0,dayNumW:0,dayNumH:0,dayGap:0,copyGap:0,rowInset:0,emptyY:0,emptyIconSize:0,emptyIconGap:0,emptyTitleFont:0,emptyTitleH:0,emptyTitleGap:0,emptyPromptFont:0,emptyPromptH:0,emptyH:0,emptyX:0,emptyW:0,quietFont:0,quietH:0,emptyIcon:'book',emptyPrompt:'',filterFont:0,dateFont:0,ready:false,w:0,h:0,message:'',rows:[],days:[],loading:false,busy:false,empty:false,hasMore:false,hasPrev:false,offset:0,listGen:0,hit:46,hy:0,hx:0,hw:0,contentX:0,contentW:0,listY:0,listH:0,rowH:0,rowPad:0,titleH:0,metaH:0,rowCopyH:0,titleW:0,dayCopyW:0,titleFont:20,metaFont:13,headFont:20,navFont:16,sectionFont:16,headCenterW:0,dockX:0,dockY:0,dockW:0,newY:0,newH:0,sectionY:0,headerTitle:'',emptyText:'',dateLabel:'',sectionTitle:'',monthLabel:''},
 onInit:function(){list.init(this,'day');},
 onShow:function(){shell.focus(this);},
 onHide:function(){list.destroy(this);},
 onDestroy:function(){list.destroy(this);},
 retry:function(){if(!this.ready)list.init(this,'day');else list.refresh(this);},
 next:function(){list.next(this);},prev:function(){list.prev(this);},
 open:function(row){list.open(this,row);},onSwipe:function(e){list.swipe(this,e);},
 onScrollEnd:function(e){if(e&&e.direction==='bottom')list.next(this);},
 home:function(){shell.nav(this,'index',{});},history:function(){shell.nav(this,'history',{});},
 back:function(){shell.nav(this,'history',{month:this.month});},
};
