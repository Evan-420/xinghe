// YouTube 引擎 · innertube /player(ANDROID_VR → IOS 回退链)
// 方案移植自开源项目 allparse 的实测链路(免 PO Token / 免 Cookie)
// 注:googlevideo 直链绑定解析出口 IP,约 6 小时过期,拿到请尽快下载
import { EngineError, ParseResult, fetchX } from "./types";

const PLAYER_URL = "https://www.youtube.com/youtubei/v1/player";

const CLIENTS = [
  {
    name: "ANDROID_VR" as const,
    context: {
      clientName: "ANDROID_VR",
      clientVersion: "1.62.27",
      androidSdkVersion: 32,
      hl: "en",
      gl: "US",
    },
    headers: {
      "User-Agent":
        "com.google.android.apps.youtube.vr.oculus/1.62.27 (Linux; U; Android 12; en_US) gzip",
      "X-Youtube-Client-Name": "28",
      "X-Youtube-Client-Version": "1.62.27",
    },
  },
  {
    name: "IOS" as const,
    context: {
      clientName: "IOS",
      clientVersion: "20.32.4",
      deviceModel: "iPhone16,2",
      osVersion: "18.5.22F76",
      hl: "en",
      gl: "US",
    },
    headers: {
      "User-Agent":
        "com.google.ios.youtube/20.32.4 (iPhone16,2; U; CPU iOS 18_5_22 like Mac OS X;) gzip",
      "X-Youtube-Client-Name": "5",
      "X-Youtube-Client-Version": "20.32.4",
    },
  },
];

interface YtFormat {
  itag?: number;
  url?: string;
  mimeType?: string;
  width?: number;
  height?: number;
  bitrate?: number;
  audioQuality?: string;
  contentLength?: string;
  fps?: number;
}
interface YtPlayer {
  playabilityStatus?: { status?: string; reason?: string };
  streamingData?: { formats?: YtFormat[]; adaptiveFormats?: YtFormat[]; expiresInSeconds?: string | number };
  videoDetails?: {
    videoId?: string;
    title?: string;
    shortDescription?: string;
    author?: string;
    lengthSeconds?: string;
    viewCount?: string;
    thumbnail?: { thumbnails?: { url?: string; width?: number }[] };
  };
}

