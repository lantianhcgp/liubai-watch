#!/usr/bin/env python3
"""Source generator for the four native V3 list surfaces. No old application is copied."""
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]/'entry/src/main/js/MainAbility/pages'
CSS='''
.page{width:100%;height:100%;background-color:#060808;}
.surface{background-color:#060808;}
.header{flex-direction:row;align-items:center;justify-content:space-between;}
.head-title,.date{font-family:HYQiHei-65S;color:#f1f0e8;text-align:center;}
.date{color:#adb1a9;}
.hit{align-items:center;justify-content:center;}
.new-note{flex-direction:row;align-items:center;background-color:#e6c78c;}
.section,.month-row{flex-direction:row;align-items:center;justify-content:space-between;}
.section-text{font-family:HYQiHei-65S;color:#adb1a9;}
.filter{font-family:HYQiHei-65S;text-align:center;}
.note-list{background-color:#060808;}
.note-row{align-items:center;justify-content:flex-start;}
.row-copy{flex-direction:column;align-items:flex-start;justify-content:center;}
.title-row{flex-direction:row;align-items:center;}
.row-title{font-family:HYQiHei-65S;color:#f1f0e8;text-overflow:ellipsis;}
.row-meta{font-family:HYQiHei-65S;color:#adb1a9;text-overflow:ellipsis;}
.divider{background-color:#2a2f2e;}
.day-row{flex-direction:row;align-items:center;}
.day-number{font-family:HYQiHei-65S;color:#e6c78c;text-align:center;}
.dock{flex-direction:row;align-items:center;background-color:#171b1b;border-width:1px;border-color:#292e2b;}
.dock-button{flex-direction:row;align-items:center;justify-content:center;}
.dock-label{font-family:HYQiHei-65S;text-align:center;}
.dock-divider{width:1px;background-color:#2c312d;}
.loading{width:100%;height:100%;align-items:center;justify-content:center;}
.message{font-family:HYQiHei-65S;color:#adb1a9;text-align:center;}
.empty{flex-direction:column;align-items:center;justify-content:center;}
.empty-title{font-family:HYQiHei-65S;color:#f1f0e8;text-align:center;}
.empty-hint{font-family:HYQiHei-65S;color:#adb1a9;text-align:center;}
.pager{font-size:12px;color:#adb1a9;text-align:center;}
.crown-sensor{left:0px;top:0px;width:1px;height:1px;opacity:0;}
'''
HEADER='''<div class="header" style="left:{{hx}}px;top:{{hy}}px;width:{{hw}}px;height:{{hit}}px;">HEADER</div>'''
NOTE='''<list class="note-list" style="left:{{contentX}}px;top:{{listY}}px;width:{{contentW}}px;height:{{listH}}px;">
<list-item class="note-row" for="{{(i,r) in rows}}" @click="openRow(r)" style="width:{{contentW}}px;height:{{rowH}}px;">
<stack style="width:{{contentW}}px;height:{{rowH}}px;">
<div class="row-copy" style="left:{{rowPad}}px;top:{{(rowH-titleH-metaH-lineGap)/2}}px;width:{{rowTextW}}px;height:{{titleH+metaH+lineGap}}px;">
<div class="title-row" style="width:{{rowTextW}}px;height:{{titleH}}px;"><image if="{{r.pinned}}" src="/common/ui/pin-gold.png" style="width:{{pinSize}}px;height:{{pinSize}}px;margin-right:{{pinGap}}px;"></image><text class="row-title" style="width:{{rowTextW-(r.pinned?pinSize+pinGap:0)}}px;height:{{titleH}}px;font-size:{{rowFont}}px;">{{r.title}}</text></div>
<text class="row-meta" style="width:{{rowTextW}}px;height:{{metaH}}px;font-size:{{metaFont}}px;margin-top:{{lineGap}}px;">{{r.meta}}</text></div>
<div class="divider" style="left:0px;top:{{rowH-1}}px;width:{{contentW}}px;height:1px;"></div></stack></list-item></list>'''
DAY='''<list class="note-list" style="left:{{contentX}}px;top:{{listY}}px;width:{{contentW}}px;height:{{listH}}px;"><list-item class="day-row" for="{{(i,r) in rows}}" @click="openDay(r)" style="width:{{contentW}}px;height:{{rowH}}px;"><text class="day-number" style="width:{{dayNumberW}}px;height:{{rowH}}px;font-size:{{dayNumberFont}}px;">{{r.number}}</text><div class="row-copy" style="width:{{dayCopyW}}px;height:{{rowH}}px;margin-left:{{10*w/412}}px;"><text class="row-title" style="width:{{dayCopyW}}px;height:{{dayTitleH}}px;font-size:{{dayFont}}px;">{{r.label}}</text><text class="row-meta" style="width:{{dayCopyW}}px;height:{{metaH}}px;font-size:{{metaFont}}px;margin-top:{{lineGap}}px;">{{r.meta}}</text></div><image src="/common/ui/right-muted.png" style="width:{{iconSize}}px;height:{{iconSize}}px;"></image></list-item></list>'''
DOCK='''<div class="dock" style="left:{{dockX}}px;top:{{dockY}}px;width:{{dockW}}px;height:{{hit}}px;border-radius:{{dockRadius}}px;"><div class="dock-button" @click="home" style="width:{{dockButtonW}}px;height:{{hit-2}}px;"><image src="{{homeIcon}}" style="width:20px;height:20px;margin-right:{{dockGap}}px;"></image><text class="dock-label" style="width:{{dockTextW}}px;height:{{dockFont*1.4}}px;font-size:{{dockFont}}px;color:{{homeColor}};">&#x968F;&#x8BB0;</text></div><div class="dock-divider" style="height:{{hit-2}}px;"></div><div class="dock-button" @click="history" style="width:{{dockButtonW}}px;height:{{hit-2}}px;"><image src="{{historyIcon}}" style="width:20px;height:20px;margin-right:{{dockGap}}px;"></image><text class="dock-label" style="width:{{dockTextW}}px;height:{{dockFont*1.4}}px;font-size:{{dockFont}}px;color:{{historyColor}};">&#x56DE;&#x770B;</text></div></div>'''
EMPTY='''<div class="empty" if="{{empty && !error}}" style="left:{{contentX}}px;top:{{emptyY}}px;width:{{contentW}}px;height:{{emptyH}}px;"><text class="empty-title" style="width:{{contentW}}px;height:{{emptyTitleH}}px;font-size:{{emptyFont}}px;">{{emptyTitle}}</text><text class="empty-hint" style="width:{{contentW}}px;height:{{emptyHintH}}px;font-size:{{metaFont}}px;">{{emptyHint}}</text></div><text class="message" if="{{error}}" @click="retry" style="left:{{contentX}}px;top:{{listY}}px;width:{{contentW}}px;height:{{listH}}px;font-size:18px;">{{message}}</text>'''
for mode in ['index','history','day','trash']:
 folder=ROOT/mode;folder.mkdir(parents=True,exist_ok=True)
 imports="import list from '../../common/list-view.js';\nimport context from '../../common/context.js';\n"
 if mode=='index':imports+="import createStore from '../../common/store.js';\nimport File from '@system.file';\n"
 script=imports+"export default {\n data:list.data('"+mode+"'),\n onInit:function(){this.activate();},onShow:function(){this.activate();},onHide:function(){list.stop(this);},onDestroy:function(){this.onHide();this.rows=[];this.daysCache=null;this.store=null;},\n activate:function(){list.activate(this,'"+mode+"'"+(',createStore,File' if mode=='index' else '')+");},\n retry:function(){this.onHide();this.activate();},turn:function(delta){list.turn(this,delta);},\n onSwipe:function(e){if(e.direction==='up'||e.direction==='down')list.turn(this,e.direction==='up'?1:-1);},\n crownChange:function(e){list.crown(this,e);},openRow:function(r){list.openRow(this,r);},\n home:function(){list.route(this,'pages/index/index',{});},history:function(){list.route(this,'pages/history/history',{});},\n back:function(){list.route(this,'"+('pages/history/history' if mode=='day' else 'pages/index/index')+"',"+('{month:this.month}' if mode=='day' else '{}')+");},\n"
 if mode=='index':script+=" newNote:function(){list.newNote(this);},togglePinned:function(){list.toggle(this);},appMenu:function(){list.route(this,'pages/menu/menu',{mode:'app'});},\n"
 if mode=='history':script+=" prevMonth:function(){list.month(this,-1);},nextMonth:function(){list.month(this,1);},openDay:function(r){if(r)list.route(this,'pages/day/day',{day:r.day,month:this.month});},\n"
 script+='};\n';(folder/(mode+'.js')).write_text(script)
 head='<div class="hit" @click="back" style="width:{{hit}}px;height:{{hit}}px;"><image src="/common/ui/back-warm.png" style="width:23px;height:23px;"></image></div><text class="head-title" style="width:{{headTextW}}px;height:{{hit}}px;font-size:{{headFont}}px;">{{heading}}</text>'
 if mode=='index':head='<image src="/common/ui/app-name.png" style="width:{{brandW}}px;height:{{brandH}}px;"></image><text class="date" style="width:{{headDateW}}px;height:{{hit}}px;font-size:{{dateFont}}px;">{{dateText}}</text><div class="hit" @click="appMenu" style="width:{{hit}}px;height:{{hit}}px;"><image src="/common/ui/dots-warm.png" style="width:23px;height:23px;"></image></div>'
 hml='<stack class="page"><div class="loading" if="{{!ready}}" @click="retry"><text class="message" style="width:{{loadW}}px;height:{{loadH}}px;font-size:18px;">{{message}}</text></div><stack class="surface" if="{{ready}}" style="width:{{w}}px;height:{{h}}px;">\n<slider class="crown-sensor" ref="crown" min="0" max="100" value="{{crownValue}}" @change="crownChange"></slider>\n'+HEADER.replace('HEADER',head)
 if mode=='index':hml+='''<div class="new-note" @click="newNote" style="left:{{contentX}}px;top:{{newY}}px;width:{{contentW}}px;height:{{newH}}px;border-radius:{{newRadius}}px;"><image src="/common/ui/plus-ink.png" style="width:{{plusSize}}px;height:{{plusSize}}px;margin-left:{{newPad}}px;"></image><image src="/common/ui/write-note.png" style="width:{{writeW}}px;height:{{writeH}}px;margin-left:{{newGap}}px;"></image></div><div class="section" style="left:{{contentX}}px;top:{{sectionY}}px;width:{{contentW}}px;height:44px;"><text class="section-text" style="width:{{sectionTextW}}px;height:{{sectionFont*1.5}}px;font-size:{{sectionFont}}px;">{{sectionText}}</text><div class="hit" @click="togglePinned" style="width:{{filterW}}px;height:44px;"><text class="filter" style="width:{{filterW}}px;height:{{filterFont*1.5}}px;font-size:{{filterFont}}px;color:{{filterColor}};">&#x7F6E;&#x9876;</text></div></div>'''
 if mode=='history':hml+='''<div class="month-row" style="left:{{contentX}}px;top:{{newY}}px;width:{{contentW}}px;height:{{hit}}px;"><div class="hit" @click="prevMonth" style="width:{{hit}}px;height:{{hit}}px;"><image src="/common/ui/back-warm.png" style="width:23px;height:23px;"></image></div><text class="head-title" style="width:{{monthW}}px;height:{{hit}}px;font-size:{{monthFont}}px;">{{monthText}}</text><div class="hit" @click="nextMonth" style="width:{{hit}}px;height:{{hit}}px;"><image src="/common/ui/right-muted.png" style="width:23px;height:23px;"></image></div></div>'''
 hml+=(DAY if mode=='history' else NOTE)+EMPTY
 hml+='<div class="swipe-plane" @swipe="onSwipe" style="left:0px;top:{{listY}}px;width:0px;height:{{listH}}px;"></div>'
 if mode=='trash':hml+='''<div class="dock" @click="home" style="left:{{dockX}}px;top:{{dockY}}px;width:{{dockW}}px;height:{{hit}}px;border-radius:{{dockRadius}}px;justify-content:center;"><image src="/common/ui/back-warm.png" style="width:23px;height:23px;margin-right:{{dockGap}}px;"></image><text class="dock-label" style="height:{{dockFont*1.4}}px;font-size:{{dockFont}}px;color:#adb1a9;">&#x8FD4;&#x56DE;&#x968F;&#x8BB0;</text></div>'''
 else:hml+=DOCK
 hml+='</stack></stack>\n';hml=hml.replace('<list class="note-list"','<list class="note-list" @swipe="onSwipe"');(folder/(mode+'.hml')).write_text(hml);(folder/(mode+'.css')).write_text(CSS)
print('GENERATED_NATIVE_LIST_PAGES index history day trash')
