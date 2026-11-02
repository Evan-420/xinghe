# 星河 · Cloudflare 免费部署指南

> 结论先行：星河可在 **Cloudflare Workers 免费套餐**完整部署运行，**全程 0 元、无需信用卡**。
> 本包已完成全部适配与实测（2026-11-01），按下文四步操作即可上线，约 10 分钟。

---

## 一、免费额度够不够？（实测对照）

| 额度项 | 免费版上限 | 星河实测 | 余量 |
|---|---|---|---|
| Worker 体积（未压缩） | 64 MiB（2026-09-04 起全套餐统一） | 5.0 MiB | ~12 倍 |
| 动态请求 | 100,000 次/天（超出返回 Error 1027，UTC 零点重置，**不扣费**） | 个人使用数百~数千次/天 | 数十倍 |
| 静态资源请求 | **免费不限量**（首页/JS/CSS/图片全静态，不计入 10 万次） | — | 不受限 |
| CPU 时间 | 10 ms/请求 | 全部路由为 I/O 型，实测通过 | 充足 |
| 内存 | 128 MB/隔离实例 | 已改流式哈希，单份拷贝 | 充足 |
| 请求体 | 100 MB | 上传建议 ≤ 50 MB（主通道上限） | 匹配 |
| 静态资源规模 | 20,000 文件 / 单文件 25 MiB | 35 文件 / 最大 1.8 MB | ~570 倍 |

账号注册仅需邮箱，**任何环节都不会出现信用卡输入界面**；超额只会限流不会产生账单。

## 二、四步部署（方案 A · 本地命令行，推荐）

前置：Node.js ≥ 20（nodejs.org 装 LTS）+ Cloudflare 账号（dash.cloudflare.com 免费注册）。

```bash
# 1. 进入项目目录，安装依赖（首次约 1-3 分钟）
npm install

# 2. 登录 Cloudflare（自动唤起浏览器 OAuth 授权）
npx wrangler login

# 3. 一键构建并部署
npm run cf:deploy
#    输出形如 → https://xinghe-galaxy-parse.<你的子域>.workers.dev

# 4. 打开上一步输出的地址验证功能
```

不想装环境？用方案 B：把项目推到 GitHub → Cloudflare 控制台 Workers & Pages → Create →
连接仓库 → 框架选 Next.js（OpenNext），构建命令 `npm run cf:build`，
部署命令 `npx wrangler deploy`。此后 `git push` 即自动发布。

## 三、部署后验证清单（约 10 分钟）

1. 打开站点 → 星空首页完整渲染，滚动入场动画**只播一次**（若见重复请 Ctrl+F5 强刷缓存）
2. 粘贴抖音/快手分享文案 → 返回无水印直链，站内可播放
3. 粘贴小红书笔记链接 → 返回图片/视频直链
4. 上传一个 ≤50MB 文件 → 返回星云直链；下载按钮可另存
5. TikTok / YouTube / X 按需测试（见下方风控说明）

## 四、必须知道的三件事

1. **workers.dev 域名在大陆基本无法直连**（DNS 污染）。
   改善方式：把自有域名 DNS 托管到 Cloudflare（免费）→ Worker 设置 →
   Domains & Routes → Add Custom Domain，例如 `xinghe.你的域名.com`。
   未备案域名走海外节点，大陆可直连但速度一般。
2. **部分引擎上游有风控，与部署平台无关**：
   - 抖音/快手（聚合节点）：实测可达 ✓
   - TikTok（tikwm）：对数据中心 IP 有风控，任何云部署都可能被拦（引擎会给出明确中文提示）
   - 小红书：对海外 IP 较敏感，用完整分享链接重试
   - YouTube：Cloudflare 边缘网络可正常访问
3. **上传硬上限 100 MB**（免费边缘请求体上限，超出直接 413，前端已做中文提示）。
   建议控制在 50 MB 内；更大文件走自托管版本的 icve 通道。

## 五、常用命令

```bash
npm run cf:preview        # 本地 workerd 运行时预览（免登录，与线上同引擎）
npm run cf:build          # 仅构建到 .open-next/
npm run cf:deploy         # 构建 + 部署
npx wrangler tail         # 实时看线上日志（排查解析错误的利器）
npx wrangler deploy --dry-run --outdir bundled   # 预检产物体积
```

## 六、故障速查

| 现象 | 原因 | 处理 |
|---|---|---|
| Error 1027 | 当日 10 万次动态额度用尽 | UTC 零点自动重置 |
| Error 1101 / CPU 超限 | 单请求 CPU > 10ms | 重试；频繁出现再考虑 $5/月付费版 |
| TikTok 解析提示风控 | tikwm 上游风控 | 非部署故障，其他平台不受影响 |
| 大陆打不开 workers.dev | 域名被污染 | 绑定自定义域名（见上） |
| 上传 413 | 文件 >100MB | 压缩或 ≤50MB |
| 首页白屏/资源 404 | 构建不完整 | 重新 `npm run cf:deploy` |

## 七、本项目为此做的适配（技术备注）

- 新增 `wrangler.jsonc`（nodejs_compat / global_fetch_strictly_public / 静态资源绑定）与 `open-next.config.ts`
- `package.json` 新增 `cf:login / cf:build / cf:preview / cf:deploy` 四个脚本
- 上传前 SHA-256 改为 `node:crypto` 流式分块计算（规避 128MB 内存双份拷贝）
- 前端新增 413 识别与中文提示（边缘 100MB 请求体上限）
- 检查确认：源码无 fs/http 等 Node 专属依赖；Prisma/SQLite 为未引用的脚手架死代码（不进运行时，无需迁移 D1）；sharp 未使用（不进 Worker 产物）
- 验证版本：Next.js 16.1.3 · @opennextjs/cloudflare 1.20.15 · wrangler 4.156.0

额度以官方文档为准：<https://developers.cloudflare.com/workers/platform/limits/>
