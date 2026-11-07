# 实验 N：app 解析探针与异常回退

## 范围、基线与授权

基线为实验 M 的 db79e2d2b43d5e1fa7dac3a3b76a6e5cac6dcb8e，分支 feat/logsink。身份 liubai.nexus.by71x，版本固定 0.2.6 / code 8。目标是 FIT3 启动黑屏的定位候选和已授权异常回退，不把宿主通过写成真机修好。

既有 tracked 文件白名单只含：

- entry/src/main/js/MainAbility/common/shell.js
- entry/src/main/js/MainAbility/pages/index/index.js
- entry/src/main/js/MainAbility/common/list-page.js
- tests/diagnostic-startup.test.mjs（只动原 264 / 304 / 481 三分支的断言与必要 callback 观测接线）

新增 tests/experiment-n.test.mjs 与本文。app.js、ensure/nav/focus/clear、appRoot accessor 回避规则、trace 桥、所有日志生产者/通道、四份冻结 K fixture、七个构建/配置/签名保护文件、页面 UI/存储/版本不改。签名材料和实际通信凭据不进入公共源码、文档、审查输入或 CI。

两批授权全文见文末：第二批对第一批“记录必须发生”和原 304 读数的适用层作明确裁决，而不是删除测试或单方放宽。任何条件不满足即停；独立审查不过就停在审查，不回头改测试凑过。

## 实验 M 真机证据与 60 字符截断

用户报告 M 装机后仍黑屏。2026-11-07 启动窗口的原始消息包括：

```text
L/index.onInit.enter state=loading ready= allowed= loading= empty= w= h=
L/probe.def getL=m setL=m when=m store=m sess=m def=undefine state=loading ready= allowed= loading= empty= w= h=
L/probe.keys[] state=loading ready= allowed= loading= empty= w= h=
L/index.onInit.throw message=Expected a function.
L/index.refs=undefined state=loading ready= allowed=false loading= empty= w= h=
L/focus.enter state=loading ready= allowed=false loading= empty= w= h=
L/focus.exit state=loading ready= allowed=false loading= empty= w= h=
L/index.retry.throw message=Expected a function.
```

`def=undefine` 是实际截断后的字面串，不能称为完整的 `def=undefined` 读数。M compiled tracePage 的真实先行上限是 String(stage).slice(0,60)，而不是拼接后 240 字符预算；compiled 引用保留于 stage15/trace-cap-baseline.json。第二启动窗口曾 dropped=4，因此“没有标记”必须先排除丢包或不可达出口，不能据缺失直接定罪。

简报已确定的排除链：M index/module 752 前置 list-page/module 250 工厂已执行，普通稳定导出 init 是函数；init 的原 L/list.init.enter 之前包含 shell.params，其他路径已按简报排除。本轮探测 params→app 的 getter 求值/参数方法包装器异常；不重新调研已拍板假设，也不声称宿主 V8 可复现 FIT3 的框架包装。

## 生产实现与不变部分

- app(p)：原有 happy path 表达式逐字保留，整体 try/catch；catch 尝试 trace(p,'L/app.resolve.throw',e)，返回 null。
- params(p)：包住 app 解析与 getLiubaiParams 的属性读取/调用，catch 尝试 trace(p,'L/params.call.throw',e)，返回空对象。被 app 已捕获的异常只产生 resolve 尝试，不伪造 params.call.throw。
- probeApp：只用既有 kindOf 描述符/原型查询七个固定名；getL/setL/when/store/sess/trace/err，另报告框架 `$def` 类型。被查询的七个业务 getter 不调用；框架入口读取按简报隔离。
- probeApp 拆为三条 stage：getL/setL/when；store/sess；trace/err/def。function + def=undefined 时原文长度分别 53/40/53；function/undefined/acc/m/E 与三类 `$def` 类型的测试组合最大 56，全部不超过 60。每条实际经过 unchanged shell→appRoot→tracePage→L.i，断言原串完整存活以及真实快照后缀；不提高 app.js 上限。
- onInit：enter→probeDef→三条 probeApp→call.pre→list.init。list.init 第一条加入 L/list.init.first，先于原有页面赋值与 params；既有生命周期调用顺序/返回值不变。
- ensure 的生产代码字节不变。app=null 自然走原 unavailable Error callback；回退不等于 store 已就绪。

kindOf 输出保持 acc/m/function/undefined/E 等原词：acc 包括 get/set 均 undefined 的合法空 accessor；m 是未找到；data 属性返回其 value 的 typeof；E 是描述符/原型查询失败。acc 不是 getter 返回类型。生产 appRoot 的历史 accessor 检查原文不变，不借本轮修新 probe 去改 appRoot。

