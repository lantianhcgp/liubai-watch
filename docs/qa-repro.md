# 留白 V3 重建验收复跑

本目录仅测试驱动、离线公开 vendor 和宿主兼容层；不含个人记录、凭据或签名私钥。产品以 elcton @ 2a8183a537db333df1d3eeb350015dbd99ac71d2 的工程和真实 CI APP 为基础，不沿用 R18 产品源码，也不使用 clander 底包。

## 本地回归与构建

- `node --test --test-concurrency=1 tests/*.test.mjs`
- `python3 -m unittest discover -s tests -p 'test_*.py'`
- `.github/workflows/rebuild.yml`：CLT 6.1.1.280 构建全部 7 页，原始编译 APP、等价 minified APP、source SHA 和逐记录 SHA 全保留。禁止改模板或摘页。
- `scripts/course_carrier.py BASE.app COMPILED.app OUTPUT.app`：要求真实课程表 APP SHA 为 `0e317fbb436837b093f5903004ab1edeb5c9ba3e42c0b9034cc3d362d09d8f30`；只替换本次 CLT 编译的产品记录，逐记录必须与测试载荷一致。
- 来源 artifact：`lantianhcgp/elcton` CI `41257190699`，artifact `13063352354`，名称 `wearengine-watch-2a8183a537db333df1d3eeb350015dbd99ac71d2`。真实 APP 原字节以 `qa/carriers/elcton-2a8183a.carrier` 固定进 CI 输入；后缀改变不改变 ZIP 内容，防止 artifact 到期或跨仓授权影响复跑。

## hmlwsim

上游固定 `2b28919fc14ea25eaed46f895817d58e481a8657`。隔离副本为 `~/liubai-rebuild-private/hmlwsim/`。`qa/host-patch.diff` 和 `qa/host-patch-proof.json` 公开列出宿主差异；不修改测试 APP、页面 data 或注入 `$vm.$app`。文件接口通过 `qa/friend_host.py` 访问真实隔离磁盘，rawfile 只读。

短生命周期入口：

```
TZ=Asia/Shanghai LIUBAI_FRIEND_STATE=/absolute/empty-state python3 qa/browser_run.py --app /absolute/final.app --command 'node qa/friend_accept.mjs /absolute/evidence/flow && node qa/friend_extra.mjs /absolute/evidence/extra' --out /absolute/evidence/lifecycle
```

功能路径从空库经真实指针新建记录。`friend_extra` 的 `/__fault` 是明确标注的 QA 单次 I/O 失败注入，不是真机故障证明。

视觉矩阵另建沙盒：`TZ=Asia/Shanghai node qa/visual_fixture.mjs /absolute/visual-state` 用当前产品 Store 的真实回调和磁盘写入原稿 5 条公开演示记录，回读一致。此夹具仅视觉，不用于功能通过或默认产品种子。随后同一 final.app 通过真实导航复跑 `qa/visual_matrix.mjs OUT WIDTH HEIGHT SHAPE` 的 19 状态。测试窗口 412×484 rect、454×454 circle、390×390 circle、336×480 rect。

`browser_run.py` 在 finally 按 PID + start ticks 清理其进程树并验证 HTTP/CDP 端口关闭。不得并行启动多个本地浏览器实例。

## 官方模拟器

`qa/official.py` 在 macos-14 执行固定 `deveco-sim-ci @ aa3a315a766f6dd4983ad8dad9eed2c948c6faba` 的华为原始 Mach-O Simulator。从 config 首页真实输入中文、多行正文、保存、翻屏、菜单、草稿、回收站和冷重启；按单调日志游标验证语义、逐指针 ACK 与截图哈希。任何错误必须非零退出，不能只看通用 PASS。

官方当前 `device.getInfo` 在 `-shape circle` 下实际仍返回 `rect`，因此官方四窗口证明矩形路径；圆形布局另由 hmlwsim 的真实虚拟设备配置检验。产品未强改设备结果。两环境都不证明真机文件系统、掉电原子性、物理表冠、蓝牙、功耗或低堆型号。

## 签名和同载荷门禁

沿用实际 R18 的 `liubai.nexus.by71x` profile，源码 `com.hcbiu.liubai`；profile/私钥只在仓库外。签名后须验证 CMS、精确 profile、Huawei Root + 中间链、版本 code=2/name=0.2.0，并解析 signed.bin 文件表确认除了 config 的签名 bundleName 外，全部代码/map/资源与双模拟器最终 APP 逐字节一致。

新增审查失败回归：根存在但引用页缺失不得清库；提交与回滚双失败须锁写并冷恢复；journal 清除已落盘却报错加回滚失败也不能发布失败正文；空 ID 标志调用拒绝；save/clear 重复回调防重；保存锁覆盖草稿清理；长按每手势一次；真实 `life.js` 的 `onHide→save/clear/草稿回调→onShow`，保持正文、同 ID 和有界保存锁，隐身页不得主动路由。

最终视觉判断须逐组件放大原帧，不以截图数量、文件存在、非黑占比或构建成功代替。