function videoIdOf(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.hostname === "youtu.be") {
    const id = u.pathname.replace(/\//g, "").slice(0, 11);
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  }
  const v = u.searchParams.get("v");
  if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
  const m = u.pathname.match(/\/(?:shorts|embed|live|v)\/([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
}

const isMp4 = (f: YtFormat) => (f.mimeType || "").startsWith("video/mp4");
const hasAudio = (f: YtFormat) => f.audioQuality !== undefined;
const pickBest = (list: YtFormat[]) =>
  [...list].sort((a, b) => {
    const mp4 = Number(isMp4(b)) - Number(isMp4(a));
    if (mp4 !== 0) return mp4;
    return (b.bitrate || 0) - (a.bitrate || 0);
  })[0];

export async function parseYoutube(url: string): Promise<ParseResult> {
  const id = videoIdOf(url);
  if (!id) throw new EngineError("INVALID_URL", "未识别到 YouTube 视频 ID，请复制完整链接");

  let lastStatus = "";
  let lastReason = "";
  for (const client of CLIENTS) {
    let player: YtPlayer;
    try {
      const resp = await fetchX(PLAYER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...client.headers },
        body: JSON.stringify({
          context: { client: client.context },
          videoId: id,
          contentCheckOk: true,
          racyCheckOk: true,
        }),
        timeoutMs: 25000,
      });
      if (resp.status !== 200) {
        lastStatus = `HTTP ${resp.status}`;
        continue;
      }
      player = (await resp.json()) as YtPlayer;
    } catch {
      lastStatus = "NETWORK";
      continue;
    }

    const ps = player.playabilityStatus || {};
    lastStatus = ps.status || "";
    lastReason = ps.reason || "";
    const sd = player.streamingData;
    const fmtCount = (sd?.formats?.length || 0) + (sd?.adaptiveFormats?.length || 0);
    if (ps.status === "OK" && sd && fmtCount > 0) {
      const all = [...(sd.formats || []), ...(sd.adaptiveFormats || [])].filter((f) => f.url);
      const muxed = all.filter((f) => isMp4(f) && hasAudio(f));
      const videoOnly = all.filter((f) => !hasAudio(f) && (f.mimeType || "").startsWith("video/"));
      const audioOnly = all.filter((f) => (f.mimeType || "").startsWith("audio/"));
      const primary = muxed.length ? pickBest(muxed) : pickBest(videoOnly);
      if (!primary?.url) continue;

      const byTier = new Map<number, YtFormat>();
      for (const f of [...muxed, ...videoOnly]) {
        const key = f.height || -1;
        if (key === (primary.height || -1)) continue;
        const cur = byTier.get(key);
        if (!cur || (isMp4(f) && !isMp4(cur)) || (isMp4(f) === isMp4(cur) && (f.bitrate || 0) > (cur.bitrate || 0))) {
          byTier.set(key, f);
        }
      }
      const variants = [...byTier.values()]
        .filter((f) => f.url)
        .sort((a, b) => (b.height || 0) - (a.height || 0))
        .map((f) => ({
          url: f.url!,
          quality: f.height ? `${f.height}p` : `itag${f.itag}`,
          width: f.width,
          height: f.height,
          size: f.contentLength ? Number(f.contentLength) : undefined,
        }));

      const bestAudio = [...audioOnly].sort((a, b) => {
        const mp4 = Number((b.mimeType || "").startsWith("audio/mp4")) - Number((a.mimeType || "").startsWith("audio/mp4"));
        return mp4 !== 0 ? mp4 : (b.bitrate || 0) - (a.bitrate || 0);
      })[0];
      const thumbs = player.videoDetails?.thumbnail?.thumbnails || [];
      const expiresRaw = Number(sd.expiresInSeconds || 0);

      return {
        platform: "youtube",
        kind: "video",
        title: player.videoDetails?.title || "YouTube 视频",
        desc: player.videoDetails?.shortDescription,
        cover: [...thumbs].reverse().find((t) => t.url)?.url,
        author: { name: player.videoDetails?.author || "YouTube 频道" },
        stats: { play: Number(player.videoDetails?.viewCount || 0) || undefined },
        durationMs: Number(player.videoDetails?.lengthSeconds || 0) * 1000 || undefined,
        videos: [
          {
            url: primary.url,
            quality: primary.height ? `${primary.height}p${primary.fps && primary.fps > 30 ? primary.fps : ""}` : "auto",
            width: primary.width,
            height: primary.height,
            size: primary.contentLength ? Number(primary.contentLength) : undefined,
          },
          ...variants,
        ],
        music: bestAudio?.url ? { url: bestAudio.url, title: "音轨 (DASH)" } : undefined,
        expiresAt: expiresRaw > 0 ? Math.floor(Date.now() / 1000) + expiresRaw : undefined,
        via: `innertube-${client.name.toLowerCase()}`,
        parsedAt: Math.floor(Date.now() / 1000),
      };
    }
  }

  if (lastStatus === "LOGIN_REQUIRED") {
    throw new EngineError("RISK_CONTROL", `YouTube 风控拦截（${lastReason || lastStatus}）`, "数据中心 IP 可能被要求登录验证，更换出口 IP 后重试");
  }
  if (lastStatus === "UNPLAYABLE" || lastStatus === "ERROR") {
    throw new EngineError("PARSE_FAIL", `视频不可用（${lastReason || lastStatus}）`);
  }
  if (lastStatus === "NETWORK") {
    throw new EngineError("NETWORK", "无法连接 YouTube", "当前部署网络无法访问 youtube.com，自部署于可达网络后即可解析");
  }
  throw new EngineError("UPSTREAM", `YouTube 播放状态异常：${lastStatus || "未知"}`);
}