## 新发现与三处迁移逐项披露

前置传播断言失败遮住了后续计数断言。只读复核实际发现原 304 fixture 的 N 读取为 4 而原测试要求 2，已停靠上报，没有以旧表面通过代替计数证明。另外，原 fixture 的出口为空记录函数、始终抛的全局根或 accessor-$def 回避对象；固定输入下不能证明 sentinel 实际落日志。因此第二批分别授权 callback 有限迁移、可达新 fixture 记录、尽力记录分层，以及唯一例外读数 2→4。

原行号以 M commit 为准；当前标题维持历史原文，标题中的 frozen-K parity 不代表 N 仍传播原业务异常。

| M 原行 / 当前行 | 旧断言与接线 | 新断言与接线 | 保持不变 |
| --- | --- | --- | --- |
| 264 / 264 | ensure 必须抛同一 business getter sentinel；callback 抛 must not dispatch | 接收并断言唯一一次 App store readiness unavailable Error；观测 callback 再抛收到的同一 Error，保留 ensure 原 catch 分支 | 同输入/同 sentinel；def 或 when 各只读一次、store/session=0；bind=0；其后 diagnostics-no-read 全原样 |
| 304 / 309 | ensure 传播首次 A；callback 抛 must not dispatch；current.reads=2 | unavailable Error 分发一次且 callback 重抛该对象；current.reads=4，仅此首次读即抛的例外输入 | 原 `$app` 替换函数、A/B sentinel 一字不改，K 仍首次 A/reads=1；不改变 happy path oracle |
| 481 / 498 | params 抛同一 one-shot def sentinel | 不传播；params 返回 `{}` | 原输入/sentinel、诊断先读=0、业务 getter=1、K 仍原 sentinel；不增加出口或绕过通道 |

304 的四次具体位置（同样列在测试注释）：

1. shell.app 原业务根查询 `typeof $app` 首次抛 A。
2. app catch 的 L/app.resolve.throw→trace→appRoot 的 `typeof $app` 抛 B。
3. ensure 原 L/app.ready.wait→trace→appRoot 的 `typeof $app` 抛 B。
4. 观测 callback 重抛 unavailable Error 后，ensure 原 catch 的 L/app.ready.throw→trace→appRoot 的 `typeof $app` 抛 B。

该例外根每次都抛，未返回任何对象，四次均不可能触及 `$def`、when/store/session 或业务 getter。第一次为原业务根查询，后三次是 guarded 日志尝试；不以此批准任何 happy path 多读。直接根/包裹根仍与 M oracle 对齐：global=2，def=1/2，params property=2，方法调用=1，receiver/返回对象身份锁死。

## catch 日志契约：尽力记录，分层验收

1. 生产 catch 必须保留真实 trace 尝试，不删路径、不直接塞 stage。
2. 可记录出口：新增 fixture 使用 data-property `$def`，在 params 路径使用 data-property getLiubaiParams 抛同一 sentinel 的函数；app.resolve 由正常 data `$def` 包裹的 whenLiubaiReady getter 抛原 business getter sentinel。配可记录 traceLiubai/errorLiubai，实际经生产 shell.trace/appRoot 到出口，两个 catch 点各一项，严格断言发生且 error 对象 === sentinel。
3. 结构性不可达：accessor-$def 被既有 appRoot 回避，或全局根每次抛/出口不存储。在原固定 fixture，以 null/空对象/unavailable 回退作为 catch 已执行证据，不要求不存在的记录。不改 appRoot，不替原 fixture 增造出口。
4. 可达 fixture 不替代原 getter 纪律；新 tracePage 全字段测试也不以原始 VM 字符串冒充截断后日志。

## 真机判读矩阵（交付后待回填）

先按同一 sid/seq/时间确认完整窗口与 dropped/pending，再检查三条 probe.app 是否齐备。仅“可记录出口已存在”的真机窗口要求相应 sentinel 记录；不可达时不把没有记录当作 catch 未执行。

| 观察 | 判读 |
| --- | --- |
| 三条 probe.app 未齐 | 先排除丢包、probe.app.throw 与通道不可达，不编造完整 `$def` 读数 |
| 没有 call.pre | 查 probe.app.throw/onInit.throw；缺标记本身不是未执行证明 |
| call.pre init 不是 function | 报告真实调用点读数，停，不盲修 |
| call.pre init=function 但 first 没有 | 在稳定字面模块假设下先查丢包/出口，不能以收不到等同于没执行 |
| first 出现但 enter 没有 | 查看 init 第一段之后的 app.resolve/params.call 或后续异常；结合出口可达性 |
| app.resolve.throw 出现 | 解析失败且回退 null；可达出口应携带同一原错误；unavailable 不代表 ready |
| params.call.throw 出现 | 参数属性/方法异常且回退 `{}`；可达出口应携带同一原错误 |
| 出口结构性不可达 | 用可见 fallback/error 回调证据判 catch，不宣称记录成功；需装机后日志/界面交叉取证 |
| enter 出现、两种 throw 都无 | 原 params 阻断线已越过，再按 device/readiness 标记定位 |

