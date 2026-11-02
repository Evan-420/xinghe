# 星河 XINGHE · 全平台内容解析引擎

> 一条链接，穿越六大星域 —— 抖音 / 快手 / 小红书 / TikTok / YouTube / X，粘贴即析，秒取无水印高清直链。

![星河](https://img.shields.io/badge/星河-GALAXY%20PARSE-8b5cf6) ![Next.js](https://img.shields.io/badge/Next.js%2016-App%20Router-black) ![Three.js](https://img.shields.io/badge/Three.js-3D%20星野引擎-white) ![License](https://img.shields.io/badge/使用-仅供学习研究-blue)

---

## ✦ 这是什么

**星河**是一个深空美学的全平台内容解析站：

- **3D 太空背景**：Three.js 着色器星野（9000+ 恒星闪烁）、程序化星云、银河尘埃带、带环气态巨行星、随机流星、鼠标视差与滚动联动
- **六大平台解析**：粘贴任意分享文案，自动识别平台 → 展开短链 → 剥离水印 → 返回原始直链
- **站内直接播放**：解析结果经 `/api/media` 媒体代理流式转发，视频在本站内直接播放、拖动进度条，不再跳转外部
- **一键下载**：解析出的视频 / 图集 / 音频与上传的文件，点击"下载"按钮即直接另存本地（服务端强制附件下载，自动补全扩展名）
- **星云仓库**：任何文件拖入即得永久直链（多通道公共网盘，免登录）

## ✦ 引擎矩阵

| 平台 | 引擎通道 | 支持内容 | 出处 |
|------|---------|---------|------|
| 抖音 | 公开聚合解析节点 | 视频 / 图集 / 实况 / 直播 | 聚合解析公开接口 |
| 快手 | 公开聚合解析节点 | 视频 / 图集 / 直播 | 聚合解析公开接口 |
| 小红书 | 自研笔记页解析引擎 | 图文笔记 / 视频笔记 / 实况照片 | xhslink 短链重定向 → `__INITIAL_STATE__` 提取 |
| TikTok | tikwm 公开接口 | 视频 / 图集 / 音乐 | 开源项目 allparse 实测链路移植 |
| YouTube | innertube `ANDROID_VR → IOS` 回退链 | 视频 / Shorts（最高 4K，DASH 音轨） | 开源项目 allparse 实测链路移植 |
| X / Twitter | fxtwitter（重试强化）+ 官方 syndication 双通道 | 帖子 / 视频 / 图集 / GIF | 公开接口 |
| 文件托管 | 星云主通道（≤50MB）→ icve OSS 大文件通道 → opple 兜底 | 任意格式 ≤ 2GB | 多通道直链托管协议 |

> 每个平台都是多通道冗余设计：主通道失败自动降级，互为备份。

## ✦ 快速开始

```bash
# 安装依赖(建议 bun,兼容 npm/pnpm)
bun install

# 启动开发服务器
bun run dev
# → http://localhost:3000

# 生产构建
bun run build && bun run start
```

环境要求：Node.js ≥ 18（内置 fetch / FormData / crypto.subtle），无需任何 API Key。

## ✦ 部署到 Cloudflare（免费 · 无需信用卡）

```bash
npm install
npx wrangler login     # 浏览器 OAuth 授权（免费账号注册，全程无需信用卡）
npm run cf:deploy      # OpenNext 构建 + 部署到全球边缘网络
```

实测：Worker 体积 5.0 MiB（免费上限 64 MiB）· 动态请求 100,000 次/天 · 静态资源免费不限量。
完整步骤、验证清单与故障排查见 **[DEPLOY-CLOUDFLARE.md](./DEPLOY-CLOUDFLARE.md)**。

## ✦ API 文档

### `POST /api/parse`

```jsonc
// 请求体:分享文本或纯链接均可,自动提取 URL 并识别平台
{ "text": "7.72 复制打开抖音 https://v.douyin.com/xxxx/ ..." }

// 成功响应(统一结构)
{
  "ok": true,
  "platform": { "name": "抖音", "en": "Douyin" },
  "result": {
    "platform": "douyin",
    "kind": "video",              // video | image | mixed | live
    "title": "...", "cover": "...",
    "author": { "name": "...", "avatar": "..." },
    "stats": { "play": 123, "like": 456, "comment": 78 },
    "durationMs": 15200, "createTime": 1730000000, "ipLocation": "云南",
    "videos": [{ "url": "https://...mp4", "quality": "..." }],
    "images": ["https://...jpg"],
    "music": { "url": "https://...mp3" },
    "via": "聚合节点"
  }
}

// 失败响应(附可读提示)
{ "error": "解析失败原因", "hint": "建议操作", "code": "PARSE_FAIL" }
```

### `POST /api/upload`

```bash
curl -X POST http://localhost:3000/api/upload -F "file=@./视频.mp4"
# → { "ok": true, "link": "https://s3plus.meituan.net/.../xxx.mp4", "channel": "tc" }
```

上传协议要点（多通道直链托管协议，`src/lib/engines/cloud.ts`）：

1. 计算文件 SHA-256 → 以 HS256 铸造 `X-Auth-Token`(JWT)
2. `POST` 主通道 `/upload` 接口（FormData，≤50MB）
3. 大文件自动切换 icve OSS 通道，失败自动 opple 兜底

### `GET /api/media?url=<enc>[&dl=<文件名>]`

站内媒体代理：为解析直链补齐平台 Referer/UA 绕过 CDN 防盗链，流式转发并透传 `Range`（支持拖动进度条），供 `<video>` 直接播放；携带 `dl` 参数时以 `Content-Disposition: attachment` 强制附件下载（未写扩展名时按上游 Content-Type 自动补全）。

```bash
curl -H "Range: bytes=0-1023" "http://localhost:3000/api/media?url=<视频直链>"
# → HTTP 206 · video/mp4 · Content-Range: bytes 0-1023/...
```

## ✦ 部署网络须知

解析引擎需要服务器出口能触达对应平台：

| 平台 | 网络要求 |
|------|---------|
| 抖音 / 快手（聚合节点） | 全球可达 |
| X（fxtwitter / syndication） | 全球可达 |
| 小红书 | 建议**中国大陆**网络出口（海外 IP 会被风控拦截） |
| TikTok / YouTube | 需可访问 tiktok.com / youtube.com 的网络（中国大陆服务器需配代理） |

## ✦ 目录结构

```
src/
├── app/
│   ├── api/
│   │   ├── parse/route.ts      # 解析入口(平台识别 + 引擎分发)
│   │   ├── media/route.ts      # 站内媒体代理(防盗链 + Range 流式)
│   │   └── upload/route.ts     # 星云仓库上传入口
│   ├── layout.tsx
│   └── page.tsx                # 星河主页面
├── components/galaxy/
│   ├── SpaceBackground.tsx     # Three.js 3D 太空背景
│   ├── Reveal.tsx              # 严格一次性入场动画(useInView once)
│   ├── ParseSection.tsx        # 解析区 UI
│   ├── UploadSection.tsx       # 星云仓库 UI
│   └── PlatformIcons.tsx       # 平台品牌图形
└── lib/engines/
    ├── types.ts                # 统一数据模型 + 平台检测
    ├── shortvideo.ts           # 抖音 / 快手引擎
    ├── xhs.ts                  # 小红书引擎(自研)
    ├── tiktok.ts               # TikTok 引擎
    ├── youtube.ts              # YouTube 引擎
    ├── twitter.ts              # X 引擎
    └── cloud.ts                # 网盘上传引擎
```

## ✦ 关于作者

**Evan～** —— 真正的博学，不是知识的堆叠，而是看见万物之间那座隐形的桥。

- 博客：[evanblog.com](https://evan.space.zhipuaidemo.cn/)
- GitHub：[github.com/evan-420](https://github.com/evan-420)
- 简介：[blog.google.com/evan420/](https://file.zhuyitai.com/feedback/202608/d30bfc6e5da78f38aff8356b2af35d05.html)

## ✦ 免责声明

星河是开放技术研究项目：只做**实时链接解析**，不存储、不缓存任何媒体内容。解析所得作品的著作权归原平台与创作者所有，请在获得授权的前提下合理使用。请勿将本项目用于批量抓取、商业搬运或任何违法违规场景。

引擎致谢：[allparse](https://github.com/hey-yx/allparse) · [yt-dlp](https://github.com/yt-dlp/yt-dlp) · 公开聚合接口

---

© 2026 星河 XINGHE · Crafted among the stars ✦
