// 小红书引擎 · 自研笔记页解析链路
// 分享短链(xhslink.com) → 302 重定向 → 笔记详情页
// → window.__INITIAL_STATE__ 提取笔记/作者/图集/视频直链
import { EngineError, ParseResult, UA_BROWSER, fetchX } from "./types";

function extractState(html: string): Record<string, unknown> | null {
  const marker = "window.__INITIAL_STATE__=";
  const start = html.indexOf(marker);
  if (start === -1) return null;
  const s = start + marker.length;
  const end = html.indexOf("</script>", s);
  if (end === -1) return null;
  let raw = html.slice(s, end).trim().replace(/;+$/, "");
  try {
    return JSON.parse(raw);
  } catch {
    try {
      // 页面偶带 undefined 字面量,替换后重试
      return JSON.parse(raw.replace(/\bundefined\b/g, "null"));
    } catch {
      return null;
    }
  }
}

interface XhsNote {
  title?: string;
  desc?: string;
  type?: string;
  time?: number;
  ipLocation?: string;
  user?: { nickname?: string; userId?: string; avatar?: string };
  imageList?: { urlDefault?: string; url?: string; infoList?: { url?: string }[]; livePhotoId?: string }[];
  videoMedia?: {
    stream?: {
      h264?: { master_url?: string; [k: string]: unknown }[];
      h265?: { master_url?: string; [k: string]: unknown }[];
      [k: string]: unknown;
    };
  };
  interactInfo?: { liked?: string | number; collected?: string | number; commentCount?: string | number; shareCount?: string | number };
  tagList?: { name?: string }[];
  [k: string]: unknown;
}

function findNote(o: unknown, depth = 0): XhsNote | null {
  if (depth > 10 || !o || typeof o !== "object") return null;
  const obj = o as Record<string, unknown>;
  if (obj.user && typeof obj.user === "object" && (Array.isArray(obj.imageList) || obj.videoMedia || obj.title !== undefined)) {
    return obj as XhsNote;
  }
  for (const k of Object.keys(obj)) {
    const found = findNote(obj[k], depth + 1);
    if (found) return found;
  }
  return null;
}

function noteIdFrom(url: string): string | null {
  const m = url.match(/\/(?:explore|discovery\/item)\/([0-9a-zA-Z_-]{16,32})/);
  return m ? m[1] : null;
}

export async function parseXhs(url: string): Promise<ParseResult> {
  // 1. 短链展开(xhslink.com → xiaohongshu.com)
  let target = url;
  let noteId = noteIdFrom(url);
  try {
    const u = new URL(url);
    if (u.hostname.endsWith("xhslink.com")) {
      const res = await fetchX(url, {
        method: "GET",
        redirect: "follow",
        headers: { "User-Agent": UA_BROWSER, "Accept-Language": "zh-CN,zh;q=0.9" },
        timeoutMs: 15000,
      });
      await res.body?.cancel();
      if (res.url) target = res.url;
      noteId = noteIdFrom(target) || noteId;
    }
  } catch {
    throw new EngineError("NETWORK", "小红书短链展开失败", "当前部署网络无法访问 xhslink.com，稍后重试");
  }
  if (!noteId) {
    throw new EngineError("INVALID_URL", "未从链接中识别到笔记 ID，请复制完整的分享链接");
  }

  // 2. 拉取笔记详情页(保留 xsec_token 等查询参数)
  let html: string;
  try {
    const res = await fetchX(target, {
      headers: {
        "User-Agent": UA_BROWSER,
        "Accept-Language": "zh-CN,zh;q=0.9",
        Referer: "https://www.xiaohongshu.com/explore",
      },
      timeoutMs: 20000,
    });
    html = await res.text();
  } catch {
    throw new EngineError("NETWORK", "无法访问小红书笔记页", "当前部署网络无法访问 xiaohongshu.com，自部署于可达网络后即可解析");
  }

  if (html.includes("你访问的页面不见了") || html.includes("页面不存在")) {
    throw new EngineError("PARSE_FAIL", "笔记不存在、已删除或链接失效", "海外 IP 可能被小红书风控，请使用分享链接原始参数重试");
  }

  const state = extractState(html);
  const note =
    (state &&
      (((state as { noteData?: { data?: { noteData?: XhsNote } } }).noteData?.data?.noteData as XhsNote) ||
        findNote(state))) ||
    null;

  if (!note || !note.user) {
    throw new EngineError("RISK_CONTROL", "小红书返回了风控页（未登录态被拦截）", "海外部署 IP 或高频请求会触发风控；自部署于国内网络或稍后重试");
  }

  // 3. 提取资源
  const images: string[] = [];
  const livePhotoVideos: string[] = [];
  for (const img of note.imageList || []) {
    const u = img.urlDefault || img.url || img.infoList?.find((i) => i.url)?.url;
    if (u) images.push(u);
  }
  const stream = note.videoMedia?.stream;
  const videos: { url: string; quality?: string }[] = [];
  const h264 = stream?.h264?.[0] as { master_url?: string } | undefined;
  const h265 = stream?.h265?.[0] as { master_url?: string } | undefined;
  if (h264?.master_url) videos.push({ url: h264.master_url, quality: "H.264" });
  if (h265?.master_url && h265.master_url !== h264?.master_url) {
    videos.push({ url: h265.master_url, quality: "H.265" });
  }
  // live photo: imageList 中带 livePhotoId 的项对应 note 的 livePhoto 映射
  const livePhotoMap = (note as unknown as { livePhotos?: Record<string, { url?: string; streams?: { master_url?: string }[] }> }).livePhotos;
  if (livePhotoMap) {
    for (const img of note.imageList || []) {
      if (img.livePhotoId) {
        const lp = livePhotoMap[img.livePhotoId];
        const lu = lp?.url || lp?.streams?.[0]?.master_url;
        if (lu) livePhotoVideos.push(lu);
      }
    }
  }

  const interact = note.interactInfo || {};
  const num = (v: unknown) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };

  const allVideos = [...videos, ...livePhotoVideos.map((u) => ({ url: u, quality: "Live Photo" }))];
  const kind = allVideos.length && images.length && videos.length === 0 ? "image" : videos.length ? "video" : "image";

  return {
    platform: "xhs",
    kind,
    title: (note.title || "").trim() || "小红书笔记",
    desc: note.desc,
    author: {
      name: note.user.nickname || "小红书用户",
      id: note.user.userId,
      avatar: note.user.avatar,
    },
    stats: {
      like: num(interact.liked),
      favorite: num(interact.collected),
      comment: num(interact.commentCount),
      share: num(interact.shareCount),
    },
    createTime: note.time,
    ipLocation: note.ipLocation,
    videos: allVideos,
    images,
    via: "note-page",
    parsedAt: Math.floor(Date.now() / 1000),
  };
}
