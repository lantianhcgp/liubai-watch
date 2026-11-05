# 留白日志接入进度

## 2026-11-05：隔离接入PASS，签包交付BLOCKED

### 已验证结果

- 从 `a0a47daf54a776d1e4341397fe2e4337a9aef72c` 创建 `~/liubai-watch-logsink` / `feat/logsink`。主checkout实际16个脏文件（3改+13未跟踪）及logger的3个脏文件均hash/HEAD/branch/status不变。
- logger固定源 `80b09b6a8b2f059f47bd6c94252001b5e68f0cca`，canonical2921B。npm ci→integrate dry-run→正式→NO CHANGES PASS；namespace liubai、ver默认取源码0.1.0。清一行尾随空格后再次幂等/语法/毒点预检PASS。
- app.js +11行（两个import、onCreate单次init/page、onDestroy finally stop），ignore +4行；七页业务及Store/Session未改。
- 三文件 `node --input-type=module --check`、AST禁test-call/escaped-slash-regexp PASS。权威source含 `String(config.endpoint).indexOf('https://') !== 0`，生成模块与canonical字节一致。
- 模块2921/3072B，app与七页源码均严格<49152B，最大menu13012B；最终app字节数在 `~/lw_build/liubai-logsink/final.json`。FA config无reqPermissions/INTERNET；common两文件ignored且未跟踪。log-config保留空key stub，未启用表侧云上传。
- logger `LOGSINK_FILE=watch/logsink.js node --test tests/*.test.mjs` 10/10 PASS。留白 `node --experimental-vm-modules --test tests/*.test.mjs` 94/94 PASS，零跳过；首次少flag的44个FAIL是vm.SyntheticModule宿主错误，加flag后全绿，无业务改码。
- source prerequisites和git diff --check PASS。logger审计340对象/55已知secret/零命中，worktree working候选173/零命中；提交前再跑工作区+历史审计。
- 零LLM `python tools/fetch-logs.py --app liubai --interval 5` 已就位，PID31518/session proc_979d41aa732a；poll和/proc命令/非僵尸存活验证，`~/.hermes/watchlogs/liubai/` lock/index/cursor存在，无新JSONL正常。没有制造日志，不是开机常驻保证。

### 不可降低的硬阻塞

1. OpenSSL实际解出主仓 `certs/liubai.p7b` 与 `~/liubai-watch-sign-private/p7b/liubai.p7b` **都为弃用身份 liubai.nexus.84dll，不是要求的liubai.nexus.by71x**。主仓p7b SHA256 a120c7162af272e54ecb012ee2a8a40d5a006a13f75f4ddab2590ee2b67254d2，副本2de490b743ec183699cc75504aab680fbabf6edd910a1bcce0eb7af1084d496a。未改证书/签名/登录AGC/开浏览器/滑块。
2. p7b为ignored文件，git worktree不复制；隔离worktree的certs/liubai.p7b不存在。文件名或旧进度不能验证身份。
3. 本机PATH无ohpm/hvigorw，home及现有proot查找无同名工具。实际 `bash scripts/build.sh` exit127：`Missing compiler prerequisite: ohpm`。未触发CI/装新工具链/拿旧.app伪装新编译。

版本仍code1/name0.1.0，未做无包版本递增。真实SDK app/page预算与manifest资源门禁、legacyCMS/strong/1B-negative均 **NOT RUN/BLOCKED**；未产生/交付 `/storage/emulated/0/haps/liubai-2026-11-05-日志版.hap`，HAP SHA256不适用。**不能声称“包已验”。**

### 恢复条件/设备边界

