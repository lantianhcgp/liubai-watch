# 留白：批准 V3 原生 UI 还原

## 唯一基线与源码

- 视觉基线：最终 approved-v3；8 项基线文件 SHA-256 已核对一致。没有改动原设计。
- 原生 UI 最终提交：`359bd3df0109c9bcc1100ed2eff49333c95fdc43`。
- 独立工作目录：`liubai-watch-ui-restoration`；分支 `feat/ui-parity-v3`。未用此工作副本替换原开发目录，未合并原分支。
- 真实 CLT 构建：GitHub Actions `41345098484`，结论 `success`。
- 未签名 `.app` SHA-256：`96702166d0c15e0b6f3f4f44607193c6ad93a4fe7c36ed9a764cb6bb991a3523`。
- bundle `com.hcbiu.liubai`；版本 `0.1.0` / code `1`；7 个页面。

## 还原内容

- 首页品牌和“写一条”：从批准稿直接渲染字重/图标 PNG，避免 Lite 缺少 font-weight / letter-spacing 的限制。
- 三点、书本、日历、置顶、工具、删除和换行均使用确切图形；不再用文字符号冒充。
- 列表和菜单：原生分割线节点、正确字号与间距、选中与禁用状态、底栏中线和内外圆角。
- 阅读：全文而非摘要，三档字号、原稿行距和短标题层级，正文锚点和进度。
- 编辑：默认收起键盘，正文优先；选中空行保留光标高度，未选段落空行按 V3 收缩。
- 原 CrabKeyboard 图集、键位逻辑和 flash 词库保留；横滑、中文候选、类型切换、空格、删除、换行、光标与应用内剪切板。
- 月份回看、当天、回收站以及空态；退出草稿、移入确认、非空剪切板、保存中和独立保存失败页。
- 保存失败保留编辑快照和旧持久正文；继续编辑/重试保存走真实 store 回调，不合成成功结果。

## 证据与验收范围

交互验收：实际构建 `.app` 经 hmlwsim 原始文件导入器解包，CDP 真实指针/点击/表冠滚轮；回调文件宿主使用隔离真实磁盘。故障测试只注入明确失败，保存中帧暂缓真实写回调后释放，不伪造成功。

视觉采集：412×484 方屏、454×454 圆屏、390×390 圆屏、336×480 窄方屏；每个窗口完整状态集合为 26 项。最终是否完整以 `final-matrix/verified.json` 与 `evidence-manifest.json` 为准，不能仅以截图数量或首帧证明通过。

- 原始 PNG：`final-matrix/*-actual.png` / `*-approved.png`。
- 同状态双列对照：`final-matrix/labelled-pairs/`。
- 组件级放大：`final-matrix/component-crops/`。
- 分页、输入、保存回读、取消、恢复、字号锚点与故障保字：`functional/functional-result.json`。
- Node 回归完整输出：`test-logs/results.json` 及 `.log`。
- 所有 MainAbility PNG 编译前后像素相等：`resource-parity.json`；键盘图集未重画。
- hmlwsim 宿主兼容改动单列 `qa/hmlwsim-host.patch`，不进入应用源码或安装包。

## 明确限制

这不是目标真机安装完成：AGC 当前请求返回 401；本地已授权凭据/会话仍在，留白的新 p7b 尚未取得。未借用其他应用证书，未输出伪签名 HAP。

hmlwsim 的 V8 仿真不证明 JerryScript 低堆、真实文件偏移与掉电恢复、物理表冠、图片释放或功耗；HYQiHei 在宿主缺失，以与原稿同一实际 Noto Sans CJK SC 字体别名做比较，不保证真机字形逐像素相同。原稿的机壳描边、实时日期及长行省略边界属于显示宿主差异，不应硬码动态数据或做整屏图片替代原生 UI。
