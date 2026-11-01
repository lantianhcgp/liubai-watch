"""Create a self-contained delivery only from verified final .app evidence."""
from pathlib import Path
import hashlib,json,zipfile,io,shutil,re,html
from PIL import Image,ImageDraw,ImageFont
REPO=Path(__file__).resolve().parent.parent
ROOT=Path('/storage/emulated/0/Documents/liubai-watch-delivery/ui-restoration')
DEST=Path('/storage/emulated/0/Documents/liubai-watch-delivery/final-v3-359bd3d')
APP=Path((REPO/'qa/.parity-artifact-path').read_text().strip())
SHA=hashlib.sha256(APP.read_bytes()).hexdigest()
EXPECTED='96702166d0c15e0b6f3f4f44607193c6ad93a4fe7c36ed9a764cb6bb991a3523'
assert SHA==EXPECTED
v=json.loads((ROOT/'final-matrix/verified.json').read_text())
f=json.loads((ROOT/'functional/functional-result.json').read_text())
r=json.loads((ROOT/'resource-parity.json').read_text())
t=json.loads((ROOT/'test-logs/results.json').read_text())
m=json.loads((ROOT/'final-matrix/evidence-manifest.json').read_text())
pixel=json.loads((ROOT/'final-matrix/reviewed-pixel-comparison.json').read_text())
review=json.loads((ROOT/'final-matrix/visual-review.json').read_text())
assert review['artifactSha']==SHA and review['totalReviewedStates']==104 and not review['newMissingComponentOrTextClippingFound']
assert v['artifactSha']==f['artifactSha']==r['artifactSha']==m['artifactSha']==pixel['artifactSha']==SHA
assert v['totalPairs']==104 and all(x==26 for x in v['perWindow'].values())
assert f['status']==r['status']==t['status']=='PASS'
assert all(c['exit_code']==0 for c in t['commands'])
DEST.mkdir(parents=True,exist_ok=True)
def copy(src,dst):
 dst.parent.mkdir(parents=True,exist_ok=True)
 if dst.exists() and dst.read_bytes()!=src.read_bytes():
  backup=DEST/'.previous'
  backup.mkdir(exist_ok=True)
  dst.rename(backup/(dst.name+'.'+hashlib.sha256(dst.read_bytes()).hexdigest()[:12]))
 shutil.copy2(src,dst)
 assert hashlib.sha256(src.read_bytes()).digest()==hashlib.sha256(dst.read_bytes()).digest()
copy(APP,DEST/'liubai-v0.1.0-v3-unsigned.app')
for key in ['functional','test-logs']:
 for src in (ROOT/key).iterdir():
  if src.is_file() and not src.name.startswith('FAIL'):copy(src,DEST/key/src.name)
for name in ['resource-parity.json','signing-status.json','empty-assets.json','fixture-readback.json','gallery-verification.json','gallery-preview.png']:
 copy(ROOT/name,DEST/'evidence'/name)
for name in ['verified.json','evidence-manifest.json','reviewed-pixel-comparison.json','geometry-all.json','visual-review.json']:
 copy(ROOT/'final-matrix'/name,DEST/'evidence'/name)
copy(REPO/'qa/hmlwsim-host.patch',DEST/'evidence/hmlwsim-host.patch')
for record in m['pairs']:
 for name in [record['pair'],*record['componentCrops']]:
  src=Path(name);copy(src,DEST/'visual'/src.parent.name/src.name)
 # Original frames remain inspectable, not only composited evidence.
 stem=record['window']+'-'+record['scene']
 for role in ['actual','approved']:
  copy(ROOT/'final-matrix'/(stem+'-'+role+'.png'),DEST/'visual/originals'/(stem+'-'+role+'.png'))