N 不改 day 页或跨页缓存架构。空参数可能降级日期通道；回退不是黑屏修好、真实数据就绪、真实网络或 on-watch ACK 证明。

## 已执行验证与剩余链路

原 8 项 TDD 真实 M 上 2 PASS / 6 FAIL，N 候选 8/8 PASS；n-test-red.txt 与 n-green-candidate.txt 原回执保留且 SHA 固定。新增 3 项后 N 共 11/11 PASS；≤60 反例先实际 9/11（两个字段/通道测试失败）再拆行到 11/11，原红回执保留。真实通道首轮的后缀断言漏计先前 index-enter 快照，保留失败实况，并按 app.js 已有行为校正新测试的完整后缀，不改生产通道或原测试。

当前本地 Node 162/162，Python 18/18，logger 源码/产物各 10/10，skipped=0；diagnostic-startup 29/29、M 6/6、native-context 4/4。20 个 runtime 源码 ES5、regexp literal/RegExp/test/exec=0。既有 212 tracked 中只变四项，其余 208 不变，四冻结 K 和七保护 SHA 均通过。

专用只读边界检查证明：三 fixture 业务输入/sentinel 前缀逐字一致；其他 26 原测试与全部外部 setup 逐字一致；ensure/nav/focus/clear/appRoot/trace 等 unchanged 函数原文一致；app.js 与真实通道逐字一致；原两份 TDD 回执未覆盖。边界检查首轮误写了不存在于 M 的断言片段，实际失败回执保留；修正检查器的引用为原文后通过，未为检查器改任何产品/原测试。

本机真实 compiler attempt 仍 exit127/缺 ohpm，不算新编译成功。后续只有真实回执才可宣称：独立 standards/spec 审查→commit 前后公开审计→exact push/new CI→实际 unsigned/configured/signed inventory→by71x/0.2.6/code8→legacy/完整 strong/CRC合法1B负向→hmlwsim 新 SDK host startup/diagnostics→指定 N HAP 精确目标复验→M 仅 mv 归档。已经 remove 的进度 cron 保持删除，最终 list 回读。真机安装、黑屏判读、原生堆/通信/ACK 仍待用户装机回填。

本文是当前规格与真实本地回执说明，不是下游尚未执行步骤的成功报告。

## 第一批授权全文

有冲突的具体项以第二批裁决为准。

# 实验N 范围调整授权（2026-11-07，经停靠审查后批准）

对阻塞报告两项建议：**均批准**，附以下硬条件。任何一条不满足即停，不得绕过。

## 阻塞1：三处异常传播测试迁移 —— 批准

迁移 tests/diagnostic-startup.test.mjs 第 264 / 304 / 481 行三个异常分支到 N 回退契约，条件：

1. **同输入同 sentinel**：测试输入与 sentinel 值一字不改；改的只是断言方向。
2. **断言必须双向**：既断言回退值（264/304 → ensure 走原有 unavailable 回调路径；481 → params 返回 `{}`），**也断言对应诊断 stage 以该 sentinel 被真实记录**（`L/app.resolve.throw` / `L/params.call.throw` 携带同一 sentinel）。**吞掉异常却没打点 = 测试失败**——这是本迁移的核心，不许只断回退不断打点。
3. **其余断言全部原样保留**：读取次数、诊断不预读、回调/receiver 身份、业务 deepEqual 冻结基线，一条不许松。
4. diagnostic-startup.test.mjs 加入 tracked 改动白名单（changed 扩为四文件：shell.js / index.js / list-page.js / diagnostic-startup.test.mjs）。
5. **透明化**：docs/experiment-n-probe-fallback.md 与双审查 prompt 必须显式列出这三处迁移（行号、旧断言→新断言、理由=回退契约与传播互斥），由 fail-closed 独立审查裁决；审查不过就停在审查，不许回头改测试凑过。
6. TDD 回执保留：新 8 项在 M 基线 RED（n-test-red.txt）、N 候选 GREEN（n-green-candidate.txt）的证据不许丢。

## 阻塞2：probeApp 按 60 字符上限拆行 —— 批准

