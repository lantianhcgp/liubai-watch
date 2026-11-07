# 实验 M：参数可调用性守卫与只读描述符探针

## 范围与版本

目标为 Huawei WATCH FIT 3 上的留白启动黑屏。实验 M 延续实验 L 的日志、构建、资源和签名身份，不更换页面设计，不重构业务。源码版本固定为 `0.2.6` / code `8`，身份固定为 `liubai.nexus.by71x`。

相对实验 L 基线 `b8be6c5cb70fab720813dc72298626a3df8b88e2`，已有文件仅修改 `common/shell.js` 与 `pages/index/index.js`；新增本说明和 `tests/experiment-m.test.mjs`。冻结实验 K 基线 `ae32f4a1944aa7f3f7650cb6dd8a7d310a6d2667` 的四份 oracle 不修改。构建、配置注入、包体与签名门禁不放宽。

## 实验 L 真机根因链

实验 L 真机回流日志的 65 行记录包含以下原文；行号为本地 JSONL 的物理行号，以下只公开阶段和异常，不公开通信配置或日志会话标识：

- 第 12 行：`L/index.onInit.throw message=Expected a function.`
- 第 15 行：`L/focus.error message=Cannot read property 'crown' of undefined`
- 第 16 行：`L/hb 1 state=loading last=L/focus.enter ready= allowed=false loading= empty= w= h= pending=3 sent=8 failed=0 dropped=0`
- 第 47 行再次出现：`L/index.onInit.throw message=Expected a function.`
- 重试的 `L/index.retry.enter` 与 `L/index.retry.throw` 各出现 17 次，仍不能进入设备尺寸请求。

全部记录中 `L/list.init.enter` 为零，`L/device.*` 阶段为零。源码中 `list.init` 在该阶段之前先调用 `shell.params(p)`；收窄后的唯一调用抛点为 `a.getLiubaiParams()`：原守卫只判真值，但真值不等于可调用。

`Expected a function.` 是 JerryScript 调用不可调用值时的原生错误文案。该结论沿用实验 L 已完成的源码与引擎文案收窄，不重新以网络、设备 API 或日期字符串处理猜测黑屏原因。第二个错误来自真机页面 `$refs` 为 `undefined` 时读取 `.crown`，与主启动失败分别处理。

## `$def` 机制：已知结构与待回填读数

实际 SDK 入口使用框架全局 `new ViewModel(appDef)`；`$app.$def` 指向框架实例，而不是保证原业务定义中每个字段都仍为 JavaScript 函数的原始对象。hmlwsim 将方法 bind 成函数，因此宿主 V8 仿真不能复现 FIT3 上的不可调用形态。

“框架实例的描述符/转换导致 getLiubaiParams 为真值但不可调用”是本轮要用真机读数钉死的具体机制假设。实验 M 修复已收窄的异常分支，同时保留只读探针；尚无实验 M 真机读数，不把 V8 的 `function` 结果外推到 JerryScript。

## 四处最小守卫与语义

1. `params`：仅在 `typeof a.getLiubaiParams === 'function'` 时按原 receiver 调用，返回值仍为原先的 `result || {}`；否则走已经存在的 `{}` 兜底。缺 app、缺方法和原本为假值的分支不变。真值但不可调用的分支由必抛调用错误改为兜底。
2. `nav`：仅在 `typeof a.setLiubaiParams === 'function'` 时原样传入 `values || {}`；否则跳过该不可调用的参数写入并继续原 `Router.replace`。原 200ms 防抖、URI、router 参数对象身份和可调用 setter 的 receiver/顺序不变。
3. `focus`：将 `p.$refs.crown` 改为 `p.$refs && p.$refs.crown`。没有 refs 时跳过 rotation，保留原 70ms timer、enter/exit 阶段以及原有异常隔离。
4. `clear`：先确认 `p.$refs` 再读取 crown/rotation。无 refs 时不产生 clear.error；原 deviceGen 更新、清除两个 timer 的顺序、timer 失败的原异常对象与 rethrow 不变。

本轮不修改 `app()` 或 `ensure()`，不增加它们的 `$app`/`$def`/readiness getter 读取。已能成功的普通属性/稳定函数路径保持业务返回值、参数、receiver、调用顺序和页面 data 不变；本轮不是为任意副作用 getter、代理或原生桥对象定义一套全新语义。不可调用值与缺失 refs 路径的授权降级不宣称“完全没有行为变化”。

## 两类只读探针

### onInit：`$def` 描述符与键名

在 `L/index.onInit.enter` 后、`list.init(this,'index')` 前运行一次；不在模块求值时执行，也不在 retry 中加循环探针。

格式：

```text
L/probe.def getL=<kind> setL=<kind> when=<kind> store=<kind> sess=<kind> def=<typeof>
L/probe.keys[<最多十个可枚举自有键名，逗号分隔>]
L/probe.def.throw
```

`getL` / `setL` / `when` / `store` / `sess` 分别查询 `getLiubaiParams` / `setLiubaiParams` / `whenLiubaiReady` / `getStore` / `getSession`。`kindOf` 用 `Object.getOwnPropertyDescriptor` 沿 `Object.getPrototypeOf` 走查；遇到 accessor 只报 `acc`，绝不执行被查询业务 getter，也不读取键对应的值。keys 只用 `Object.keys` 取名字，不记录业务正文、路由值或对象内容。

