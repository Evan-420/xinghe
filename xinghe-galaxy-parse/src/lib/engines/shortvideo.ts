// 抖音 / 快手引擎 · 公开聚合解析接口（端点见 API_BASE）
// 请求形式：GET /api/<platform>?path=<dyjx|ksjx>&url=<enc>
// 返回统一 JSON:type/name/avatar/signature/title/cover/all_videos/images/stats/streams
import { EngineError, ParseResult, Platform, UA_BROWSER, fetchX } from "./types";

interface DyjxResponse {
  msg?: string;
  type?: "video" | "image" | "mixed" | "live_photo" | "live";
  name?: string;
  avatar?: string;
  signature?: string;
  ip_location?: string;
  duration_ms?: number;
  create_time?: number;
  title?: string;
  cover?: string;
  video?: string;
  all_videos?: string[];
  images?: string[];
  image_details?: unknown[];
  stats?: {
    play?: number;
    like?: number;
    comment?: number;
    favorite?: number;
    share?: number;
  };
  streams?: { label?: string; flv?: string; hls?: string }[];
  stream_ttl?: string;
}

const API_BASE = "https://dyjx.qdqqd.com";

async function shortvideoParse(
  platform: Extract<Platform, "douyin" | "kuaishou">,
  shareUrl: string
): Promise<ParseResult> {
  const path = platform === "kuaishou" ? "ksjx" : "dyjx";
  const api = `${API_BASE}/api/${platform}?path=${path}&url=${encodeURIComponent(shareUrl)}`;

  let resp: Response;
  try {
    resp = await fetchX(api, {
      headers: {
        "User-Agent": UA_BROWSER,
        Accept: "application/json",
        Referer: "https://dyjx.qdqqd.com/",
      },
      timeoutMs: 30000,
    });
  } catch (e) {
    throw new EngineError(
      "NETWORK",
      `无法连接解析节点（${platform === "kuaishou" ? "快手" : "抖音"}）`,
      "当前部署网络的出口无法触达解析服务，稍后重试或检查网络"
    );
  }

  let data: DyjxResponse | null = null;
  try {
    data = (await resp.json()) as DyjxResponse;
  } catch {
    throw new EngineError("UPSTREAM", "解析服务返回异常，请稍后重试");
  }
  if (!data) throw new EngineError("UPSTREAM", "解析服务暂时不可用，请稍后重试");
  if (data.msg) throw new EngineError("PARSE_FAIL", data.msg);

  const kind = data.type === "image" ? "image" : data.type === "mixed" ? "mixed" : data.type === "live" ? "live" : "video";

  return {
    platform,
    kind,
    title: (data.title || "").trim() || (platform === "kuaishou" ? "快手作品" : "抖音作品"),
    cover: data.cover,
    author: data.name
      ? {
          name: data.name,
          avatar: data.avatar,
          signature: data.signature,
        }
      : undefined,
    stats: data.stats,
    durationMs: data.duration_ms,
    createTime: data.create_time,
    ipLocation: data.ip_location,
    videos: (data.all_videos && data.all_videos.length ? data.all_videos : data.video ? [data.video] : [])
      .filter(Boolean)
      .map((url) => ({ url })),
    images: (data.images || []).filter(Boolean),
    liveStreams: data.streams,
    streamTtl: data.stream_ttl,
    via: "聚合节点",
    parsedAt: Math.floor(Date.now() / 1000),
  };
}

export const parseDouyin = (url: string) => shortvideoParse("douyin", url);
export const parseKuaishou = (url: string) => shortvideoParse("kuaishou", url);
