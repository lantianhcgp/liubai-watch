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

新增审查失败回归：根存在但引用页缺失不得清库；提交与回滚双失败须锁写并冷恢复；journal 清除已落盘却报错加回滚失败也不能发布失败正文；空 ID 标志调用拒绝；save/clear 重复回调防重；保存锁覆盖草稿清理；长按每手势一次。

最终视觉判断须逐组件放大原帧，不以截图数量、文件存在、非黑占比或构建成功代替。
