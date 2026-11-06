# 实验 K：启动链与日志配置现场修复

## J 取证（不是 FIT3 崩溃定罪）

使用实验 J 原始 configured APP（SHA256 `b0b03908850402a29bd1cf38b0db550f6ae930c2a1b934730e8170233fce1b29`），运行本机 `~/hmlwsim` 原始 Sandbox/AppLifecycle/file/storage/device/fetch 实现。宿主为 V8 + linkedom、412×484 设备输入、原 VirtualFS；没有打开浏览器，没有网络代理/伪造 ACK，没有注入页面 `$vm`。脚本及完整脱敏 console/栈位于 `~/lw_build/liubai-logsink-stage12/`。

- app.js 模块求值及 onCreate 无未捕获异常；应用 Store 到 ready。
- 首页 onInit 的真实回调错误：

```text
Error: App store readiness unavailable
    at Object.p [as ensure] (eval at executeModule (hmlwsim/sandbox.js:655:22), <anonymous>:3:22312)
    at eval (eval at executeModule (hmlwsim/sandbox.js:655:22), <anonymous>:3:18209)
    at Object.i [as success] (eval at executeModule (hmlwsim/sandbox.js:655:22), <anonymous>:3:21659)
    at Object.getInfo (hmlwsim/apiSim_device.js:10:60)
    at Object.h [as init] (eval at executeModule (hmlwsim/sandbox.js:655:22), <anonymous>:3:21438)
    at Object.I [as init] (eval at executeModule (hmlwsim/sandbox.js:655:22), <anonymous>:3:18136)
    at Proxy.e (eval at executeModule (hmlwsim/sandbox.js:655:22), <anonymous>:3:25585)
```

该 Error 由应用构造并通过 callback 返回，不是 uncaught fatal。探针只在宿主 Error 构造点记录 stack，不改变 callback/返回语义。全局 `$app` 为真实应用对象，页面 `$vm` 不存在；源码 common/shell.js 却只走 `p.$vm.$app.$def`。旧 `~/liubai-watch-sim` 曾人工注入此链，不能将旧模拟绿当作真机启动证据。v1 的 docs/acceptance.md 真机项未勾，docs/sdk-build.md 当时明确尚未执行真实编译，build.sh 为 release；未找到 v1 血统在 FIT3 跑通的证据，不移植独立根 read-a 全分支。

- J 的实际编译配置对象 `{endpoint,write_key,app,ver}` 与固定 canonical logsink 的 `config.key` 契约不符。L.init 检查 `!config.key` 后静默 return。因此 cursor=0 **不能**推出“App 死于首条日志前”。同一探针等 5.5 秒也无网络调用；这解释禁用日志，不单独解释全黑。
- 首页 render 在 V8 返回有文案的 DOM（“没读到，点按重试”），并非致命全黑。所以本轮不宣称已经唯一定位 FIT3 黑屏根因；V8 不证明 JerryScript heap、原生通信、图像池或固件行为。

## 两个有现场支持的最小修复

1. shell 应用入口只取真实全局 `$app` / 有限 `$def` 包裹，并要求 whenLiubaiReady/getStore/getSession 真实方法。完全拒绝假页面 `$vm` 救场；保留 ready 回调、共享 Store/Session 与路由参数对象身份。
2. prepare-logsink.py 生成应用端 `key` 字段；私有 runtime JSON 仍是 write_key/read_key，既有本地 configure 仅替实际值，不改源码/签名门禁。不修改 canonical 2921B logger、不新增 fetch 并发、不改释放版/快照适配器。
3. read-a 图标仅逐字节复制主114×114、小32×32；config 继续 `$media:icon`。verify-source 的尺寸断言改为114/32（不是放宽），PNG来源摘要记录于 icons.json。

新增测试 native-app-context.test.mjs 4项全部旧RED→新GREEN；logsink-config-contract.test.mjs 真实生成配置/固定 logger，旧RED→新GREEN，断言首条 page marker pending=1、seq=1、5s timer。原日志 ZIP 变换夹具仅改为正确应用端字段，不改私有 runtime 契约。

## 验收与交付记录

后续真实 CI、双套测试、原始新 APP 对照探针、完整 strong/runtime-config/negative、独立正则与 JRRY 复扫、字节摘要记录写在本轮证据和交付说明；未执行的项目不得由这份设计记录代替。版本保持0.2.6/code8，只推feat/logsink；旧J包和所有旧haps保留，不自动装机/卸载/清数据。

K 应如实命名为“应用入口与日志key修复候选”。若真机仍黑，下一步应以最早期 onCreate/page-onInit 原生落盘/可见阶段诊断和目标固件异常栈取证，不再从零云日志猜启动死亡，也不先并入read-a独立根历史。
