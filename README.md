# 留白 · Lite Wearable 本地记录

面向华为 HarmonyOS Lite Wearable 的原生日记与便签应用。界面以已批准的最终 V3 为唯一基线；原生 HML/CSS/JavaScript 实现，不使用 WebView，也不以整屏图片替代交互界面。

## 功能

- 本地记录、新建与编辑；正文优先，键盘默认收起。
- 完整正文分页阅读，三档字号与正文位置记忆。
- 原 CrabKeyboard 图集、键位与分片词库；中文候选、英文、数字符号、横向开窗和光标操作。
- 应用内剪切板、未保存退出确认、草稿及恢复入口。
- 置顶、按月回看、当天记录、回收站与恢复。
- 保存中反馈、独立保存失败页面、继续编辑与重试保存；失败不覆盖旧正文。

## 当前交付状态

原生 UI 源码：`359bd3df0109c9bcc1100ed2eff49333c95fdc43`，分支 `feat/ui-parity-v3`。

真实 CLT 构建：https://github.com/lantianhcgp/liubai-watch/actions/runs/41345098484

- bundle：`com.hcbiu.liubai`。
- 版本：`0.1.0`，code `1`。
- 未签名 `.app` SHA-256：`96702166d0c15e0b6f3f4f44607193c6ad93a4fe7c36ed9a764cb6bb991a3523`。
- 所有 7 个页面编译后均低于 49152 字节。
- 当前验收采用 hmlwsim 解析同一份真实构建 `.app`，测试文件读写落在独立目录。

这不是已签名的安装版本。AGC 当前会话返回 HTTP 401，留白的新 p7b 尚未取得；不会复用其他应用的签名身份。未签名 `.app` 用于模拟器、构建核验及后续签名，不能据此宣称已可安装到手表。

hmlwsim/V8 不证明目标真机的 JerryScript 堆、原生文件系统断电恢复、物理表冠、图片释放或功耗。宿主字体采用明确记录的别名，不能据网页对照宣称真机字体逐像素一致。

## 构建与验收

```sh
bash scripts/build.sh
node --experimental-vm-modules --test --test-concurrency=1 tests/*.test.mjs
python scripts/verify-source.py
python scripts/verify-app.py /path/to/actual.app
```

完整 UI 还原、隔离宿主补丁和验收证据入口见 [docs/ui-restoration.md](docs/ui-restoration.md)。本次修复和验收资料保留在独立分支，不改动原开发目录或默认分支。