通用记录／笔记本菜单按批准原稿 `u=w/412` 使用 `74u` 行高、`24u` 字号和 `16u` 图字间距，行图标为 22px；阅读设置保留 50px／20px、键盘工具保留 50px／18px 的独立覆盖。原生点击中心同步来自对应行高，短窗口阅读设置的实际滚动步骤保留。原稿捕获输出计算几何用于同窗口尺寸／字号对账，不修改批准 HTML。

最后原稿格式门禁：主页日期 MM / DD、回看日号 DD、阅读页码两位补零（不截断三位页数），对应行为测试先 RED 后 GREEN。hmlwsim 原 image 默认 contain 与 text 默认 pre-wrap 曾产生非原生差距；现隔离宿主依据官方 rect336/056-editor-tools.jpg 的铺满图和 fit3/085-reader-home.jpg 的单行省略号，改为显式宽高 fill，且对 compiled class/id 声明 textOverflow=ellipsis 的 text 设置单行溢出。全部更改均在 qa/host-patch.diff 披露，不修改 APP、业务 data 或正确的原生布局。

rebuild.yml 先对同一 _built/liubai-elcton-v3.app 执行 qa/official_cold.py（真实点击中文/英文/换行、保存→进程结束→保留磁盘→重启回读同 ID 和逐字节正文），再跑四窗口完整路径；expected SHA 来自该 artifact 的 compiler-proof，不再单独复用旧载荷冷重启结论。

最终图检补回的原稿行为：主页置顶优先不变；某日与回收站按创建时间倒序且跨分页保持；回收站每条显示“点按恢复 · 不会自动清除”、不显示置顶图形；剪切板空态为原金色 copy 图标、25u 标题和 18u 双行说明，单个“返回键盘”按钮回编辑；笔记本 quiet-status 提示为原 19u 字号、1.7 行高、16u 顶距，不沿用工具页微型提示。

签后原生复测：`.github/workflows/cold-pinned.yml` 仅手动运行，传入本次 `build_run`、精确 `source_sha` 和安全的 `signed_fixture`。fixture 仅有签包 SHA、编译 APP SHA、实际签后 config 的 Base64 与全部资源哈希/大小，不含私钥、CMS 或 profile。`qa/signed_input.py` 严格核对资源集合与每项字节后生成 `_signed/exact-native.app`；只允许 app.bundleName 的签名身份变化，版本与其余字段不得改变。再对该输入执行真实冷重启和四窗口路径，显式传入 expected-bundle。原报告仍保留 `signedEnvelopeInstallationTested=false`，预览器资源通过不证明真机签名封装安装成功。

最终补充门禁：quiet-empty 的两行说明行盒精确使用 `ceil(18u×1.6)`，总 column 高度取实际标题行盒与各元素间距之和，336 窗口也不把标题高度漏算。所有 V3 派生资源（包括旧 manifest 未列入的 warm/empty-copy）均显式钉住来源哈希；未知资源拒绝绕过。朋友模拟器冷加载时先等真实 `DOMContentLoaded` 初始化，再经 SensorPanel 控件设置设备并读取实际 getDeviceInfo 确认；未绑定控制器不得悄悄沿用 466 圆屏。首次错误保留为失败证据，不修改 APP Device API 或 data 来变绿。

原稿截图使用 `captureBaseline` 的 `captureBeyondViewport=false`：true 会临时隐藏 Chromium 滚动条并移动居中表壳约 7.5px，即使尺寸和 scale 正确也会错位。截图前输出真实活动窗口 bbox 并对齐日期；批准 HTML 保持原字节。

当前原生 `readText` 对零字节文件/EOF 返回 202（`_ReadFileImpl` 二进制实证）；草稿由已校验头的长度 0＋空校验表达空 part，不写空文件再读回。非空 part 保持严格 UTF-8/字节与 checksum 验证，不泛型把 202 当空。确认页父 dock 圆角不裁子金底，使用 22×44 透明右半圆 cap＋矩形 fill，宽度扣除两侧 1px 边框，原动作和布局不变。

原生字体族回退门禁：未注册的显式 `HYQiHei-65S` 会使 `Text::SetFont` 的 fontId 守卫跳过字号更新；实际大字28px阅读仍画成约18px、菜单24px行文字也未放大。页面文字统一由平台已注册默认族渲染，仅删除显式族，保持所有字号／行高／间距及业务字节不变。不得将官方模拟器的字体文件名硬编码入应用；新完整APP必须重新取原生帧，确认大字与标准档位真实生效且无裁字。默认族在各设备可能不同，真机字体／安装仍需独立验证。

454 原生取证：选词更新动态 for 数组、同时 if 删除候选栏，可出现 chars=1 日志成功却无新帧、下一模式键无响应。候选 receiver 改为永久 20 个数字槽位，文本/宽度读取当前候选且有守卫；普通栏和候选栏以 show 切换，保持节点，不使用延迟定时器蒙混。原生关键步骤 new／empty-save-rejected／choose-han／lowercase 必须在 MouseRelease 发出后取得有效新帧且不同于前帧；旧帧复用只能出现在明确无视觉变化的步骤，报告 frameFresh／frameReused 和 raw 字节范围。新增真实点按空保存负例，不删旧覆盖；四窗预计 94／94／98／94＝380 个有序检查点，最终按实际报告逐条计数。
