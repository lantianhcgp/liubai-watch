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

## liubai 日志版阶段四：完整强验 PASS，已交付（2026-11-06 CST）

- 按新授权，`store.js` 六处 `.test(` 严格等价改为 ASCII key 扫描、Corrupt 子串、ECMAScript 空白扫描、五值 filter 和 day/month ASCII 形状检查。保留原转换/短路/错误/callback/日期只验格式及后续严格相等；不删校验、不 trim 正文。算法与回归细节见 `docs/store-validation.md`。
- 产品提交 `b3640bd8798005c3e8771458a32d4fcba673758b` 只推 feat/logsink 并精确回读。新增六用例旧基点全部 RED→新实现 GREEN；key/body/day/month 数字位分别遍历全部 65,536 UTF-16 码元。本地及 CI **Node100/100、Python3/3，无跳过**。
- 真实 CI https://github.com/lantianhcgp/liubai-watch/actions/runs/42077906090 **success**，headSHA 等于上述提交；唯一 artifact `liubai-unsigned-29`。真实 APP 905815 B，SHA256 `e6a60e3daf7f0b686fa9f136936680d9c272263b54ce1896096917516a27b1b1`；app.js 25753 B，edit.js 38739 B，实际无 .bc。相对阶段三真实 APP **只有 app.js 改变，另外196个资源与七页字节相等**；页面/配置/应用源码/构建/签名门禁33个保护文件哈希未变。
- PUBLIC源码、CI日志和artifact无真实端点/写密钥/读密钥；下载后本地既有转换器实际仅改变 app.js（25753→25763 B），source map及其他文件完全相等。精确 by71x `liubai-hc.p7b`（profileSHA256 `6b527065bf704741626981ee5ffe1586946d90908de31d3489906d99bcbc52c3`）与显式 key 配对签名，身份 **liubai.nexus.by71x / 0.2.6 / code8** 保留。
- legacy CMS 与完整未修改 `verify_hap_strong.py --bundle liubai.nexus.by71x --version-code 8 --app <configured.app> --runtime-config <private.json> --negative` **exit0**；不传 logger-page、不豁免业务页。独占profile leaf CMS、分片载荷摘要、身份/版本/双页表+实际集合、全页/app预算依赖、资源逐字节、写侧日志/读密钥与私钥缺失、app毒点及1B负向全部PASS。额外CRC合法重打包反例offset1326981：legacyexit0/strongexit1，精确`Signed payload SHA256 mismatch`。不宣称CA信任/吊销验签。
- **已仅新增交付** `/storage/emulated/0/haps/liubai-2026-11-05-日志版.hap`，**3939917 B**；SHA256 **`1b932d69a5796083d01a72a8db4af5c6822757d121fe5bcafd6b9a2717cd5666`**。写后完整读回相等，精确共享目标重新legacyCMS/完整strong/negative全绿；原110个haps文件未改未删。
- collector **PID31518 / state S** 实际存活，`python tools/fetch-logs.py --app liubai --interval 5`，输出 `~/.hermes/watchlogs/liubai/`；认证pullHTTP200/ok1/rows0/next0/has_more=false。cursor0、无JSONL表示暂无新表源日志；未重启/重复启动/删历史。进度/共享README逐字节备份后追加，Documents交付说明/脱敏证据收尾。
- 证据 `~/lw_build/liubai-logsink-stage4/`：local-tests、six-baseline-red、CI日志/run/artifact、unsigned/configure provenance、sign-results、strong-local、strong-delivered、negative-real-hap、delivery与collector。仅此分支；v1/其他分支/logger dirty/门禁未动；不开AGC/浏览器。配置APP/HAP含可逆向提取write-key，仅本机，不进Git/公开Release/Actions。
- **FIT3安装、原生JerryScript堆/Unicode行为、watch-origin ACK/云+本机日志E2E仍待用户**，无新模拟器/视觉证明。现在用户在直装器手动选择此包，安装成功后打开留白，核对tag:page/MainAbility及原文；无新增Send按钮，也不凭空宣称Application onCreate标记。阶段三候选仍私有保留，旧失败历史不改写。

## liubai 日志版阶段五：全包清理本地 PASS，GitHub push 两次拒绝 STOP（2026-11-06 CST）

