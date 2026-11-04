# 留白 INIT_WAIT_RD_A_OK 最小修复规格

基底：94067b69c47c04214eb10c56d0ed82659871c540 (0.2.4 code6)。候选：0.2.5 code7，隔离fix/read-a-continuation-fit3，未授权合并主分支。

真机事实：截图WatchScreenshot_20261104_161924.png显示读取失败/原记录保留/INIT_WAIT_RD_A_OK。没有真机异常堆栈/数据副本，不把该码解释为JSON损坏或证明getter出错。

源码及签后实际编译factory的14组显式故障注入确认：readText结果text取值抛错导致init订阅悬空；原readJson把下游cb放dec的try内，校验异常误归INVALID_DATA。正常/坏JSON对照可结束。

实现验收
1. readFile对text属性只读取一次并做局部错误处理；异常为TXT_THROW（既有ROOT/RECOVERY前缀后最长26字符），调用者保留既有ROOT_DATA_等前缀；不接受异常结果作为不存在、不继续初始化写根、不输出异常/正文。
2. readJson仅包dec(s)，下游cb不在parse try。初始化内部续回调异常只一次结束所有有效观察者，错误INIT_CB_<最后短阶段>；复用现有完成和once策略。用户订阅回调隔离、取消、队列8上限、dead和native单次返回守卫仍有效。
3. 初始化I/O永久不回仍由已有页面15s观察超时处理；新增callback保险不能把超时当原生返回、不能强行释放pending API busy。
4. 提供有限短标记：RD_<A/B/PAGE/TXN>_TEXT、TEXT_OK、JSON、SUM、JSON_OK、ROOT；更新list-view.js严格白名单使这些阶段不会变UNKNOWN。其他任意阶段/内容仍UNKNOWN，原UI不变，错误码必须适合既有26字符提示行。
5. 存储格式、ROOT命名空间、4096B读、8条/页、256记录、事务恢复和单写锁不变。已有根/正文/草稿不得删除或重建，备用根逻辑不变，不改HML/CSS/资源/API种类或安装profile。
6. 以真实代码单测先RED再GREEN，至少同步/异步故障、重复native callback、单次取值、8订阅者、失败后原生fresh retry、备用根、真实磁盘逐字节保护、严格阶段白名单与hint长度。
7. 全回归、构建真实APP、签后CMS/profile完整链/资源相同、朋友hmlwsim真实APP全流程及逐组件视觉。结论明确不证明FIT3固件、heap、物理表冠或签名封装安装；最终仍真机待复测候选。

禁止：清数据/卸载、改版UI、改Hermes配置/重启CLI、实现会话轮换、上线主分支、用旧模拟器报告授权新版、将故障注入称真机复现。

证据主目录（用户要求）：/storage/emulated/0/Documents/liubai-read-a-2026-11-04/。完整规格与计划在该目录；进度仍更新Documents旧黑屏总进度，15分钟纯脚本40c6b05e34dd，结束list→remove。
