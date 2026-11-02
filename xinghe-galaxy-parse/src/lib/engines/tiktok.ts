// TikTok 引擎 · tikwm 公开接口(方案移植自开源项目 allparse 的实测链路)
// GET https://www.tikwm.com/api/?url=<完整链接>&hd=1
// 短链 vm./vt.tiktok.com 先本地展开(302 Location),再交给 tikwm
import { EngineError, ParseResult, UA_BROWSER, fetchX } from "./types";

interface TikwmData {
  id?: string;
  title?: string;
  cover?: string;
  origin_cover?: string;
  duration?: number;
  size?: number;
  play?: string;
  wmplay?: string;
  hdplay?: string;
  images?: string[];
  music?: string;
  music_info?: { title?: string; play?: string; cover?: string };
  author?: { id?: string; unique_id?: string; nickname?: string; avatar?: string };
  create_time?: number;
}

const abs = (u: string | undefined) => (u ? (u.startsWith("/") ? `https://www.tikwm.com${u}` : u) : "");

async function expandShort(url: string): Promise<string> {
  const host = new URL(url).hostname;
  if (host !== "vm.tiktok.com" && host !== "vt.tiktok.com") return url;
  const res = await fetchX(url, {
    method: "GET",
    redirect: "manual",
    headers: { accept: "*/*", "User-Agent": UA_BROWSER },
    timeoutMs: 15000,
  });
  const loc = res.headers.get("location");
  return loc ? new URL(loc, url).href : url;
}

export async function parseTiktok(url: string): Promise<ParseResult> {
  let fullUrl = url;
  try {
    fullUrl = await expandShort(url);
  } catch {
    throw new EngineError("NETWORK", "TikTok 短链展开失败", "当前部署网络无法访问 tiktok.com，自部署于可达网络后即可解析");
  }

  const api = `https://www.tikwm.com/api/?url=${encodeURIComponent(fullUrl)}&hd=1`;
  let resp: Response;
  try {
    resp = await fetchX(api, {
      headers: { "User-Agent": UA_BROWSER, Accept: "application/json" },
      timeoutMs: 25000,
    });
  } catch {
    throw new EngineError("NETWORK", "tikwm 解析节点不可达", "tikwm 对部分数据中心 IP 有 Cloudflare 拦截，更换部署网络即可");
  }

  if (resp.status === 429) throw new EngineError("RATE_LIMITED", "tikwm 限流中，请稍后再试");

  const text = await resp.text();
  let json: { code?: number; msg?: string; data?: TikwmData };
  try {
    json = JSON.parse(text);
  } catch {
    throw new EngineError("NETWORK", "tikwm 返回非 JSON（疑似被 Cloudflare 拦截）", "tikwm 对部分数据中心 IP 有风控，更换部署网络即可");
  }
  if (json.code !== 0 || !json.data) {
    throw new EngineError("PARSE_FAIL", `TikTok 解析失败：${json.msg || "链接无效或作品不存在"}`);
  }
  const d = json.data;
  const images = (d.images || []).map(abs).filter(Boolean);
  const play = abs(d.play);
  const hd = abs(d.hdplay);
  const isAlbum = images.length > 0 && (!play || play === abs(d.music));

  if (!play && !images.length) {
    throw new EngineError("PARSE_FAIL", "该作品没有可下载资源");
  }

  const videos = isAlbum ? [] : [
    { url: play, quality: "HD", size: d.size },
    ...(hd && hd !== play ? [{ url: hd, quality: "高清", size: d.size }] : []),
  ];

  return {
    platform: "tiktok",
    kind: isAlbum ? "image" : "video",
    title: (d.title || "TikTok 作品").trim().slice(0, 120),
    cover: abs(d.origin_cover) || abs(d.cover),
    author: d.author
      ? {
          name: d.author.nickname || d.author.unique_id || "TikTok 用户",
          id: d.author.unique_id,
          avatar: d.author.avatar,
        }
      : undefined,
    stats: {},
    durationMs: d.duration ? d.duration * 1000 : undefined,
    createTime: d.create_time,
    videos,
    images,
    music: abs(d.music) ? { url: abs(d.music), title: d.music_info?.title } : undefined,
    via: "tikwm",
    parsedAt: Math.floor(Date.now() / 1000),
  };
}
