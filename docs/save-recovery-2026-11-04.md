# 留白 V3 保存故障：保字恢复与取证版本

基底：b2973d9f0619baba0bc66f5a9f3bf68a3770480b。隔离分支：fix/save-fit3。
版本：0.2.1 / code 3；安装签名身份必须沿用已交付的 liubai.nexus.by71x。

## 用户故障与证据边界

FIT3 新建记录，点完成后出现读取失败，再保存回到保存失败页。真机截图只显示通用提示，没有具体错误码。旧版的模拟器通过不能证明真机能够保存。

按用户指定使用自己的 lite-sim（~/hw_watch/lite-sim/web/runtime/engine.js 的 Page 和 ModuleLoader），加载本分支完整原始源码，并将文件回调接到隔离临时真实磁盘。设备信息为明确的 FIT3 测试输入。正常首次保存、自动草稿后保存、一次读回故障后的手动重试可以通过，不能据此声称复现了硬件根因。

原版失败初始化之后，保存直接返回 STORE_NOT_READY 且不重试初始化。这一恢复缺口在原始源码的失败初始化负例中确认；模拟器保留编辑器 seam 是明确的测试注入，不是用户真机操作证明。

官方 HMS 文件接口 ExecuteReadTextFile 反汇编显示读取长度按 min(file_size, length) 限制，不能据此把 length:4096 大于短文件长度认定为故障原因；本次不改变文件 API 参数、journal 格式、校验、路径或数据。

## 最小改动

1. 保存遇到 STORE_NOT_READY，保持保存互斥与当前文字，只尝试一次已有 store.init，再对同一文本调用保存。重复 init/save 回调不重复提交，销毁之后不再次调用保存。
2. 失败页保留当前正文与原记录，现有第二提示行显示底层代码（限长 26 字符）；路由只带错误码和记录身份，不带正文。
3. 启动读取错误页改为真实“读取失败”与“重新读取”动作，不再用保存失败提示伪装。
4. 已提交记录的 clearDraft 同步异常必须显式解锁并导航至这条真实记录，记录清草稿错误；不能变成保存锁死或新建第二条正文。
5. 版本升级，HML/CSS、原 V3 几何、字号、键盘、读取分页与正文数据格式保持不变。

## 验证

```sh
npm ci --ignore-scripts --no-audit --no-fund --prefix tools/sign
node --test --test-concurrency=1 tests/*.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py'
python3 qa/own_sim_run.py --out /storage/emulated/0/Documents/liubai-save-fix-2026-11-04/own-sim-normal-final
python3 qa/own_sim_run.py --scenario init-fail --script qa/own_sim_recovery.mjs --out /storage/emulated/0/Documents/liubai-save-fix-2026-11-04/own-sim-recovery-final
```

测试先红后绿：原版缺少初始化恢复与错误码显示，负例失败；复审发现清草稿抛异常导致 saving=true，新增负例确认后修复。完整 Node 回归 267 个、Python 45 个通过；自己的模拟器正常链路 6 个、明确故障注入 5 个检查通过。每次浏览器与服务结束后核验归属进程清零和端口关闭。

qa/own_sim.html 的 DiagnosticPage 只对 browser CSS 数字长度及 stack absolute 偏移作明确布局桥接；CSS 单类选择器先分行，资源通过单个 /api/res 路由。它不是固件、JerryScript 堆、真机图片内存或精确原生字体证明。不要将诊断画面与真机截图宣称像素一致。

## 真机确认事项

此版定位为“保字恢复 + 错误码取证”，不是“真机保存故障已彻底修复”。必须同签名身份覆盖升级，不卸载、不清数据；失败时记录新显示的代码，下一步据具体代码定向查文件/正文校验/权限/空间。若升级器拒绝覆盖，不应为了安装而卸载旧应用。