- 指定真正by71x的p7b先解析身份+leaf/key匹配；提供本地CLT或授权CI后再升版本，同步既有verify-source/verify-app的硬编码版本断言（不能放宽预算）。本地写侧配置私下注入，namespace仍liubai。
- 真实脚本在 `~/lite-watch-logger/tools/sign/verify_sign.py` 和 `tools/sign/verify_hap_strong.py`，先help；强验必须by71x、新code、源.app/runtime-config和negative。HAP含可提取write-key只本机交付，不入git/public。
- 签包强验后才让用户直装器装FIT3。本app未打印Application onCreate文案：自动主动marker仅tag:page/MainAbility；前者需宿主实际console.info才捕获，不保证当前已有。pending/failed/dropped/sent是L.status，stop可能丢未ACK destroy行。
- FIT3装机/表源HTTPS+ACK/跨页console/JerryScript64KB最差档heap/file/图片释放/E2E均待用户；未做模拟器或网络适配器E2E冒充。

### 证据与共享记录

`~/lw_build/liubai-logsink/` 留真实stdout/JSON、保护快照/毒点预算/签名阻塞/collector/final commit。共享README追加前已逐字节备份为 `README.before-liubai-20261105T153835Z.md.bak`，原历史保留。本feat/logsink仅本地commit，不push。


## liubai 日志版阶段二：出包 STOP（2026-11-05 任务，记录于 2026-11-06 CST）

- 已解除原始证书/本地工具链阻塞：精确 profile `liubai-hc.p7b` 为 `liubai.nexus.by71x`，caps、有效期、一台 UDID 绑定及显式 key 公钥配对 PASS；未用弃用 84dll、未碰 AGC/浏览器。
- 仅 PUBLIC 仓 `lantianhcgp/liubai-watch` 的 `feat/logsink` 已推，当前 commit `145093a33163d4587fb96b2107a58117075cd4fe`。开发基线 0.1.0/code1 升到 0.2.6/code8，严格高于 read-a 0.2.5/code7。`feat/liubai-v1`、原 liubai 工作树及 logger dirty 文件未变。
- 公开前审计 180 跟踪文件、222 历史 blob：真实 endpoint/写密钥/读密钥/私钥零命中，common/log-config.js ignored/untracked。CI 固定 2921 B canonical + 公开占位配置；真实配置只允许下载后本地变换，签名材料不上 CI。
- 本地留白 94/94、logger 10/10、ZIP 配置变换测试 1/1、三文件 JS 语法、source 门禁 PASS；新测试先 RED 再 GREEN。未削弱页/app 48 KiB、身份版本或强签门禁。
- 第一次 CI https://github.com/lantianhcgp/liubai-watch/actions/runs/42061147389 ：93/94，通过前置生成但缺仓外 CrabKeyboard 参考；已补固定公共提交 `656f8ad842a8692bc3b2b975d6b648880232c592`，未跳过测试。
- 第二次 CI https://github.com/lantianhcgp/liubai-watch/actions/runs/42062331192 ：failure。真实 SDK 编译已执行，`scripts/verify-app.py` 拒绝 `Empty/over-budget compiled page: assets/js/MainAbility/pages/edit/edit.js`（48 KiB=49152 B 门限）。失败包不上传，artifact count=0；日志未给出该页实际 bytes，不能捏造精确尺寸或断言一定是空/超限中的哪一项。
- 按“两次阻塞即停”停止本轮，无第三次重跑，不借旧 APP，不放弱门禁。**本轮没有生成/交付签名 HAP；SHA256=null；CMS 与强签门禁未运行，不能宣称出包成功。**
- 采集器 PID31518 真实存活，`python tools/fetch-logs.py --app liubai --interval 5`，输出 `~/.hermes/watchlogs/liubai/`，未重启/删除日志。
- 证据 `~/lw_build/liubai-logsink-stage2/final.json`、`ci-42062331192-failed.log`、`ci-failure-summary.txt`、pre-push/profile/protected 快照。此记录只追加并先备份，不抹掉阶段一失败历史。
- 后续须单独授权排查实际 SDK edit.js 空/超预算问题并重建；不得改成签名旧包。未来交付合格 HAP 后，用户在直装器界面手动装机，打开留白，验证 tag:page/MainAbility 与 pending/failed/dropped/sent；本轮没有真机安装、watch ACK 或表源 E2E 证据，自动推送装机通道仍未打通。

