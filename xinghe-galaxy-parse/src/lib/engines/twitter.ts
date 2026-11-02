// X / Twitter 引擎 · 双通道
// 主通道:fxtwitter 公开接口(返回结构化 JSON,免登录)
// 备用通道:cdn.syndication.twimg.com/tweet-result(官方嵌入接口,token=0 免签名)
import { EngineError, ParseResult, UA_BROWSER, fetchX } from "./types";

function tweetIdOf(url: string): { id: string; user: string } | null {
  const m = url.match(/(?:x|twitter|vxtwitter|fxtwitter)\.com\/([A-Za-z0-9_]+)\/status\/(\d+)/i);
  if (m) return { user: m[1], id: m[2] };
  const bare = url.match(/\/status\/(\d+)/i);
  return bare ? { user: "", id: bare[1] } : null;
}

interface FxTweet {
  code?: number;
  tweet?: {
    text?: string;
    author?: { name?: string; screen_name?: string; avatar_url?: string };
    created_at?: string;
    media?: {
      photos?: { url: string; altText?: string }[];
      videos?: { url: string; thumbnail?: string; type: string }[];
    };
    likes?: number;
    replies?: number;
    reposts?: number;
    views?: number;
  };
}

async function viaFxtwitter(id: string, timeoutMs = 12000): Promise<ParseResult | null> {
  const resp = await fetchX(`https://api.fxtwitter.com/status/${id}`, {
    headers: { "User-Agent": UA_BROWSER, Accept: "application/json" },
    timeoutMs,
  });
  const ct = resp.headers.get("content-type") || "";
  if (!ct.includes("json")) return null;
  const data = (await resp.json()) as FxTweet;
  if (data.code !== 200 || !data.tweet) return null;

  const videos = (data.tweet.media?.videos || [])
    .map((v) => v.url)
    .filter(Boolean)
    .map((url) => ({ url, quality: "MP4", mimeType: "video/mp4" }));
  const images = (data.tweet.media?.photos || []).map((p) => p.url).filter(Boolean);

  return {
    platform: "twitter",
    kind: videos.length && images.length ? "mixed" : videos.length ? "video" : "image",
    title: (data.tweet.text || "X 帖子").slice(0, 120),
    desc: data.tweet.text,
    author: data.tweet.author
      ? {
          name: data.tweet.author.name || data.tweet.author.screen_name || "X 用户",
          id: data.tweet.author.screen_name,
          avatar: data.tweet.author.avatar_url,
        }
      : undefined,
    stats: {
      play: data.tweet.views,
      like: data.tweet.likes,
      comment: data.tweet.replies,
      share: data.tweet.reposts,
    },
    videos,
    images,
    via: "fxtwitter",
    parsedAt: Math.floor(Date.now() / 1000),
  };
}

interface Syndication {
  text?: string;
  user?: { screen_name?: string; name?: string; profile_image_url_https?: string };
  mediaDetails?: {
    type?: string;
    media_url_https?: string;
    videoVariants?: { type?: string; src?: string; bitrate?: number }[];
  }[];
  favorite_count?: number;
  reply_count?: number;
  retweet_count?: number;
}

async function viaSyndication(id: string): Promise<ParseResult | null> {
  const resp = await fetchX(
    `https://cdn.syndication.twimg.com/tweet-result?id=${id}&token=0`,
    { headers: { "User-Agent": UA_BROWSER }, timeoutMs: 15000 }
  );
  if (resp.status !== 200) return null;
  const data = (await resp.json()) as Syndication;

  const videos: { url: string; quality: string; bitrate?: number }[] = [];
  const images: string[] = [];
  for (const m of data.mediaDetails || []) {
    if (m.type === "video" || m.type === "animated_gif") {
      for (const v of m.videoVariants || []) {
        if (v.src && (v.type || "").includes("mp4")) {
          videos.push({ url: v.src, quality: v.bitrate ? `${Math.round((v.bitrate || 0) / 1000)}kbps` : "MP4", bitrate: v.bitrate });
        }
      }
    } else if (m.media_url_https) {
      images.push(m.media_url_https);
    }
  }
  const topVideo = videos.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0))[0];

  return {
    platform: "twitter",
    kind: topVideo ? "video" : "image",
    title: (data.text || "X 帖子").slice(0, 120),
    desc: data.text,
    author: data.user
      ? { name: data.user.name || data.user.screen_name, id: data.user.screen_name, avatar: data.user?.profile_image_url_https?.replace("_normal", "") }
      : undefined,
    stats: { like: data.favorite_count, comment: data.reply_count, share: data.retweet_count },
    videos: topVideo ? [topVideo] : [],
    images,
    via: "syndication",
    parsedAt: Math.floor(Date.now() / 1000),
  };
}

export async function parseTwitter(url: string): Promise<ParseResult> {
  const hit = tweetIdOf(url);
  if (!hit) throw new EngineError("INVALID_URL", "未从链接中识别到推文 ID，请复制完整的帖子链接");

  let result: ParseResult | null = null;
  // fxtwitter 偶发抖动,重试一次提升命中率
  for (let attempt = 0; attempt < 2 && !result; attempt++) {
    try {
      result = await viaFxtwitter(hit.id, attempt === 0 ? 12000 : 9000);
    } catch {
      result = null;
    }
    if (!result || (!result.videos.length && !result.images.length)) {
      result = result && (result.videos.length || result.images.length) ? result : null;
      await new Promise((r) => setTimeout(r, 600));
    }
  }
  if (!result || (!result.videos.length && !result.images.length)) {
    try {
      result = await viaSyndication(hit.id);
    } catch {
      result = result ?? null;
    }
  }
  if (!result) {
    throw new EngineError("NETWORK", "X 解析通道暂时不可用", "当前部署网络无法触达 X 解析节点，稍后重试");
  }
  if (!result.videos.length && !result.images.length) {
    throw new EngineError("PARSE_FAIL", "该帖子没有可解析的媒体内容（可能是纯文字帖）");
  }
  return result;
}