outer=zipfile.ZipFile(APP);hap=zipfile.ZipFile(io.BytesIO(outer.read('entry-default.hap')))
config=json.loads(hap.read('config.json'))
pagebytes={p:len(hap.read(p)) for p in hap.namelist() if re.search(r'/pages/[^/]+/[^/]+\.js$',p)}
assert len(pagebytes)==7 and max(pagebytes.values())<49152
app_tests=next(c for c in t['commands'] if c['name']=='app-tests')
host_tests=next(c for c in t['commands'] if c['name']=='host-negative-tests')
summary={'uiSourceCommit':'359bd3df0109c9bcc1100ed2eff49333c95fdc43','ciRun':41345098484,'ciConclusion':'success','appSha256':SHA,'appBytes':APP.stat().st_size,'signed':False,'version':config['app']['version'],'bundle':config['app']['bundleName'],'pageCompiledBytes':pagebytes,'nodeTests':app_tests['pass'],'hostNegativeTests':host_tests['pass'],'realInteractionChecks':len(f['checks']),'visualPairs':v['totalPairs'],'perWindow':v['perWindow'],'sourceImagePixelMismatches':r['pixelMismatchCount'],'decodedImageBytesAllResources':r['totalDecodedRgbaBytes'],'reviewedUnchangedFrames':pixel['unchangedStates'],'changedFramesReviewedSeparately':pixel['changedStates'],'limitations':['Unsigned .app: new Liubai p7b not acquired; AGC HTTP 401','hmlwsim V8 is not JerryScript heap or a physical device renderer','Host font alias is not a real-device font guarantee','No physical device file/rotation/image-release/power validation']}
(DEST/'delivery-summary.json').write_text(json.dumps(summary,ensure_ascii=False,indent=2))
body=f'''# 留白最终 V3 原生 UI 还原交付

本轮原生 UI 实现与仿真验收已完成。唯一视觉基线为批准后的最终 V3；没有重做设计，也没有把整屏稿图当成应用界面。

## 打开哪里

- `对照图.html`：四窗口 104 组可浏览的同状态左右对照，左侧实际 .app，右侧批准稿。
- `留白-V3-关键界面对照.png`：首页、阅读、编辑、候选、空态与失败页概览。
- `liubai-v0.1.0-v3-unsigned.app`：真实 HarmonyOS 构建包，尚未签名，不能直接据此声称可装表。
- `visual/component-crops/`：标题、正文及操作区 2× 放大证据。
- `functional/`、`test-logs/`、`evidence/`：实际运行结果、原始截图与宿主补丁。

## 本次修复

- 品牌与主操作的字形/字重、三点菜单、图标与真实分割线、底栏中线、内外圆角。
- 正文优先的编辑状态、收起/展开、紧凑段落空行、原螃蟹键盘及真实中文候选。
- 候选条深灰底色、圆角和候选间距；没有重画键盘图集。
- 回看、当天、回收站、恢复图标、完整空态主副说明。
- 阅读三档字号/原文锚点、工具菜单、非空剪切板、退出/删除确认、保存中及独立保存失败页。

## 实测结果

- 真实 CLT CI：success，7 个页面均低于 49152 字节；最大页面 {max(pagebytes.values())} 字节。
- Node 回归：{app_tests['pass']} 项通过；宿主反例测试：{host_tests['pass']} 项通过。
- 实际 .app 经 hmlwsim 原生文件导入器解析：{len(f['checks'])} 项真实指针/点击/表冠滚轮及磁盘回调检查通过。
- 四窗口：412×484 方屏、454×454 圆屏、390×390 圆屏、336×480 窄方屏；每窗口 26 个状态，共 {v['totalPairs']} 组。
- 包内 {r['images']} 张 PNG 与源素材逐像素一致，原键盘保留。全部素材解码 RGBA 合计 {r['totalDecodedRgbaBytes']} 字节；这不是运行时峰值测量。
- 每组身份、状态集合、解码尺寸、可见控件、候选/保存/故障状态与视觉检查证据均已核对。像素门禁不替代逐组件目检。

## 可核验证据

源码：359bd3df0109c9bcc1100ed2eff49333c95fdc43

CI：https://github.com/lantianhcgp/liubai-watch/actions/runs/41345098484

`.app` SHA-256：{SHA}

版本：0.1.0 / code 1；bundle：com.hcbiu.liubai；文件大小：{APP.stat().st_size} 字节。

## 尚未完成与保留差异

AGC 的本地凭据、Cookie/CSRF 与团队信息仍已持久化，但当前项目接口返回 HTTP 401；留白的新 p7b 尚未取得。因此没有生成签名 HAP、没有借用现役应用身份，也没有宣称已装到手表。

hmlwsim 属于 V8 仿真，不能证明目标真机的 JerryScript 低堆、原生文件偏移/断电恢复、物理表冠、图片释放或功耗。HYQiHei 在宿主缺失，以记录的 Noto Sans CJK SC 别名作对照；动态文本字重/字面宽与真实设备仍可能不同。因此结论是按 V3 尽可能忠实还原并完成上述仿真验收，不是“真机逐像素 100% 相同”。

原稿机壳描边、实时日期、原键盘为真实点按而发生的横向开窗，以及网页演示提示替换为实际本地应用提示，均已作为有意差异记录。没有硬编码示例日期或删减正文来制造视觉通过。

本次工作留在独立目录和 `feat/ui-parity-v3` 分支；未合并原默认分支。附带完整证据，便于逐项复查。
'''
(DEST/'验收报告.md').write_text(body)
# Compact labelled overview; images are copied from exact evidence, never drawn as fake UI.
font=ImageFont.truetype('/system/fonts/Roboto-Regular.ttf',19)
keys=['home','read','edit-folded','edit-candidates','history-empty','trash-empty','menu-error','menu-exit']
by={(r['window'],r['scene']):r for r in m['pairs']}
imgs=[Image.open(by[('fit3',k)]['pair']).convert('RGB') for k in keys]
w=max(i.width for i in imgs);h=max(i.height for i in imgs)
canvas=Image.new('RGB',(w*2+20,h*4+54),'#1e2321')
ImageDraw.Draw(canvas).text((12,12),'LIUBAI FINAL V3  ACTUAL .app | APPROVED   '+SHA[:12],font=font,fill='#e6c78c')
for ix,im in enumerate(imgs):canvas.paste(im,((ix%2)*(w+20),(ix//2)*h+54))
canvas.save(DEST/'留白-V3-关键界面对照.png')
scenenames={k:k for k in keys}
nav=''.join(f'<option value="{w}">{w}</option>' for w in v['perWindow'])
rows=[]
for record in m['pairs']:
 src='visual/labelled-pairs/'+Path(record['pair']).name
 rows.append('<figure data-window="'+record['window']+'"><figcaption>'+html.escape(record['window']+' / '+record['scene'])+'</figcaption><a href="'+src+'"><img loading="lazy" src="'+src+'" alt="actual app and approved V3"></a></figure>')
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>留白 · 最终 V3 原生对照</title><style>body{background:#101615;color:#eeeade;font:16px system-ui,sans-serif;margin:0;padding:18px}header{max-width:1040px;margin:auto;position:sticky;top:0;background:#101615f2;padding:12px 0;border-bottom:1px solid #374037}h1{font-size:23px;margin:0 0 8px}p{line-height:1.6;color:#b7beb4}select{font:inherit;padding:9px 18px;background:#26302a;color:#ecd39f;border:1px solid #444d43;border-radius:10px}main{max-width:1040px;margin:auto}figure{margin:20px 0;padding:12px;border:1px solid #374037;border-radius:12px;background:#18201d}figcaption{color:#e6c78c;margin-bottom:10px}img{display:block;max-width:100%;height:auto;margin:auto}a{color:#e6c78c}figure[hidden]{display:none}</style><header><h1>留白 · 最终 V3 原生对照</h1><p>左：真实构建 .app；右：批准 V3。每组可点击查看原尺寸。未签名，真机与字体边界见验收报告。</p><label>测试窗口 <select id="window">'''+nav+'''</select></label></header><main>'''+''.join(rows)+'''</main><script>const s=document.getElementById('window');function filter(){document.querySelectorAll('figure').forEach(f=>f.hidden=f.dataset.window!==s.value)}s.addEventListener('change',filter);filter();</script></html>'''
(DEST/'对照图.html').write_text(page)
# No credentials or compiler files ever enter the delivery.
patterns=[rb'ghp_[A-Za-z0-9]{30,}',rb'github_pat_[A-Za-z0-9_]{30,}',rb'sk-[A-Za-z0-9_-]{20,}',rb'BEGIN (?:EC |RSA )?PRIVATE KEY']
files=[p for p in DEST.rglob('*') if p.is_file() and '.previous' not in p.parts and p.suffix!='.zip' and p.name!='archive-checksum.json']
for p in files:
 assert not any(re.search(x,p.read_bytes()) for x in patterns),('credential pattern in delivery',str(p))
zipout=DEST/'liubai-v0.1.0-v3-evidence.zip'
with zipfile.ZipFile(zipout,'w',zipfile.ZIP_DEFLATED) as z:
 for p in files:z.write(p,p.relative_to(DEST))
with zipfile.ZipFile(zipout) as z:assert z.testzip() is None
archive={'file':zipout.name,'bytes':zipout.stat().st_size,'sha256':hashlib.sha256(zipout.read_bytes()).hexdigest()}
# This external checksum does not enter its own ZIP, avoiding circular/stale metadata.
(DEST/'archive-checksum.json').write_text(json.dumps(archive,ensure_ascii=False,indent=2))
print(json.dumps({'directory':str(DEST),'unsignedApp':str(DEST/'liubai-v0.1.0-v3-unsigned.app'),'report':str(DEST/'验收报告.md'),'gallery':str(DEST/'对照图.html'),'overview':str(DEST/'留白-V3-关键界面对照.png'),'sha256':SHA,'evidenceZipBytes':archive['bytes'],'files':len(files)},ensure_ascii=False))
