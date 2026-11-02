// GET /api/media?url=<enc> · 媒体流代理
// 让解析所得直链在本站内直接播放：服务端补齐 Referer/UA 绕过 CDN 防盗链，
// 透传 Range 请求(206)以支持 <video> 拖动进度条，全程流式转发不落盘。
// ?dl=<文件名> —— 强制以附件形式下载（Content-Disposition），
//                并在上游 Content-Type 明确时自动补全扩展名。
import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const UA_BROWSER =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

// 常见 Content-Type → 扩展名（下载文件名未携带扩展名时自动补全）
const CT_EXT: Record<string, string> = {
  "video/mp4": ".mp4",
  "video/webm": ".webm",
  "video/quicktime": ".mov",
  "video/x-msvideo": ".avi",
  "video/x-flv": ".flv",
  "audio/mpeg": ".mp3",
  "audio/mp4": ".m4a",
  "audio/aac": ".aac",
  "audio/wav": ".wav",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/heic": ".heic",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
  "application/pdf": ".pdf",
};

// 按平台 CDN 匹配合适的 Referer（防盗链大多校验同站来源）
function refererFor(url: string): string | undefined {
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return undefined;
  }
  if (/douyin|douyinvod|bytecdn|bytedance|snssdk|toutiao|bdurl|volccdn|ixigua/.test(host)) return "https://www.douyin.com/";
  if (/kuaishou|chenzhongtech|gifshow|yxixia|ksapisrv/.test(host)) return "https://www.kuaishou.com/";
  if (/xiaohongshu|xhscdn|xhslink/.test(host)) return "https://www.xiaohongshu.com/";
  if (/tiktok|tiktokcdn|tikwm|musical/.test(host)) return "https://www.tiktok.com/";
  if (/twitter|twimg|x\.com|t\.co/.test(host)) return "https://x.com/";
  if (/youtube|googlevideo|youtu\.be/.test(host)) return "https://www.youtube.com/";
  // 其余来源：回退为目标自身同源 Referer（多数静态床要求同源或不校验）
  return new URL(url).origin + "/";
}

// 基础 SSRF 防护：拒绝回环 / 内网地址
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h === "0.0.0.0" || h === "::1" || h.endsWith(".local") || h.endsWith(".internal")) return true;
  if (/^(10|127|169\.254|192\.168)\./.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(h)) return true;
  return false;
}

export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("url");
  const dlNameRaw = req.nextUrl.searchParams.get("dl"); // 可选：期望的下载文件名
  if (!raw) {
    return Response.json({ error: "缺少 url 参数", code: "BAD_REQUEST" }, { status: 400 });
  }
  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    return Response.json({ error: "url 参数不合法", code: "BAD_REQUEST" }, { status: 400 });
  }
  if (target.protocol !== "https:" && target.protocol !== "http:") {
    return Response.json({ error: "仅支持 http/https 链接", code: "BAD_REQUEST" }, { status: 400 });
  }
  if (isBlockedHost(target.hostname)) {
    return Response.json({ error: "目标地址不允许代理", code: "FORBIDDEN" }, { status: 403 });
  }

  // 透传浏览器的 Range 头，支持视频流式拖动
  const range = req.headers.get("range");
  const upstreamHeaders: Record<string, string> = {
    "User-Agent": UA_BROWSER,
    Accept: "*/*",
    "Accept-Language": "zh-CN,zh;q=0.9",
    "Accept-Encoding": "identity",
  };
  if (range) upstreamHeaders.Range = range;
  const ref = refererFor(raw);
  if (ref) upstreamHeaders.Referer = ref;

  let upstream: Response;
  try {
    upstream = await fetch(target.toString(), {
      headers: upstreamHeaders,
      redirect: "follow",
      cache: "no-store",
    });
  } catch {
    return Response.json({ error: "无法连接媒体源，请稍后重试", code: "UPSTREAM" }, { status: 502 });
  }
  // 206 = Range 命中(正常)；其余非 2xx 视为失败
  if (!upstream.ok && upstream.status !== 206) {
    return Response.json(
      { error: `媒体源返回 ${upstream.status}，直链可能已过期`, code: "UPSTREAM" },
      { status: 502 }
    );
  }

  const out = new Headers();
  for (const k of ["content-type", "content-length", "content-range", "accept-ranges", "etag", "last-modified"]) {
    const v = upstream.headers.get(k);
    if (v) out.set(k, v);
  }
  if (!out.has("content-type")) out.set("content-type", "application/octet-stream");
  if (upstream.status === 206) out.set("accept-ranges", "bytes");
  out.set("x-content-type-options", "nosniff");
  out.set("cache-control", "private, max-age=600");

  // 下载模式：强制浏览器另存为文件，而非内联播放/预览
  if (dlNameRaw) {
    let name = dlNameRaw.replace(/[\\/:*?"<>|\r\n]/g, "").trim().slice(0, 80);
    if (!name) name = "download";
    if (!/\.[A-Za-z0-9]{1,5}$/.test(name)) {
      const ct = (out.get("content-type") || "").split(";")[0].trim().toLowerCase();
      if (ct === "application/octet-stream") {
        // 从 URL 路径猜一个常见媒体扩展名
        const m = raw.split("?")[0].match(/\.(mp4|mov|webm|flv|mp3|m4a|jpg|jpeg|png|webp|gif)$/i);
        if (m) name += "." + m[1].toLowerCase().replace("jpeg", "jpg");
      } else if (CT_EXT[ct]) {
        name += CT_EXT[ct];
      }
    }
    out.set("content-disposition", `attachment; filename*=UTF-8''${encodeURIComponent(name)}`);
  }

  return new Response(upstream.body, { status: upstream.status, headers: out });
}
