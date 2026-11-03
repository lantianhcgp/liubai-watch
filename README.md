# 留白 · 课程表底包全量重建

原生 HarmonyOS Lite Wearable 日记/便签；以已批准的 V3 为唯一界面基线，复用 CrabKeyboard 原始图集、键位与分片词库。

## 构建基础

- 工程骨架来源：lantianhcgp/elcton @ 2a8183a537db333df1d3eeb350015dbd99ac71d2；对应真实课程表 APP 来自 Actions 41257190699。
- 仅借已提交、脱敏的构建骨架；不借 clander、其他应用证书或未提交源代码。
- 原生 HML/CSS/JavaScript、FA 模型、CLT 6.1.1.280；第一页面 index，没有额外启动空白页。
- 版本 0.2.0 / code 2；开发包 com.hcbiu.liubai；安装身份由留白自己的现有有效调试 profile 核验。

## 功能与设计

随记与按日回看共用记录；全文完整行逐屏阅读、三档字号、正文位置恢复；已有记录先定位正文，新建直接展开原螃蟹键盘。中文候选、英文/符号、横滑、上滑、光标、换行与应用内剪切板；草稿、置顶、回收站恢复。保存成功以实际写入及回读确认，失败保留原文与编辑文字。

近黑、暖白、纸金的原始视觉不重做；导航、图标、字重/字号、分割线、正文和键盘占比均需按状态验收。

## 三套工具分工

朋友 kqakqakqa 的 hmlwsim 与华为官方 Lite Simulator 同时为正式测试环境。自制 lite-sim 仅辅助定位规则、绑定、事件和布局问题。不得把任何一套浏览器仿真或单个首帧当成真机兼容证明。

## 当前状态

本分支为独立全量重建，测试结论仅以本版真实 APP 的相同 SHA 与测试证据为准。原 R18 报告不能授权本版通过或签名。构建、双模拟器及签名核验尚在执行时，不标记完成。

工作计划见 docs/rebuild-plan.md；底包来源见 docs/elcton-base.json。

单元测试：node --test --test-concurrency=1 tests/*.test.mjs
包体负向测试：python3 tests/test_artifact.py
真实构建与官方测试：.github/workflows/rebuild.yml

真实手表固件、长期功耗、原生文件掉电恢复、低 heap 设备与物理表冠，不能仅据模拟器成功宣称通过。