相对任务简报给定代码的唯一必要偏差：独立 spec 审查给出合法反例 `Object.defineProperty(o,n,{get:undefined,set:undefined})`；此属性仍是 accessor，原 `if(d.get||d.set)` 却误报 `undefined`。本轮最小改为 `if('get' in d||'set' in d)`，按描述符类别而非 get/set 真值判断，不调用 getter、不改变业务调用。新增反例已实际先失败后通过，同时覆盖五个被查询名字的继承 getter 零读取、missing 与数据值 undefined 的区分。

判读：

| 输出 | 含义 | 不可推出的结论 |
| --- | --- | --- |
| `function`（判读时可简称 f） | 数据描述符值的 typeof 为 function | 不证明 FIT3 已启动成功或已 ACK |
| `acc` | 自有或继承 accessor 描述符（含 get/set 都为 undefined） | 不调用 getter，不能据此断言其返回值是否可调用 |
| `m` | 原型链未找到该名字 | 不等于缺 app；其他字段独立判读 |
| `object` / `string` / `number` / `boolean` / `undefined` 等 | 找到数据描述符，报告其值类型 | object/string 真值不代表可调用 |
| `E` | 描述符查询或取原型抛异常 | 不猜异常原因，不影响 list.init 继续运行 |
| `L/probe.def.throw` | 整体探针读取或拼装失败 | 不替代业务异常，不制造成功读数 |

实际代码输出为完整 `function`，并不输出单字母 `f`。所有探针沿用 app 原有 stage/页面快照与总消息截断（stage 最大 240 字符）；最多输出十个键名，现有 app 字段名预算内可读。若将来添加超长键名，尾部可能被总截断，不据此声称完整枚举。

### onShow：refs 类型

在原 `L/index.onShow` trace 后、`shell.focus(this)` 前：

```text
L/index.refs=undefined
L/index.refs=object
L/index.refs=THROW
```

普通缺失 refs 报 `undefined`，存在对象报 `object`，属性读取失败报 `THROW`。探针不写 refs、不创建 crown、不模拟表冠焦点成功。onInit/onShow 原返回值不变，原 list.init 与 focus 的业务先后不变；诊断增加的时间和日志开销不等于零开销。

## 新测试与回归门禁

`tests/experiment-m.test.mjs` 包含六项（原五项 + 独立审查发现的描述符反例）：

- 真值非函数 getLiubaiParams：M 返回空参数，冻结 K 必须抛异常。
- 真值非函数 setLiubaiParams：M 继续 Router.replace，冻结 K 必须在 router 之前抛异常。
- 没有 `$refs` 的 page：focus/clear 不报 focus.error/clear.error。
- 同样的不可调用 getLiubaiParams：实际 list-page 初始化必须到达 device.getInfo，冻结 K 在设备请求前抛异常。
- 首页探针报告 accessor 类型、keys 与 refs 类型，并断言 getLiubaiParams 业务 getter 读取次数为零。
- 合法空 accessor 与五项继承 getter：均报告 acc、五项业务 getter 零读取；未找到字段报 m、数据描述符值 undefined 报 undefined。

既有 diagnostic-startup 测试继续锁定生命周期返回值/this/业务调用顺序/data，原异常身份、单次业务 `$def` accessor 读取和 `$app` 读取次数；native-app-context 与 verify-source 继续锁定版本与图标。

全套本地 Node/Python/logger-source/logger-artifact、ESM 语法、源码零 regexp/RegExp/test-call、冻结 K 对账和七受保护哈希均须通过；本机缺 ohpm 的实际 compiler exit127 只证明环境阻塞，真实 SDK 构建必须来自本次 exact commit 的新 CI。构建后配置注入只改允许的 app 配置；by71x 签名后重复全包 JS 数量/48KiB/零 bc/零 JRRY、114/32 图标像素、legacy CMS、完整 strong 与真实 CRC 合法的 1B 负向验证。

## 已知降级与真机边界

- 实验 M FIT3 安装、冷启动是否消除黑屏、`L/probe.*` 和 refs 真机读数待回填。
- 若 getLiubaiParams 与 setLiubaiParams 均不可调用，跨页 `$def` 参数缓存通道不可用；Router.replace 仍转发原参数，但现有 day 页读取依赖 shell.params，因此日期路由参数可能缺失并落入原日期参数错误分支。这是已知降级，后续实验 N 单独处理，M 不擅自改 day 页或参数架构。
- 若 readiness/store/session 也不可调用，M 不修改其原门槛或伪造 ready；读数将用于后续定位。
- hmlwsim 实际构建 JS 的启动与 SDK host diagnostics 只证明宿主逻辑、阶段、有限 heartbeat 与清理，不证明 FIT3 JerryScript 堆、原生传输、视觉或 on-watch ACK。
- 本公共仓库只发布零凭据源码和占位配置产物；真实通信配置仅在授权本地 configure/sign 流程使用，不写入本说明或公共 CI。
