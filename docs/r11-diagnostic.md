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

## 判读

- r11 能安装：构建模式相关，继续在保持 V3 的前提下处理真机运行和正式包体约束。
- r11 仍报 34：debug/release 整体构建模式不是充分修复；不得重复删 `.bc`、补 manifest `name` 或索要安装日志。转向已安装包构建/打包链的受控正反对照。
