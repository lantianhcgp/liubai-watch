# store.js 六项无 RegExp.test 等价校验

范围：`feat/logsink`，基点 `3ede738`。本轮只改 `common/store.js` 的六项校验；该模块只由应用 `app.js` 打包，页面通过 `store-page` 使用同一公共 callback API。页面 JS/HML/CSS、应用日志生命周期、构建脚本、配置/版本及所有门禁保持原样。

## 等价规则

| 原表达式 | 新算法 | 必须保留的边界 |
|---|---|---|
| `typeof s === 'string' && /^[A-Za-z0-9_-]{1,40}$/.test(s)` | 字符串类型、1..40 长度、逐码元 ASCII 范围 | 不转型；只允许字母/数字/下划线/连字符；拒非 ASCII、换行和路径符号 |
| `/Corrupt/.test(e.message)` | `String(e.message).indexOf('Corrupt') >= 0` | 大小写敏感、非锚定子串；保留缺文件、损坏双代与健康代回退逻辑 |
| `/\S/.test(input.body)` | 逐码元寻找不属于 ECMAScript WhiteSpace/LineTerminator 的字符 | 不 trim 正文；保留 NBSP、BOM、Unicode 空格/行分隔；U+0085/U+180E/U+200B 等不误当空白；原 `U.valid` 仍先拒孤立 surrogate |
| `/^(all\|pinned\|trash\|day\|month)$/.test(filter)` | 一次 String 转换，五个精确值比较 | 保留 `q.filter || 'all'`；不将原 query 归一化；单元素数组可通过校验但仍不是后续严格比较的 filter 字符串 |
| `/^\d{4}-\d{2}-\d{2}$/.test(q.day || '')` | 一次 String 转换、长度 10、固定连字符、ASCII 数字 | 仅格式验证；不新增闰年/月日范围限制；原 query 的严格相等过滤不变 |
| `/^\d{4}-\d{2}$/.test(q.month || '')` | 共用格式函数、长度 7 | 同上；非 ASCII 数字及任何前后缀均拒绝 |

String 转换发生在与原 RegExp 校验相同的短路位置。公共输入的原 JSON clone、类型/flags、限额、错误文字、callback、排队、持久化及销毁流程不变。转换失败的 JSON 对象仍按原路径返回 TypeError。这里证明公共 store 接口的既有可达行为，未扩展为任意 monkey-patched ECMAScript 内建对象的保证。

## 回归方法

`tests/store-validation.test.mjs` 使用既有公共 store callback 与真实磁盘 `@system.file` host；测试 VM 禁用 `RegExp.prototype.test`，宿主中原六条表达式作为独立行为 oracle。每项先在旧实现上失败，再在新实现上通过。

- 六个独立用例：key、Corrupt、body、filter、day、month。
- key、body、day 数字位、month 数字位分别遍历全部 65,536 UTF-16 单码元。
- 全 ECMAScript 空白集、NBSP/BOM、组合音标/中文/emoji、孤立 surrogate、非空原文往返、3072 字节预算。
- 空/非法/非字符串/数组/嵌套数组/toJSON/toString 转换失败、完整字符串锚定、非 ASCII 数字、前后空白/换行、日期形状但非法日历值、分页限额。
- Corrupt native 错误字符串转换、大小写、子串、健康代回退、双损坏拒绝及双读排空。

运行：

```sh
node --input-type=module --check < entry/src/main/js/MainAbility/common/store.js
node --experimental-vm-modules --test tests/*.test.mjs
python -m unittest discover -s tests -p 'test_*.py' -v
```

本地结果：Node 100/100、Python 3/3，通过且无跳过。新算法使用原有 ES5 字符串/数值操作，无新常驻数组、正则、计时器、依赖或正文副本；key/date 扫描有固定上限，body 扫描仍受原安全载荷限额约束。最终真实 SDK/签后门禁、CI SHA 和 HAP SHA256 见 `docs/progress.md` 最新阶段。

## 验证边界

这些是 Node/V8 与实际磁盘公共接口回归，不是真机 JerryScript 白空间表/堆峰值或 FIT3 安装证明。不更改或绕过 Install-34 强门禁，也不推广为所有 JS 正则禁令。实际 SDK `app.js` 必须另验毒点缺失、日志写侧集成、七页/应用预算与资源；签后须精确 by71x profile、独占 leaf CMS、载荷摘要、源包逐文件对账及 1B 负向通过。安装与表源 ACK/云日志仍需用户回执。
