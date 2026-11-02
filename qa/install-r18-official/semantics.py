#!/usr/bin/env python3
"""Ordered native acceptance. All app effects must come from real pointer actions.
No evaluated JS, injected storage, route jumps or synthetic product data.
"""
import re

KNOWN_WARNING='[ACELite][ERROR]:current state(2) is invalid when changing ready state to show state.'
TEST_TEXT='a\n1你'+'\na'*12

def revision(text):
 raw=text.encode('utf-16-le',errors='surrogatepass');h=0
 for i in range(0,len(raw),2):h=(h*31+int.from_bytes(raw[i:i+2],'little'))&0xffffffff
 if h>=0x80000000:h-=0x100000000
 return str(len(raw)//2)+':'+str(h)

def match_after(text,pattern,cursor):
 m=re.search(pattern,text[cursor:])
 if not m:return None
 return {'start':cursor+m.start(),'end':cursor+m.end(),'text':m.group(0),'groups':m.groupdict()}

def errors(text):
 fatal=[];ignored=[]
 for line in text.splitlines():
  line=line.strip()
  if line==KNOWN_WARNING:ignored.append(line);continue
  if re.search(r'\[ACELite\]\[ERROR\]|Console Error|Exception backtrace|out.of.memory|\bFATAL\b|file doesn.t exi[st]|Script Error',line,re.I):fatal.append(line)
 return {'fatal':fatal,'ignored':ignored}

def approved(report):
 return all(report.get(k) is True for k in ['ok','orderedSemanticsOk','signedProvenanceOk','visualReviewed'])

def user_plan(geom):
 h,e,r=geom['h'],geom['e'],geom['r'];hit=h['hit'];scale=141/180
 head=[h['hx']+hit/2,h['hy']+hit/2]
 eh=[e['hx']+23,e['hy']+23];er=[e['hx']+e['hw']-23,e['hy']+23]
 rh=[r['hx']+23,r['hy']+23];rr=[r['hx']+r['hw']-23,r['hy']+23]
 hr=[h['hx']+h['hw']-hit/2,h['hy']+hit/2]
 dock_y=h['dockY']+hit/2;left=[h['dockX']+h['dockW']*.25,dock_y];right=[h['dockX']+h['dockW']*.75,dock_y]
 menu_y=h['hy']+hit+8;menu_x=206;menu_w=h.get('contentW',364)
 def key(row,col):return[e['keyX']+(col*57+row*29+28.5)*scale,e['keysY']+(row*60+30)*scale]
 mode=[e['footX']+22,e['footY']+22];delete=[e['footX']+44+54+22,e['footY']+22];enter=[e['footX']+44+54+44+22,e['footY']+22]
 candidate=[max(e['keyX']+12,36)+22,e['keysY']-15+6]
 opened=[206,h['dockY']+hit-22]
 toggle=[e['footX']+44+54+44+44+max(20,(e.get('footW',364)-186)/2),e['footY']+22]
 row=[206,h['listY']+h['rowH']/2]
 history_row=[206,h['newY']+hit+9+65/2];day_row=[206,h['hy']+hit+8+3+30]
 opts=menu_y+48+8
 rev=re.escape(revision(TEST_TEXT));chars=len(TEST_TEXT);byte_count=len(TEST_TEXT.encode())
 events=[]
 def add(name,point=None,expect=None,hold=.09,timeout=30,check=None):
  ev={'name':name,'expect':expect,'timeout':timeout}
  if point is not None:ev['point']=[round(v) for v in point];ev['hold']=hold
  if check:ev['check']=check
  events.append(ev)
 def edit(n,type_=1,py=0):return r'LBQA EDIT chars='+str(n)+r' type='+str(type_)+r' py='+str(py)+r' candidates=\d+ open=true'
 read=r'LBQA READ {id} chars='+str(chars)+r' anchor=0 end=\d+ pages=(?P<pages>\d+) font=\w+ rev='+rev
 any_read=r'LBQA READ {id} chars='+str(chars)+r' anchor=\d+ end=\d+ pages=\d+ font=\w+ rev='+rev
 add('cold',expect=r'LBQA LIST index rows=0 offset=0',timeout=40)
 add('new',[206,h['newY']+h['newH']/2],r'LBQA EDIT chars=0 type=0 py=0 candidates=\d+ open=false')
 add('keyboard-open',opened,r'LBQA OPEN true')
 add('key-mode',mode,edit(0,1))
 add('key-a',key(1,0),edit(1))
 add('key-a-repeat',key(1,0),edit(2))
 add('backspace',delete,edit(1))
 add('newline',enter,edit(2))
 add('key-long-q',key(0,0),edit(3),hold=1.15)
 add('keyboard-close',toggle,r'LBQA OPEN false')
 add('keyboard-reopen',opened,r'LBQA OPEN true')
 add('type-upper',mode,edit(3,2))
 add('type-numeric',mode,edit(3,3))
 add('type-chinese',mode,edit(3,0))
 add('key-n',key(2,5),r'LBQA EDIT chars=3 type=0 py=1 candidates=[1-9]\d* open=true',timeout=15)
 add('key-i',key(0,7),r'LBQA EDIT chars=3 type=0 py=2 candidates=[1-9]\d* open=true',timeout=15)
 add('candidate',candidate,edit(4,0))
 add('multiline-english',mode,edit(4,1))
 for i in range(12):
  add('multiline-break-'+str(i+1),enter,edit(5+i*2,1))
  add('multiline-letter-'+str(i+1),key(1,0),edit(6+i*2,1))
 add('tools',[e['hx']+e['hw']-69,e['hy']+23],r'LBQA MENU tool rows=\d+ id= y=')
 add('tools-back',head,edit(chars,1))
 add('save',er,r'LBQA SAVED (?P<id>[A-Za-z0-9_-]+) chars='+str(chars)+r' bytes='+str(byte_count)+r' rev='+rev,timeout=60)
 add('saved-read',expect=read,timeout=40,check='multipage')
 add('read-next',[300,200],r'LBQA READ {id} chars='+str(chars)+r' anchor=[1-9]\d* end=\d+ pages=\d+ font=\w+ rev='+rev)
 add('read-prev',[70,200],read)
 add('read-menu',rr,r'LBQA MENU read rows=3 id={id} ')
 add('font-large',[h.get('contentX',24)+menu_w*5/6,menu_y+22],r'LBQA FONT large id={id} anchor=0',timeout=30)
 add('font-back',head,r'LBQA READ {id} chars='+str(chars)+r' anchor=0 end=\d+ pages=\d+ font=large rev='+rev)
 add('read-back',rh,r'LBQA LIST index rows=1 offset=0')
 add('index-open',row,any_read)
 add('index-open-back',rh,r'LBQA LIST index rows=1 offset=0')
 add('history',right,r'LBQA LIST history rows=1 offset=0 more=false month=(?P<month>\d{4}-\d{2})')
 add('previous-month',[h['hx']+23,h['newY']+23],r'LBQA LIST history rows=0 offset=0 more=false month=\d{4}-\d{2}')
 add('current-month',[h['hx']+h['hw']-23,h['newY']+23],r'LBQA LIST history rows=1 offset=0 more=false month={month}')
 add('day',history_row,r'LBQA LIST day rows=1 offset=0 more=false month={month} day=(?P<day>\d{4}-\d{2}-\d{2})')
 add('day-open',day_row,any_read)
 add('delete-menu',rr,r'LBQA MENU read rows=3 id={id} ')
 add('record',[menu_x,opts+2*50+25],r'LBQA MENU record rows=3 id={id} ')
 add('delete-confirm',[menu_x,menu_y+2*74+37],r'LBQA MENU confirm rows=0 id={id} ')
 add('delete-keep',left,any_read)
 add('delete-menu-again',rr,r'LBQA MENU read rows=3 id={id} ')
 add('record-again',[menu_x,opts+2*50+25],r'LBQA MENU record rows=3 id={id} ')
 add('delete-confirm-again',[menu_x,menu_y+2*74+37],r'LBQA MENU confirm rows=0 id={id} ')
 add('delete-commit',right,r'LBQA LIST index rows=0 offset=0',timeout=60)
 add('app-menu',hr,r'LBQA MENU app rows=1 id= y=')
 add('trash',[menu_x,menu_y+37],r'LBQA LIST trash rows=1 offset=0')
 add('restore',day_row,read,timeout=60)
 add('restore-home',rh,r'LBQA LIST index rows=1 offset=0')
 add('reopen',row,any_read)
 add('reopen-home',rh,r'LBQA LIST index rows=1 offset=0')
 return events
