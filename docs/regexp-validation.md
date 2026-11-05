# 全包 regexp-test 清理与等价回归

## 范围与实测计数

目标为 FIT3 安装车道；不宣称所有 JavaScript 正则均不兼容。用户回填上一份日志版安装错误 34，成功对照包整包无 `.test(`；转义斜杠正则本身不是本轮移除目标。

任务交接列为 12 个源站点，但当前 `5a57630` 源码实际为 **10 次调用**：list-page 2、reader 7、menu 1；编译重复后上一份包为 23 次。reader 的 count 两次、locate 一次，不是交接中的两次、三次。按实际源码全量清除，未增删业务分支。

仅修改三个产品文件及 `scripts/verify-app.py`；其他应用、页面、存储、日志、构建和签名逻辑不变。

## 等价改写

- list-page：`dateShape` 校验长度 7/10、固定连字符、ASCII 48–57。原 typeof 短路、月份 1–12、年份正值、闰年/月天数、错误文案与返回原串全部保留。
- reader：ES5 `ws`、`isAZ`、`crlfEnd`、`hasNonWs` 替换原分类调用，标题/单词折行/CRLF EOF 行及偏移算法不变。空白使用 ECMAScript WhiteSpace+LineTerminator，含完整 U+2000–U+200A；U+0085/U+180E/U+200B 非空白。交接列遗漏 U+2003–U+200A，不能照抄不完整集合而改变正文语义。
- menu：剪贴板索引长度 1、字符码 48–55；原短路、剪贴板检查、原 action 转发、错误文案不变。

## 测试与门禁

`tests/fixtures/regexp-baseline/*.txt` 为修改前原源码的冻结 oracle，仅宿主测试使用，不进入表端。实际代码 VM 禁用 `RegExp.prototype.test`；旧源码使用独立 VM。测试先 RED，再等价实现 GREEN。

新增 5 个 Node 用例：日期形状/非字符串/日历、每个日期位置全 65,536 UTF-16 码元、分页结果与原偏移（空白/tab/换行/全角空格/拉丁连写/CRLF）、reader 分类全码元、menu 全码元及非法索引。既有 100 用例保留，全套 105/105；原 reader 用例未修改。

新增 4 个 Python 用例：app/七页/任意深层公共 JS/其他 Ability/根 JS、聚合 member+精确次数、合法其他正则与 map 排除、每个内层 HAP 扫描。全套 7/7；原 0/49152/49153 页预算和构建模式用例保留。

`verify-app.py` 对 .app 中每个 .hap 的 **所有 `assets/js/**/*.js` 成员原字节**计数 `.test(`，非零硬拒并列出全部 member 与次数；成功报告扫描成员数及零计数。保留全部既有 ZIP/身份/版本/页面/预算/app 存在断言。此门禁不通过修改 RegExp 调用方式规避，不删除合法其他正则。

复跑：

```sh
node --test --experimental-vm-modules tests/*.test.mjs
python3 -m unittest discover -s tests -p 'test_*.py' -v
python3 scripts/verify-source.py
python3 scripts/verify-app.py REAL.app
```

签后必须再次完整强验（含 runtime-config、实际配置 APP、negative）与独立签名容器全包复扫；签名/Node/SDK 通过不等于 FIT3 安装或表源日志 E2E 已验。最终交付与 CI 证据见 `docs/progress.md` 最新阶段记录。
