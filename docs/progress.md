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
