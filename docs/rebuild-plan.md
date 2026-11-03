# 留白 · 原始 V3 全量重建执行计划

目标：以真实课程表 elcton APP 及其已提交、脱敏工程为基础，重新实现批准的 V3；不沿用 clander 载体，不在 R18 上叠补丁。原设计已获用户批准，本次不是重新设计。

## 权威来源
- approved-v3：/storage/emulated/0/Documents/watch-notes-concept-2026-11-01/approved-v3。
- 视觉 HTML SHA-256：afc5fcb14d47a83be90dc71f9f2682a5d9eb95d19f55643328a05cf9f2fd5d6a。
- 课程表源码：lantianhcgp/elcton @ 2a8183a537db333df1d3eeb350015dbd99ac71d2。
- 实际课程表 APP：CI 41257190699；本地 liubai-rebuild-private/elcton-base-41257190699。
- CrabKeyboard @ 656f8ad842a8692bc3b2b975d6b648880232c592；保留 MIT。
- 独立目录 /data/data/com.termux/files/home/liubai-watch-elcton-rebuild；分支 rebuild/elcton-v3。

## 不变的产品与视觉要求
近黑 #060808、暖白 #f1f0e8、纸金 #e6c78c、次级文字 #adb1a9；不是功能宫格。随记/回看底栏位置一致；完整列表行、图形图标、分割线、字号、空间和状态对照原稿。阅读没有大底栏，全文完整行逐屏，三点入口、三档字号、正文锚点和细进度。已有记录编辑默认收起，点正文定位后展开；新建默认展开（原始批准 HTML startEdit 的 !n 与开发交接均如此，旧实现的全部收起不作为设计）。原螃蟹键位窗口高141px、命中比例不变，类型用原图标，空格原宽度策略；候选与工具共用44px槽位；光标精调和应用内剪切板在键盘工具页。取消/草稿/失败保字，保存同ID不改创建日期，回收站不自动永久清空。

## 架构与接口
原生 HML/CSS/ES5 风格 JS；课程表 CLT 6.1.1.280、FA、API compatible4.0.0(10)/target6.1.1(24)。app.js 仅保存轻量 getState()，不打包整个存储/词库。index 首次创建共享 store；其他页从真实 $app getState().store 取得。取消巨型 boot 页，config 第一页为 index。

common/geometry.js：valid(info), band(w,h,round,y0,y1,pad), home(info), reader(info,font), editor(info,open)，返回原稿几何字段；真实windowWidth/windowHeight/screenShape缺失报错，无固定分辨率兜底。
common/text.js：bytes(text), boundary(text,pos), move(text,pos,delta), insert(text,pos,addition,maxBytes), title(text), preview(text), paginate(text,geometry,anchor,editor,cursor)，返回当前有限 lines、start/end/prev/next/page/count，不常驻所有排版页；保护UTF-16代理、组合符、ZWJ、中英标点与空行。
common/store.js：createStore(fileApi)；init(cb), list(filter,offset,limit,cb), days(month,cb), read(id,cb), save(id,text,cb), setFlag(id,flag,value,cb), saveDraft(snapshot,cb), loadDraft(cb), clearDraft(cb)。回调 cb(err,value)。正文≤3072 UTF-8 B，index每页8条、最多256记录，单文件≤4096B，A/B短提交根标记、更新正文与索引后回读确认再报成功；晚回调不能释放/跨越写锁；所有记录正文不常驻。
common/keyboard.js：createKeyboard(fileApi)；keyAt(x,y,offset,type), charAt(row,col,type,shift), lookup(pinyin,cb), dispose()。按真实原键表/最长前缀分片词库与候选消费，最大20候选；rawfile只读。输入模型使用正文+UTF16光标，预算检查整词原子化。
common/context.js：state(), nav(uri,params), params()；app onCreate/getState，真实$app入口；不依赖人工$vm。common/life.js：设备尺寸就绪、存储就绪、路径generation防晚回调，定时器与焦点清理。
页面：index/read/edit/menu/history/day/trash；menu模式为read-options/record/app/confirm/exit/error/tools/clipboard。所有模式单列验收，不能用首帧代表菜单全通过。

## 执行步骤（每一步先RED后GREEN）
1. 来源门禁：核对approved八文件hash、elcton底包config与脚手架hash；新repo无clander/旧证书/真实个人正文。运行 tests/source.test.mjs。
2. 纯排版/Unicode：写四窗口几何与全文覆盖负向测试，随后实现geometry/text；node --test tests/text.test.mjs tests/geometry.test.mjs。
3. 存储：真实临时磁盘测试新建、同ID更新、索引分页/日期/回收站、失败保旧正文、晚回调互斥与重启恢复，然后实现store。
4. 键盘：原键表/素材hash、分片最长前缀 ni/nihao、上层字符/英文/符号及销毁取消；真实rawfile磁盘读取，然后实现适配。
5. 页面：原稿逐状态恢复；每页完整生命周期与真实路由；真实编译包门禁拒缺页、外部require、48KB超限及版本重置。
6. 构建：真实CLT产出 .app，全部页面保留；仅可做等价构建侧minification并记录原始/最终hash，不改手工模板或以别的包冒充。
7. 三环境分工：自制lite-sim仅查规则/日志定位；hmlwsim读取最终真实APP，真实点击/滑动/表冠；官方Mach-O Simulator在macOS-14读取同包，真实命令管道+语义日志，四窗口分工明确。
8. 双正式验收：新建/编辑/中文候选/英文符号/横滑上滑/空格换行删除/光标/剪切板/同ID保存/取消/草稿冷重载/置顶/回看/回收站/长文首中末/字号锚点/I-O失败与重试/重复动作。各窗口逐页面原帧→组件放大→像素与几何断言，拒仅非黑/文件存在/CI绿。
9. 二阶段独立审查：先Spec合规，再代码质量；具体失败不降低阈值。最终APP、双模拟器证据hash完全一致才签名。
10. 使用实际 R18 留白 profile 身份 liubai.nexus.by71x，私钥仓外；CMS/完整华为链/版本/全部资源回读；不得用课程表证书覆盖课表。签后只允许 config.app.bundleName 改成该身份，由已验签 HAP 回读资源生成安全哈希 fixture，再用 qa/signed_input.py 核对和重建字节一致的原生输入，执行官方四窗口与冷重启。原生输入不包含 CMS/profile，不把此步骤称为真机安装通过。交付一个完整候选和真实证据到 Documents 与 haps，更新进度并移除15分钟cron。

## 环境边界
四测试输入412×484 rect、454×454 circle、390×390 circle、336×480 rect；不宣称所有型号通用。hmlwsim V8/官方预览均不证明FIT3固件、真机file/掉电、物理表冠、长期功耗及低堆设备。只交付一个经双模拟器验收候选，不伪称已真机通过。
