# 实验 L：不改业务的启动诊断

## 授权与基线

执行用户已指定的方案：阶段打点 + onerror + 心跳，全零正则内联，新全绿 CI、精确 Profile 重签，新增 `/storage/emulated/0/haps/实验L-诊断打点.hap`。源码基线是实验 K `ae32f4a1944aa7f3f7650cb6dd8a7d310a6d2667`，当前文档 HEAD `882799b`。K 图标已由用户确认 114 修复，但仍黑；云端已见三次 MainAbility/seq1 会话，这些已知事实不复跑。

保留 `liubai.nexus.by71x`、0.2.6/code8、114/32 图标、全部 HML/CSS/资源、七页集合、原存储与导航、callback/return/this/exception 行为。诊断增加的 CPU、短字符串及有限 timer 是不可避免的观测开销；“零行为改动”指业务语义和持久数据不变，不能声称零运行开销或已修黑屏。

## 方案与测试边界

1. 应用原有唯一 logger 实例保留，仍由 onCreate init/page 和 onDestroy stop 持有。只在 app.js 内加入小型 ES5 诊断函数；页面经 shell 的真实全局 `$app` 转交打点，不导入第二 logger，不加 file/fetch/device 等 native 模块、不写日志文件。缺失/抛错的诊断出口必须静默隔离。
2. 阶段覆盖 onCreate 入口、Store.init 请求/回调/notify/返回、首页 onInit/onShow/onHide/onDestroy、device.getInfo 请求/success/fail/timeout、geometry 前后、app readiness 等待/返回、store.list 请求/返回、paint 前后、focus。只输出阶段、应用状态、ready/allowed/loading/empty 和尺寸等标量，不输出笔记内容或持久数据。
3. 原 catch 加显式异常报告，原未捕获同步异常报告后原样 rethrow；应用导出 `onError`/`onerror` 入口。**平台是否自动调用 app error hook 待原生确认**，不挂浏览器 window.onerror、不伪称 OOM/native fatal 可捕获。诊断自身异常绝不能影响业务。error 字符串有界，无正则。
4. 应用心跳使用单个 setTimeout，每 5 秒、每次创建最多 6 次，报告应用状态和最后阶段/页面标量。onHide/onDestroy 清理，onShow 只恢复剩余额度，不重置或叠加；不轮询存储、不更改业务 timer、不给页面绑定添加新状态。
5. 预先冻结四个 K 源码为 tests/fixtures/diagnostic-k/*.txt（不会打包）。应用生命周期/Store callback、shell device/readiness、列表结果/错误/失效 callback、首页生命周期是测试 seam。新诊断测试 RED→GREEN；独立 baseline oracle 对比业务事件顺序、参数/对象身份、页面数据、返回与异常身份，失败注入覆盖 logger/error getter/timer 异常和有限心跳清理。
6. 运行现有全套 Node/Python/日志源及产物门禁、source/diff/凭据审计。构建/配置/签名/预算/零正则门限不弱化。PUBLIC CI 仅占位 key；新 CI `.app` 经真实 JS-only adapter、全部 JS Acorn ES5 literal/reference/test=0、BC/JRRY=0、每页与应用 <49152B 后才本地注入写侧配置。
7. 明确本机 key + `liubai-hc.p7b` leaf 配对，完整 strong 带 app/runtime-config/bundle/version8/negative，不用 logger-page 豁免。CRC 合法重包 1B negative 必须 legacy 可过而 strong 摘要失败；精确共享目标重复验证及 SHA256，旧 HAP hash 全保留。

## 实现顺序

- 应用 trace + 生命周期业务 parity test 先 RED，新增 app 内联诊断后 GREEN。
- error hooks/原抛错身份和心跳期限/重入/销毁清理 test 先 RED，最小实现后 GREEN。
- shell/list/index 阶段及 device/list/paint 错误 test 先 RED，内联 safe forwarding 后 GREEN。
- 全套本地门绿、代码/范围审查、公开前审计；只推 feat/logsink。
- 等新 CI 真实 success，下载唯一匹配 SHA artifact；配置/签名/全强验/实际 JS 执行及逐文件 provenance。
- 新增指定 HAP 与脱敏交付说明；用户手动直装，同版覆盖失败不卸载/清数据，黑屏保持 30 秒并回报操作时间。

## 不包含

不改采集器/云端/其他工程、不进 AGC、不启动浏览器、不自动装机或清数据。Node/V8 宿主执行只能证明代码与适配行为，不证明 FIT3 JerryScript 堆、原生 getInfo/file/fetch/自动 error hook/渲染或 ACK。诊断日志到达也不是黑屏已修复。