## liubai 日志版阶段三：size 根因修复、CI GREEN；产品强验 STOP（2026-11-06 CST）

- 断言历史已核实：`ee600a7` 初次创建 workflow/build.sh/verify-app.py 就执行 `0 < size <= 49152`。旧绿 CI41324396850 的真实 verify 输出 edit.js=38743 B，因此不是旧 workflow 漏跑门禁。
- 诊断提交 `2d22f79` 只在原断言前打印实际页 bytes；CI42070431401 真实 debug 编译 edit.js=61388 B 后失败。裸 `feat/liubai-v1` 未改动，dispatch CI42070447479 成功，edit.js=38743 B，下载真实 APP 确认零 `.bc`。
- 根因是阶段二 `ae0de2d` 把 v1 `release` 改成 `debug`，不是 logsink 改了编辑页，也不是键盘 checkout 造成内联。修复 `765786d42061fb8d099315673c7cec63cc221506` 恢复 release，保留固定 CrabKeyboard 参考、commonjs、全部产品代码及49,152 B门限。构建模式用实际脚本适配器先RED再GREEN；0/49152/49153边界仍分别拒绝/通过/拒绝。Python3/3、Node94/94零跳过PASS。
- 新真实 CI https://github.com/lantianhcgp/liubai-watch/actions/runs/42071328364 **success**，APP已下载，edit.js=38739 B、app.js=25177 B、七页全部合格，实际产物无 `.bc`。config/manifest固定by71x、0.2.6/code8和原七页。仅配置后APP的app.js/map改变，其他文件逐字节保持；未将真实配置上传PUBLIC仓或artifact。
- 本地精确 `liubai-hc.p7b` + 显式 `key.pem` 签出私有候选；签后header/config/profile=liubai.nexus.by71x，version=0.2.6/code8，legacy CMS exit0。独占profile leaf CMS、4096 B分片摘要、双清单实际集合/版本、全部页/app预算依赖、资源字节相等及真实1B载荷反例分别PASS，**这些部分检查不等于完整强验通过**。
- **完整 `verify_hap_strong.py --bundle liubai.nexus.by71x --version-code 8 --app <configured.app> --runtime-config <private.json> --negative` exit1**；现场原因 `Install-34: .test( call forbidden in MainAbility/app.js`。app.js的6处调用均继承v1 `common/store.js`：line30 key验证、112 Corrupt识别、387非空正文、478 filter/day/month三项。不是logger新注入；裸v1 app.js同样6处。未弱化强验，未绕过毒点门禁。
- 继续需要用户明确授权产品层等价改写这6处校验，补语义/Unicode/日期/非法输入回归，再新CI/签名/强验。也可保持本次CI修复并暂缓交付；**禁止删除校验或仅把 `.test` 换成另一个调用方式躲门禁**。本轮按“需要产品代码改动则停”停止，七页与store.js相对v1未改。
- **没有交付** `/storage/emulated/0/haps/liubai-2026-11-05-日志版.hap`（目标不存在，交付SHA256=null）。候选仅留 `~/lw_build/liubai-logsink-stage3/liubai-0.2.6-by71x-candidate.hap`，含可提取write-key且完整强验不通过，不可发布/当作验收包。证据 `~/lw_build/liubai-logsink-stage3/final.json`、A/B日志、真实APP、配置provenance、sign-results和crypto-core。
- 采集器PID31518状态S，实际命令`python tools/fetch-logs.py --app liubai --interval 5`仍存活；未重启或删除日志。进度/共享README追加前已逐字节备份。未开浏览器/碰AGC/推v1或其他分支/改logger dirty。FIT3安装、watch-origin ACK/云日志/JerryScript heap均未验，不能把签包/CMS部分通过冒充E2E。
