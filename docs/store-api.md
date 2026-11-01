# 留白 Store：页面接入契约

源码：`entry/src/main/js/MainAbility/common/store.js`。只依赖 `@system.file`，所有接口为 callback `(error, value)`，不是 Promise；错误时不能显示“已保存”。本契约先行发布，实现与测试正在此 worker 内收敛。

## 生命周期与可靠队列

- app 统一调用一次 `init(cb)`，页面等待其成功后读写；store 不替父页面处理争抢 init。未初始化报错，重复并发 init 明确 busy。成功值 `true`。
- 完成或拒绝均仅一次回调；可能同步报参数/状态错误，页面不要依赖回调一定异步。
- 单路 native I/O 串行队列，**活动任务 + 等待任务最多 8 个**。普通读写最多占用 7 个名额，最后一格保留给手动 `save`；普通任务超过容量报 `queue full`，不得静默丢弃。
- `save` 不因 autosave/read busy 而丢失：优先于等待的普通任务，在当前任务结束后执行；同时最多一个已接收 save（包括等待/执行/回调交付），再次 save 明确 `save already in progress`，不自动重复落盘。页面可在 save 回调完成后再次保存。
- 普通任务 FIFO，输入在接收时取 JSON 快照，页面后续修改不影响已接收内容。页面仍须 debounce draft/setting autosave，并对 queue full 显式重试/保留 dirty。
- `dispose()` 为 app store 最终关闭，**不要每个页面 onDestroy 调用**；关闭后所有活动/等待 callback 失败，迟到 native callback 不推进旧任务。
- native write 超时/取消可能迟到实际落盘。store 保留 write fence：此时拒绝所有新任务，已排队任务明确失败；只有迟到 native 写结束并成功删除不确定提交后才能再次尝试。不得通过 init 重置 fence。
- save 成功后由页面显式 `draftClear(cb)`，store 不自动清草稿。普通队列 FIFO；save 会越过等待的 autosave，故父页面必须取消旧 autosave 定时器，之后排一次 draftClear，避免过期页面重新提交草稿。页面回调须做生命周期/编辑版本判断，不让旧回调覆盖当前 UI。

## 公共接口（保持同名同参）

| 接口 | 输入 | 成功值 |
| --- | --- | --- |
| `init(cb)` | 无 | `true` |
| `list(query, cb)` | `{filter:'all'|'pinned'|'trash'|'day'|'month', day:'YYYY-MM-DD', month:'YYYY-MM', offset:0, limit:6}`；limit 1..12 | `{items:[metadata], total, hasMore}` |
| `load(id, cb)` | ASCII ID | `metadata` 加完整 `body` |
| `save(record, cb)` | `{id?, body, created?, pinned?, deleted?}`；新记录 id 可省略或 `''` | 保存后的 metadata |
| `flag(id, flags, cb)` | `{pinned?:boolean, deleted?:boolean}` 至少一项 | 更新后的 metadata；不增加正文 revision |
| `draftGet(cb)` | 无 | 草稿或 `null` |
| `draftPut(draft, cb)` | 见下 | 已存草稿（`body` 标准字段，不返回重复 text） |
| `draftClear(cb)` | 无 | `null`；双代 tombstone |
| `settingGet(key, cb)` | ASCII key | JSON object 或 `null` |
| `settingPut(key, value, cb)` | JSON object/null；JSON 值 ≤1600 UTF-8 bytes | 已存 value |
| `dispose()` | 无，无回调 | 无 |

ID/key 为 `[A-Za-z0-9_-]{1,40}`；不允许路径、中文或特殊符号。`metadata` 为 `{id,created,date,time,title,preview,pinned,deleted,revision,bytes}`；created 毫秒时间戳，首次建立后更新保持原日期；title 为首个非空行最多72 UTF-8 bytes，preview 最多96 bytes。list 只读小索引，不载正文；排序 pinned 优先，再 created 降序，ID 稳定打破同时间平局。offset 会引入重复扫描，页面每次明确处理 total/hasMore，数据变更后重置分页。

## 正文与草稿

新正文最多 **3072 UTF-8 bytes**，空/全空白、孤立 surrogate 拒绝，绝不静默截断。旧记录超过3072仍完整读取、flag 保持不变；改旧长文允许不增长（可缩小），最大安全读入32768 bytes，超出明确报错且文件保留。存储字节分块只保证有效 Unicode scalar/surrogate；combining/ZWJ/variation 的用户感知 cluster 由父 reader/keyboard 处理，store 不改变正文。

父 editor 草稿可传：

```js
{body: text, text: text, id: '', cursor: 0, type: 0, pinyin: '',
 open: true, original: '', created: 0, viewAnchor: 0}
```

- `body` 或兼容 `text` 至少一个 string；两者同时出现必须完全相等。只存/返回 `body`，**移除重复 text**。
- id 可 `''`、省略、null 或合法已有 ID。其余编辑字段及有限 JSON extras 原样保留，数值 type=0、open 不做 truthy 丢失。
- 正文以 UTF-8 chunk 文件保存（2800 byte/块），不是完整大草稿 JSON。小 meta/descriptor 的封装 JSON **<4000 bytes**；超过则明确拒绝并保留旧草稿。original 等 extras 如过大也拒绝，不暗中截断。
- 老格式草稿兼容读取；其旧全 JSON blob 可经旧格式解析，但新写只走 body + 小 meta。

## 页面落盘边界

保存按钮设页面 saving 防重复；callback 成功才更新 ID/revision、清 dirty/草稿并跳页。失败保持正文与光标，提示重试，不宣称 atomic。未清草稿不代表保存失败。读页 setting 建议存 `{id,revision,anchor,size}`，revision 是正文版本，恢复 anchor 前匹配 id/revision 且由 reader 校验 cluster 边界。setting/draft 没有自动合并，后发 FIFO 写即后状态。

生产每个 native 操作 watchdog 固定 **10000 ms**。CLOCK 注入仅测试 VM 使用，用于主动推进 fault stall，正常磁盘 I/O 不受80ms缩短。真机断电/heap/耐久性仍需父验收，不作为此 Node 测试保证。