- 用户回填阶段四包在 FIT3 安装错误 34。历史完整 strong 只检查 app.js 的毒点，不能替代设备全包扫描；不能继续将阶段四签名通过视为安装问题已解决。
- 当前 `5a57630` 三个文件实际源调用 **10（list-page 2 / reader 7 / menu 1）**，任务交接 12 的计数不符；旧编译包重复后为已知 23。本轮实际源码全量清为 0，不虚报改写 12。仅三个产品文件与 verify-app.py 改动，其他 179 个原跟踪文件不变。
- 日期采用长度/固定连字符/ASCII charCode，原 typeof、月份年份范围及闰年/月天数不变；reader 保留完整 ECMAScript 空白集合（U+2000–U+200A 全段），拉丁字符、末尾 CR/LF、标题与分页算法不变；menu 保留长度 1 / 0–7、原短路与 action。冻结旧源码 oracle 为测试 .txt，不进入表端。
- 新测试先 RED 后 GREEN；**Node105/105、Python7/7、logger10/10，零跳过**。日期各位置全 UTF-16、reader 分类全 UTF-16、menu 全 UTF-16与空白/CRLF/标题/连写/非字符串/非法索引覆盖。原 reader 测试一行未改、全绿；首次日期测试诊断标签错误地 String 化禁止转换对象，仅修测试标签，未改算法。
- 新 `verify-app.py` 对 .app 内每个 .hap 的所有 `assets/js/**/*.js` 原字节扫描 `.test(`，命中硬拒并列出全部 member + 次数；所有旧 ZIP/身份/0.2.6-code8/页表/0<size<=49152/app 存在断言保留。门禁深层 JS、其他 Ability、七页、每个内 HAP及合法其他正则/map正负向通过；source门/语法/diff检查通过。
- 本地代码提交 **`b884715ef6131ff98e238a2eaf8593db118dbfc7`**，仅 feat/logsink；599 个唯一历史 blob 审计与 10 个提交路径真实 endpoint/写密钥/读密钥扫描均零命中。精确 by71x Profile 与显式 key 公钥匹配通过，未碰 AGC/浏览器或采集器。
- **两次 `git push origin HEAD:refs/heads/feat/logsink` 都被远端 `fatal error in commit_refs` / `remote rejected (failure)` 拒绝**。按同点两次停止，无第三次、无 force push或替代分支。API精确读回远端仍 `5a57630411ba03a81045447fa6b0cb78f9a40342`；新提交匹配 CI total=0。没有新 CI URL/artifact，不拿旧 APP 冒充。
- **本轮未签名/完整强验/独立新包复扫，也未交付** `/storage/emulated/0/haps/liubai-2026-11-06-日志版v2.hap`，目标不存在，SHA256=null。旧 `liubai-2026-11-05-日志版.hap` SHA256仍 `1b932d69a5796083d01a72a8db4af5c6822757d121fe5bcafd6b9a2717cd5666`，未改未删。PID31518/state S仍存活，未重启/删除日志。
- 证据：`~/lw_build/liubai-logsink-stage5/final.json`、node-green、python-green、各RED日志、scope/源调用计数/profile配对/CI回读。详见 `docs/regexp-validation.md`。进度追加前逐字节备份 `docs/progress.md.before-stage5-20261105T232333Z.bak`。恢复需先解决远端推送，再新CI→真实artifact→本地配置→签名/强验/独立零扫描→交付；未执行项不得宣称通过。

## liubai 日志版阶段六：新 CI GREEN / 全包扫描 PASS；配置注入遇 bytecode 硬阻塞 STOP（2026-11-06 CST）

