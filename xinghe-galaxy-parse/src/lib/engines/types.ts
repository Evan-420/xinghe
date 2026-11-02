// 星河解析引擎 · 统一数据模型
export type Platform =
  | "douyin"
  | "kuaishou"
  | "xhs"
  | "tiktok"
  | "youtube"
  | "twitter";

export type ContentKind = "video" | "image" | "mixed" | "live";

export interface VideoAsset {
  url: string;
  quality?: string;
  size?: number;
  width?: number;
  height?: number;
  bitrate?: number;
  mimeType?: string;
}

export interface ParseResult {
  platform: Platform;
  kind: ContentKind;
  title: string;
  desc?: string;
  cover?: string;
  author?: {
    name: string;
    id?: string;
    avatar?: string;
    signature?: string;
  };
  stats?: {
    play?: number;
    like?: number;
    comment?: number;
    share?: number;
    favorite?: number;
  };
  durationMs?: number;
  createTime?: number;
  ipLocation?: string;
  videos: VideoAsset[];
  images: string[];
  music?: { url: string; title?: string };
  liveStreams?: { label: string; flv?: string; hls?: string }[];
  streamTtl?: string;
  expiresAt?: number;
  via: string;
  parsedAt: number;
}

export class EngineError extends Error {
  code: string;
  hint?: string;
  constructor(code: string, message: string, hint?: string) {
    super(message);
    this.code = code;
    this.hint = hint;
  }
}

export const PLATFORM_META: Record<
  Platform,
  { name: string; en: string; color: string; hosts: string[] }
> = {
  douyin: {
    name: "抖音",
    en: "Douyin",
    color: "#fe2c55",
    hosts: ["douyin.com", "iesdouyin.com"],
  },
  kuaishou: {
    name: "快手",
    en: "Kuaishou",
    color: "#ff7900",
    hosts: ["kuaishou.com", "chenzhongtech.com", "gifshow.com"],
  },
  xhs: {
    name: "小红书",
    en: "RedNote",
    color: "#ff2442",
    hosts: ["xiaohongshu.com", "xhslink.com"],
  },
  tiktok: {
    name: "TikTok",
    en: "TikTok",
    color: "#25f4ee",
    hosts: ["tiktok.com"],
  },
  youtube: {
    name: "YouTube",
    en: "YouTube",
    color: "#ff0033",
    hosts: ["youtube.com", "youtu.be", "youtube-nocookie.com"],
  },
  twitter: {
    name: "X / Twitter",
    en: "X",
    color: "#e7e9ea",
    hosts: ["x.com", "twitter.com", "t.co", "vxtwitter.com", "fxtwitter.com"],
  },
};

/** 从任意分享文本中提取第一条 URL */
export function extractUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s，。、""''"")）】\]]+/i);
  return m ? m[0].replace(/[.,;:!?]+$/, "") : null;
}

/** 平台识别 */
export function detectPlatform(rawUrl: string): Platform | null {
  let host: string;
  try {
    host = new URL(rawUrl).hostname.toLowerCase();
  } catch {
    return null;
  }
  const is = (list: string[]) =>
    list.some((h) => host === h || host.endsWith("." + h));
  if (is(PLATFORM_META.douyin.hosts)) return "douyin";
  if (is(PLATFORM_META.kuaishou.hosts)) return "kuaishou";
  if (is(PLATFORM_META.xhs.hosts)) return "xhs";
  if (is(PLATFORM_META.tiktok.hosts)) return "tiktok";
  if (is(PLATFORM_META.youtube.hosts)) return "youtube";
  if (is(PLATFORM_META.twitter.hosts)) return "twitter";
  return null;
}

export const UA_BROWSER =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

/** 统一超时 fetch */
export async function fetchX(
  url: string,
  init: RequestInit & { timeoutMs?: number } = {}
): Promise<Response> {
  const { timeoutMs = 25000, ...rest } = init;
  return fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) });
}
