# FIT3 INIT_WAIT_LIMIT 最小初始化诊断

基底：37b2ac6635938de765bcfd87f2a3c354f0125840。
目标：截图已证明初始化未完成和等待槽位耗尽；没有最后一次原生调用证据，不宣称根因修好。

1. 存储格式、正文、journal、校验、写互斥、初始化 I/O 顺序和正常 HML/CSS/资源保持不变。不得删数据、重建 namespace、扩大 8 个有效订阅上限或在超时后释放底层 busy 锁。
2. store.init 返回只取消本观察者的句柄。取消后释放捕获的页面回调并从等待数组移除；幂等，ready/disposed/limit/queued 仍统一 once 和固定日志隔离观察者异常。
3. store.initState 只返回 pending、phase、waiters 三个标量。阶段使用 MK/AC/RD/WR/IO + DIR/TXN/A/B/PAGE + CALL/OK/FAIL/THROW，不含正文、用户记录 ID、路径或异常详情；返回对象不可修改 store。初始化终态 DONE/FAILED/DISPOSED。
4. 原生 callback 仍至多一次；旧调用重复回调不得污染后续调用阶段，也不得产生新 I/O。
5. index 启动一个 15000ms 的观察期限。成功/失败/隐藏/销毁清理句柄和 timer；迟到回调不得跨代次跳页。期限到只取消本页观察，错误页沿用既有布局，完整显示 INIT_WAIT_<阶段>。未知或不合规阶段仅显示 UNKNOWN，不拼接异常正文。
6. 返回/重新读取仍加入原初始化链，不另开同路径 I/O。合法迟到原生回调可完成初始化，随后正常新建、草稿、保存、回读与回收功能保持。
7. 原生页资源句柄在 data 声明。不加入常驻服务、轮询、无限递归 timer、Promise/async 等表端能力。
8. 版本 0.2.3/code5；源码与签后版本、身份、资源逐项验证。诊断候选仍待 FIT3 真机；模拟器不证明目标固件文件回调或真实存储行为。

TDD与运行证据在 /storage/emulated/0/Documents/liubai-init-trace-2026-11-04/。
