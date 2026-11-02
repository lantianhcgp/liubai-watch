#!/usr/bin/env python3
"""Logging-only instrumentation of a copied compiler bundle. No state/API substitution."""
from pathlib import Path

def once(text,old,new):
 assert text.count(old)==1,'Diagnostic anchor count '+str(text.count(old))+': '+old[:90]
 return text.replace(old,new,1)

def instrument(data,page):
 text=data.decode()
 # Preserve the native evaluated completion value; never return the log's value.
 text=once(text,'module.exports=new ViewModel(options);','''
var __lbRender=options.render;
options.render=function(){console.info("LB18 render PAGE ready="+this.ready+" mode="+this.mode+" rows="+(this.displayRows?this.displayRows.length:-1)+" listH="+this.listH+" w="+this.w);return __lbRender.apply(this,arguments);};
var __lbInit=options.onInit;
options.onInit=function(){console.info("LB18 init PAGE before");var result=__lbInit.apply(this,arguments);console.info("LB18 init PAGE after ready="+this.ready+" mode="+this.mode);return result;};
module.exports=new ViewModel(options);
'''.replace('PAGE',page))
 if page=='edit':
  for name,call in [('startKey','touchStart'),('moveKey','touchMove'),('endKey','touchEnd'),('longKey','longPress')]:
   old='  '+name+': function '+name+'(e) {\n    if (this.kb) this.kb.'+call+'(e, this.g);\n  },'
   new='  '+name+': function '+name+'(e) {\n    console.info("LB18 '+name+' event "+JSON.stringify(e));\n    console.info("LB18 '+name+' g "+JSON.stringify(this.g));\n    if (this.kb) {var result=this.kb.'+call+'(e,this.g);console.info("LB18 '+name+' result="+result+" len="+this.kb.snapshot().text.length);}\n  },'
   text=once(text,old,new)
  text=once(text,'  changed: function changed(n) {','  changed: function changed(n) {\n    console.info("LB18 changed len="+n.text.length+" type="+n.type+" pinyin="+n.pinyin);')
  text=once(text,'  save: function save() {','  save: function save() {\n    console.info("LB18 save len="+this.text.length+" ready="+this.ready);')
 if page=='menu':
  text=once(text,'  paint: function paint() {','  paint: function paint() {\n    console.info("LB18 menu.paint.before mode="+this.mode+" empty="+this.empty+" rows="+this.rows.length+" display="+this.displayRows.length+" h="+this.listH);')
  text=once(text,'    this.visibleRows = this.displayRows;','    this.visibleRows = this.displayRows;\n    console.info("LB18 menu.paint.after rows="+this.rows.length+" display="+this.displayRows.length+" h="+this.listH+" rowH="+this.rowH);')
 return text.encode()