- 阶段五远端 `commit_refs` 瞬时故障已由上一阶段恢复，`b884715ef6131ff98e238a2eaf8593db118dbfc7` 实际触发 push CI；不再以阶段五“新 CI=0”作为当前状态。本轮只读核对并后台 `gh run watch --exit-status` 等待，真实 https://github.com/lantianhcgp/liubai-watch/actions/runs/42129400696 **completed/success**。
- **CI 中新全包扫描断言确实执行通过**：`Compile and verify unsigned app` 日志两次打印 `entry-default.hap / js_scan.members=8 / test_call_count=0`，最终 verified 同样为0；真实 CLT `BUILD SUCCESSFUL`。CI **Node105/105、Python7/7，无跳过**；logger10/10沿用阶段五真实结果，未冒充本轮 CI 执行。七页JS最大 edit.js=39038 B，保持49152 B硬门限。
- 唯一 artifact **liubai-unsigned-30 / id13462144127** 已下载到 `~/lw_build/liubai-logsink-stage6/artifact/liubai-watch-default-unsigned.app`。真实 APP **984764 B**，SHA256 **`a1cb8918d7eba03fadaecfad0801dc5a50ec5a757347b24ed991839343ef4c1d`**；ZIP CRC、by71x、0.2.6/code8与本地 verify-app 全包JS扫描=0通过。此 SHA 仅属于未配置 APP，不是交付 HAP。
- **配置注入硬拒，exit1**：实际包内含 **6个非空 `.bc`**：pages/read、trash、menu、index、history、day；无 `.map`、无 app.js.map。`scripts/configure-logsink-app.py` 保留原断言 `Bytecode cannot be patched locally; require inspected JS-only compiler output`，未写 configured.app。runtime字段与写侧值形状、公开占位符均合法；未回显任何真实端点/密钥。这不是凭据或AGC故障。只读诊断确认真实bytecode，未重复重跑同一失败配置命令。
- `scripts/build.sh` 仍为 release；本轮未改源码/构建/签名/配置转换器/strong门禁，未删除 `.bc`、未把JS与bytecode混包、未复用旧APP。**签名、legacyCMS、完整strong、最终signed.bin独立扫描均 NOT RUN；未交付** `/storage/emulated/0/haps/liubai-2026-11-06-日志版v2.hap`，**HAP bytes/SHA256=null**，不能以8个JS零扫描替代完整可运行包验收。恢复需另授权解决真实编译输出的JS-only形态并重新CI取包，不可放宽配置门。
- `/storage/emulated/0/haps/` 原 **111个文件逐字节/哈希均未变**，旧 `liubai-2026-11-05-日志版.hap` 保留作错误34对照，SHA256仍 `1b932d69a5796083d01a72a8db4af5c6822757d121fe5bcafd6b9a2717cd5666`。采集器 **PID31518/state S**，实际 `python tools/fetch-logs.py --app liubai --interval 5` 存活，未重启/删除日志；不开AGC/浏览器。
- 脱敏证据 `~/lw_build/liubai-logsink-stage6/`：`ci-run.json`、`ci.log`、`ci-summary.txt`、`ci-artifacts.json`、`verify-unsigned.txt`、`artifact-blocker.json`、`haps-before.json`、`final.json`。进度追加前备份到该目录 `progress-before-stage6.md`。仅提交阶段五剩余进度与本段，commit带 `[skip ci]`、只推feat/logsink，并以精确远端HEAD/进度文件回读确认。**无新HAP可直装；FIT3安装、原生JerryScript、表源ACK/E2E仍待后续合格交付及用户回填**。

## liubai 日志版阶段七：快照来源确证、构建 JS-only、签名强验与 v2 交付完成（2026-11-06 CST）