1. 在 index.js 内把 probeApp 拆成多条 stage，**每条 `String(stage)` 原文 ≤60 字符**（按 app.js `stage=String(stage).slice(0,60)` 实测口径，不是 240 估算）。
2. **不改 app.js 的 tracePage 上限**，不改任何日志生产者/通道。
3. 字段覆盖不缩水：getL / setL / when / store / sess / trace / err / def 七项 + `$def` 类型全部要到；kindOf 输出保持 `function`/`undefined`/`acc`/`m`/`E` 全词，不为省字符缩写。
4. 新增断言：**经真实 tracePage 通道（含 slice(0,60)）全字段可见**——每条拆行执行截断后字段仍完整；同时给 M 截断实况（`def=undefine`）留取证引用，不许把截断串写成完整读数。

## 后续流水线（不变，按原简报）

四文件白名单 → 全门禁绿 → 双独立审查（含上述迁移 diff 的显式披露）→ commit 前后公开审计 → push → CI → configure → by71x 签名 → legacy+strong+1B负向 → 交付 `/storage/emulated/0/haps/实验N-app解析探针与回退.hap` → 归档实验M（只 mv）→ 进度兜底 **remove + 回读确认**（不是 pause）→ 交付报告。

未尽事项照旧：FIT3 装机与判读矩阵回填留待用户装机后拉日志。

## 第二批裁决全文

# 实验N 边界裁决·第二批复文（2026-11-07）

对《实验N-范围授权复核-停靠报告》三项待裁决：**全部裁决如下，批准继续**。任一条件不满足即停再报。

## 裁决1：测试观测接线 —— 有限调整批准

- 原 3 个 fixture 的**输入一字不改**；264/304 的 callback 从 `must not dispatch` 迁移为「接收并断言 unavailable Error」（回退契约的组成部分）。
- **「stage+sentinel 被真实记录」的断言转移到新 fixture**，放在 tests/experiment-n.test.mjs：`$def`/`getLiubaiParams` 用**数据属性**包一个抛同一 sentinel 的函数，配**可记录的 traceLiubai/errorLiubai 出口**（appRoot 对数据属性 $def 正常返回，出口可达）→ 断言记录发生、sentinel 一致。每个 catch 点（app.resolve / params.call）各至少一条。
- **不许改 appRoot 的 accessor 回避规则**——那是防诊断提前消费业务 getter 的既有设计，本轮不动。
- 原 3 个 fixture 上保留的断言：回退值（null / `{}` / unavailable 分发）+ **全部业务 getter 消费纪律**（def/when 读取次数、store/session 零读取、bind 零值、diagnostics-no-read——你只读复核已确认仍通过的，一条不许松）。

## 裁决2：日志出口不可达时的契约 —— 「尽力记录」

- catch 必须**尝试**打点（生产代码路径保留，不删）。
- **可记录出口处**（新 fixture + 真机判读矩阵）：断言记录成功且 sentinel 一致——「吞错必记」在这层成立。
- **结构性不可达出口**（accessor-$def 触发 appRoot 回避）：以**回退值本身作为 catch 已执行的观测证据**，不要求记录（此时无出口可记）。
- **不许**为了让原 fixture 能记录而伪造日志出口、改生产 appRoot、或在测试里绕过通道直接塞 stage。
- 该契约分层写进 docs/experiment-n-probe-fallback.md，**并全部披露给双独立审查**。

## 裁决3：例外输入路径 $app 读取 2→4 —— 批准迁移，附三条件

- 仅限 304 这个「首次读取即抛」的**例外输入**；**happy path 读取计数（对齐 M oracle）必须继续原样锁死**（你已验证一致，不许动）。
- 迁移后断言实际值 4，测试注释里**列明 4 次读取各自发生的代码位置**，并确认**无一属于业务 getter 预读**；若其中任何一次是业务 getter 被多读 → 停下再报，不许迁移。
- 业务 getter 消费纪律的计数（def/when/store/session/bind）**全部保持原断言**。
- 本计数迁移列入审查披露清单。

## 其余

- probeApp 拆行（≤60 字符 stage、不改 app.js 通道、全字段可见断言）按第一批授权执行，不受本轮影响。
- 白名单维持四文件：shell.js / index.js / list-page.js / diagnostic-startup.test.mjs（后者只动 3 分支+必要 cb）。
- spec 与审查 prompt 更新：纳入本轮两个新发现（前置失败遮蔽的计数差异、fixture 出口不可达）与本裁决全文。
- 后续流水线照第一批授权末节执行不变；交付后归档实验M、进度兜底 remove+回读（你已提前完成，保持）。
