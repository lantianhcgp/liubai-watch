# 留白 SDK / 构建证据

## 工具链与身份

- 参考只读 `elcton-wear-sync` commit `2a8183a537db333df1d3eeb350015dbd99ac71d2` 及 `memo-todo` 的 `git show HEAD:entry/src/main/config.json`，没有复制工作区或指令/凭据。
- FA (`legacyAppTasks` / `legacyHapTasks`)，`modelVersion=6.1.1`。
- CI `ErBWs/setup-ohos@v2` 下载真实 CLT `6.1.1.280`；compile/target `6.1.1(24)`，compatible `4.0.0(10)`。
- 未签名开发身份 `com.hcbiu.liubai`，code `1` / name `0.1.0`，7 个注册页面：index/read/edit/menu/history/day/trash。
- base/media 的 `icon.png` 48×48，`icon-small.png` 32×32。签名后独立身份与签名材料由父任务负责；此流水线不签名，也不把签名文件上传到公开仓。

## 真实 SDK 白名单核准

证据为本机提取的 DevEco SDK：`qa/sdk/DevEco-Studio/DevEco-Studio.app/Contents/sdk/default/openharmony/js/build-tools/ace-loader/lib/`。该目录忽略，不提交；不是一套可在 Termux 本机执行的完整编译器。

- `templater/lite_component_map.js` 的 `litewearableTag` 明确含 `stack:{}`、div、canvas、list；list children 限 list-item，list-item 父限 list。
- `styler/lib/validator.js` 的 **Lite** position 组只有 `top`、`left`（`PERCENTAGE_LENGTH_VALIDATOR`），没有 `position` 属性。rich/card 的 `position: relative/fixed/absolute` 不能拿来作为 Lite 支持证据。stack 子元素可采用 left/top 偏移；不得擅自加 `position:absolute`、right/bottom/z-index。
- 同文件 Lite 的枚举校验与单位校验属于构建规则，不能证明真机布局行为；动态窗口尺寸仍走业务 layout 的 getInfo 成功值。
- Lite common events 明列 click/longpress/touchstart/touchmove/touchcancel/touchend/key/swipe。`component_validator.js` 把 common events 与组件 events 合并；qrcode、picker-view 具有独立 uevents，不能套用全部 common events。
- `rotation` **未列为 HML 事件/属性**；不可写 `@rotation`。页面 `$refs.<list>.rotation({focus:true/false})` 属运行时组件方法，以上三文件不能单独证明其真机支持；须继续沿既有已验证参考工程的方法，并在目标设备补验证。

## 应用公共 API

`$app.$def.getLiubaiParams()` / `setLiubaiParams(p)` 保存最小路由参数，供 common/shell 使用。
`onCreate` 只调用 callback `Store.init`，不等待 Promise，不加载整个内容或草稿，不阻塞页面渲染。
`whenLiubaiReady(cb)` 回传 `(err)`，`getLiubaiStoreState()` 返回 idle/loading/ready/failed/destroyed。业务页应先等 ready，再串行发 draftGet/settingGet/importFile 等 store 回调操作，避免初始化与单操作互斥冲突。`onDestroy` 调 `Store.dispose()`，无常亮请求。

## 执行与边界

```sh
bash scripts/build.sh
python3 scripts/verify-source.py
python3 scripts/verify-app.py --sanitize build/outputs/default/*.app
bash qa/start-sim.sh
# Alpine Node 的原生 WebSocket；无 npm 安装
proot-distro login alpine -- /usr/bin/node "$HOME/liubai-watch/qa/cdp.mjs" init /绝对路径/真实.app 412 484
```

verify-app 拒绝缺失产物/无 HAP/无页面/身份版本不符；sanitize 仅移除 Lite 不兼容构建注入字段并读回验证，不会编造 app。模拟器使用独立 `~/liubai-watch-sim` 副本，http 8791 与 CDP 9247 仅 127.0.0.1，独立 profile。
**上述为初始基线记录，不代表日志分支当前交付状态。** hmlwsim/V8 的离线 callback 文件宿主不是目标真机文件系统、JerryScript heap 或签名安装证明。

## 日志分支出包规则（2026-11-05 阶段二）

- 仅 `feat/logsink`，源码/SDK/签后身份固定 `liubai.nexus.by71x`，版本 `0.2.6 / code 8`，严格高于 read-a 基线 `0.2.5 / code 7`。
- `vendor/logsink.js` 为本机 canonical 模块固定快照（2921 B，SHA256 `6810b5f9ff34fe4dd6cf4655f75a89172c248dd01bb40ade94937e567cefbe77`）；公共构建以 `scripts/prepare-logsink.py` 生成 ignored 模块与**公开占位配置**。不向此 PUBLIC 仓库、CI、artifact 提供真实日志端点/写密钥/读密钥/私钥。
- 仓根显式 `type:commonjs`；CLT `6.1.1.280`，compile/target `6.1.1(24)`、compatible `4.0.0(10)` 保持不变。日志车道使用 SDK debug 输出并清洗注入字段，避免只修改 JS 却遗留旧 `.bc`；没有 bytecode 的真实 debug APP 才允许本地配置转换。
- workflow `build.yml` 在 push 自动触发；只在编译和门禁成功后上传 `liubai-unsigned-<run_number>`，保留 1 天，绝不上传配置后的 APP 或签名 HAP。
- 下载后：`python scripts/configure-logsink-app.py <ci.app> <local.app> --runtime-config <private-runtime.json> --report <private-evidence.json>`。转换仅改变实际 SDK `assets/js/MainAbility/app.js` 的公开占位字符串与对应 source map；七个业务页面、资源、config、pack.info 及全部其他文件字节相等。转换测试覆盖真实 ZIP、多层封装、凭据零输出、已有配置拒绝与 `.bc` 拒绝。
- 签名在本地，精确使用 `liubai-hc.p7b`（by71x）与显式配对 key；绝不用弃用 84dll profile。签后既验 CMS，也验独占 profile development leaf、4096 B 分片载荷摘要、身份/非零版本、实际七页及 manifest 版本、全页/app 48 KiB、未打包依赖、app 级日志接入、读密钥/私钥缺失和单字节负向。强验用 `--runtime-config`、不传 `--logger-page`，不豁免业务页。
- 本地配置后的 HAP 含可被逆向提取的写密钥，仅授权交付用户手机 `haps/`，不进公开 Git/Release/Actions。
- 真实 CI URL、SHA256、签名和最终门禁结果见 `docs/progress.md` 阶段二回填；真机安装、JerryScript heap 与 FIT3 表源日志仍需用户装机回执。