- **六个 `.bc` 根因已确证，不是取错 artifact 或 CLT 版本漂移**：阶段四/六各仅一个 artifact（unsigned-29/-30），setup-ohos 实际提交 `4dbb63025116eb6165ceac58a4bf47cbdc5ac721`、CLT6.1.1.280、缓存键 `ohos-sdk-Linux-X64-6.1.1.280` 与 Hvigor 任务集合相同。阶段四日志明确八个 JS 全部 snapshot conversion failed；阶段六仅 edit/app 失败，read/trash/menu/index/history/day 六个成功，BC头 `JRRY`。阶段四 JS-only 是快照转换失败的偶然产物，release 从未保证无BC；本轮不强行归因每次旧转换失败的引擎级原因。
- **修在编译配置层，无产品语义改动、无 artifact 删除BC兜底、无门禁放宽**：SDK `webpack.lite.config.js` 的 release 分支无条件加 SnapshotPlugin；独立 Terser/hapMode 条件不依赖该插件。构建显式加载 `scripts/js-only-compiler.cjs`，匹配发布 SDK loader SHA256 `7c22ea2478cf1ca83e40fe2289b1f9d350f35cd456152504d92b1ca46f3c5af6`，调用原release factory后仅移除恰好一个SDK SnapshotPlugin，其余production/Terser/资源插件/map配置不变；未知指纹/模式/插件数硬拒。真实Linux CI指纹及适配器证据门执行通过。`verify-app.py` 新增所有非空/空/其他Ability `.bc` 硬拒；原 configure bytecode 前检与 shared strong 字节未动。详细源码链见 `docs/js-only-build.md`。
- 新回归在SDK release配置与实际archive verifier边界：保留配置仅差一个SnapshotPlugin、未知SDK硬拒、默认不开适配；六同名完整JS+BC及其他Ability空BC硬拒；均真实 RED→GREEN。首轮 `42132944273` 因测试使用 Node18 不支持的 import.meta.dirname 失败，仅改标准 fileURLToPath；第二轮 `42133294360` 因Hvigor clean移除build目录令证据写入ENOENT失败，加父目录重建及同一测试负向；不同卡点各一次，不跳测试。最终本地及 CI **Node108/108、Python10/10，无跳过**。
- 构建提交 c781b25、Node18测试修复 f4e839c、clean证据目录修复 **`810d58da242ed2325b0a9165861e94b8d4fa4da5`**，仅推feat/logsink。最终 CI **https://github.com/lantianhcgp/liubai-watch/actions/runs/42133827860 completed/success**，真实 `BUILD SUCCESSFUL`，`PASS real JS-only compiler adapter: 1 release configuration(s)`，8JS/.test(=0扫描执行。Hvigor不回显子进程普通console，不将缺少console回显误认为适配器未执行。
- 唯一新 artifact **liubai-unsigned-33** 下载实验：APP **906756 B**，SHA256 `78107a441366741355d3fe65dc33e8af4d6378b4c41bc5fc4b9219a6e6ea0875`；包内197文件、BC=0，8JS最大edit39038 B。**197个非BC文件逐字节与阶段六CI包完全相同**，因此这轮只是阻止六快照生成，无业务/图片/其他资源变化，不是下载后删BC。
- 原configure实际通过（前检未绕过），仅修改 `assets/js/MainAbility/app.js` 中本机写侧配置，其他196文件及外层文件字节不变；无read-key/私钥入包，真实endpoint/key均不回显。明确Profile `~/liubai-watch-sign-private/p7b/liubai-hc.p7b` + `~/hw_watch/agc-cert/key.pem` 公钥配对及FORCE_P7B_BUNDLE，签后 **liubai.nexus.by71x / 0.2.6 / code8** 精确且非零。
- **legacy verify_sign exit0，完整shared strong本地和精确交付目标均exit0/pass:true**，必带 `--app <configured.app> --runtime-config ~/.hermes/secrets/watch_logger.json --negative --bundle liubai.nexus.by71x --version-code 8`，不传logger-page/不降页门。profile CMS/当前有效/一设备绑定/两caps、仅development leaf CMS、4096B分片载荷摘要、header/config/profile同身份、版本/两页表及实际集合/全部页与应用预算依赖、写侧配置、资源同源、毒点均通过；CA链/撤销不属于该强验。另真实重打包CRC合法1字节反例legacy0/strong1；未交付反例。
- **最终signed.bin独立原字节复扫：8个JS、`.test(`=0、`.bc`=0**，每个JS非空且≤49152 B；不仅复用strong的app.js毒点门。仅新增 `/storage/emulated/0/haps/liubai-2026-11-06-日志版v2.hap`，**3941210 B**，SHA256 **`c1ad9397fa582ba1f8625a6ef94e07a93eef6e0c68fd4c7a8f609690f6e768d3`**；目标实读字节/hash与本地签包一致并重复CMS/完整strong/独立扫描。原111文件逐字节哈希均未改，旧错误34包保留。
- 采集器 **PID31518/state S，app liubai、interval5** 存活，未重启/清日志；不碰AGC/浏览器。脱敏证据 `~/lw_build/liubai-logsink-stage7/`：两旧包清单/编译日志、SDK源码、红绿测试、CI proof、unsigned/configure provenance、pipeline-results、strong-local/delivered、repacked-negative、独立扫描、delivery。配置APP/HAP只在本机，绝不Git/公开Release/CI。
- **当前直装通道必须用户在直装器界面手动选此v2包**，不走未打通的lw-push自动通道；安装后打开留白并回填结果。FIT3安装/原生JerryScript堆、watch-origin ACK及云+本地日志闭环仍待用户实测，签名强验和Node测试不是装机成功证明。阶段六STOP仅描述旧候选历史，本段为当前交付终态。进度原件备份 `stage7/progress-before-stage7.md`；本段提交 `[skip ci]` 且精确回读feat/logsink。
