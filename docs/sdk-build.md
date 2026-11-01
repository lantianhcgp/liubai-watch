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
python scripts/verify-source.py
python scripts/verify-app.py /path/to/actual.app

# 本次隔离车道：hmlwsim 真实包解析、CDP 9257、HTTP 8792。
# 使用前准备独立模拟器副本和当前 .app 路径，详见 ui-restoration.md。
node qa/import-parity-artifact.mjs
node qa/parity-functional.mjs
node qa/parity-matrix.mjs fit3
```

verify-app 拒绝缺失产物/无 HAP/无页面/身份版本不符；sanitize 仅移除 Lite 不兼容构建注入字段并读回验证，不会编造 app。本次模拟器为独立 `~/liubai-watch-ui-sim` 副本，HTTP 8792 与 CDP 9257 仅 127.0.0.1，独立 profile；旧 8791/9247 配方不用于本次最终验收。
**已执行真实 CLT 构建，最终 UI 源码 `359bd3df0109c9bcc1100ed2eff49333c95fdc43`，CI `41345098484` 为 success。** 原始 `.app` SHA-256 为 `96702166d0c15e0b6f3f4f44607193c6ad93a4fe7c36ed9a764cb6bb991a3523`；独立 hmlwsim 读取同一真实包、20项交互回归已通过。回调文件宿主不等于真机文件系统，V8 不证明 JerryScript heap 或签名安装；签名/真机项目仍单独待验。最终截图验收记录见 `docs/ui-restoration.md`。
