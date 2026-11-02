# r11 安装诊断：同源码 debug 构建

## 目标与边界

目标设备：用户当前 FIT3；安装错误为 DevEco 助手返回的 34「内部错误」。不再尝试获取表端或手机安装日志，不修改 approved-v3 界面、不裁功能，不修改默认分支或原开发目录。

源码对照点：`7333d41`（承接 `84778cd` 的 boot 拆包和最终 V3 源码）。本分支 `diag/r11-debug` 的 `entry/src/main/` 应与该对照点逐字节一致。

## 已确认的证据

- 手机 r10 HAP 与本地签包 SHA-256 相同：`a8702b01beac2431ffd68daefda890782b3bc69325089ac9c44bd23c5b73afae`。
- r10 已移除全部 `.bc`，仍安装失败；不能把 `.bc` 判作根因。
- 同型号可安装的元素周期表、课程表实际包为非压缩 JS + source map、无 `.bc`。
- 可安装包的 `assets/js/MainAbility/manifest.json` 与留白同样没有 `name`；该字段假设不成立。
- 原 CI `41370420498` 的实际构建输出：boot/index/read/edit/menu/history/day/trash 八个页面都报 `Failed to convert ... to a snapshot.`，但任务仍成功。它证明 release 构建的页面快照未生成，不证明安装 34 的唯一根因。

## 唯一产品变量

同一 V3 源码、CLT 6.1.1.280、compatible 4.0.0(10)、target 6.1.1(24)，把构建模式由 release 改为 debug。

签名复用 r9/r10 的留白 profile（不改 profile、证书或包身份）。清除构建注入的 `deviceConfig.default.debug` 与旧版 Lite 不兼容字段，遵循现有 sanitize 逻辑。

脚本保留 release 默认值。本分支 CI 显式传 `BUILD_MODE=debug` 和 `DIAGNOSTIC=1`；正式发布的严格体积门禁未被关闭。诊断模式保留全部代码，只报告超出保守项目 48KB 预算的页面。此预算尚未被证明是设备的 app+page 联合配额；debug 变大不能作为删功能或假称验收通过的理由。

## 门禁

1. 单测：默认严格体积门禁仍拒绝超限；诊断报告不改归档内容；构建模式显式且 release 仍默认。
2. 源码：身份、8 页、图片、CLT 设置检查，全部 Node 回归测试。
3. 真实 CLT 构建：检查产物完整性、source map/bytecode 数量、每页实际大小和入口配置。
4. HAP：签名后解析所有文件；与输入真实编译产物（仅允许包身份改写）比对；CMS/profile/全包摘要验证，确认华为证书链存在。
5. 手机落盘：HAP 的 SHA-256 与私有签包目录一致。
6. 真机：仅用户反馈安装结果后可认定是否解决 34。模拟器、CI 和本地验签不替代安装验收。

## r12：优先安装的启动诊断子集

完整 r11 debug 编译包的编辑页为 64,764 B，超过本项目保守体积预算。为避免该页干扰主安装试验，从 r11 的真实编译产物选出 boot/index 两页，并同步收窄 `config.module.js[].pages` 与 `assets/js/MainAbility/manifest.json.pages`。原有首页 JS、app.js、source maps 和资源逐字节保留，不修改源码或 V3 设计。

r12 的 boot 为 39,551 B、index 为 46,266 B、app.js 为 8,682 B；单页均小于 49,152 B，但 index+app.js 为 54,948 B，仍超出本项目未经真机证明的联合保守预算。全部资源刻意保留以避免再次混入裁资源变量；它不是极限缩小包，也不能用于宣称 JS/资源负载问题已被排除。

r12 是**仅供安装、打开首页的诊断包**。其他页面没有打包；不能使用「写一条」、便签详情、三点菜单或「回看」等跳转功能。它不能替代完整留白，也不能凭其能装就宣称完整版本修好。两包使用相同 profile/包身份，不能作为两个不同应用并存。

后续实际核查还纠正了旧 r6/r7 结论：旧最小包只含 boot/index 两页，但第二份 manifest 仍注册八页；该次试验清单不一致，因此不能用其失败排除应用内容或页面负载。

## 判读

先只安装 r12，报告「是否安装成功、是否能打开首页」，暂不安装 r11。

- r12 能装、打开首页：确认这份一致的启动子集可以运行；下一步再受控补回页面定位，不把多变量结果认定为构建模式唯一根因。
- r12 仍报 34：说明 debug + 一致两页清单仍不足以修复；继续基于已安装包做受控正反对照，不重复删 `.bc`、补 manifest `name` 或索要安装日志。
- r11 仅保留作完整同源码 debug 对照。其 20 项 hmlwsim 交互检查通过，但未安装到目标真机，不能证明设备 heap、图片释放或原生文件 API。

## 可复核结果

- CI：https://github.com/lantianhcgp/liubai-watch/actions/runs/41399008942
- 编译源码：`1ddb12f0a22168ec38ec0e3433ecbace507915e3`；`entry/src/main/` 对照 `7333d41` 零差异。
- r11 未签名裁图标后 APP：`917fddce511ea7bec11a52a807e9d75ff03d718ae46de068d5729b48321f8d9d`。
- r12 启动 APP：`94485304b5bca97a07f1d3c04b0c31ce486ef7787427044c265d0ed906d52189`。
- r12 已交付 HAP：`e7bd9c24a356a013b774275a48472124f27105516ab16df8f603a2e3a6f9404d`，3,924,580 B。
- r11 已交付 HAP：`2a5513cb26e4342835599f985fc07e2af1b773aeb20f48863b764529f4745b0a`，4,517,355 B。
- 签名后全文件对账：除 profile 要求的 config 包名改写外，编译负载与输入 APP 一致；CMS、profile、摘要绑定及三张华为证书链的直接签发关系均通过本地验证。
- r12 冷导入真实 APP：412×484、index ready、无 loading/error、23 个被核对组件尺寸非零、图片均加载；截图样例数据只在隔离 QA 文件系统，不打包进 HAP。
- debug 不再尝试 release 页面快照转换，`.bc` 为 0；没有新的 snapshot 错误**不等于**证明原 release 的快照编译器问题已修复。

实际装表结果仍待用户反馈。
