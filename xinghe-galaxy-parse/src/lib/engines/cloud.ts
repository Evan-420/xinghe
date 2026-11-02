// 星云仓库引擎 · 多通道公共网盘直链托管
// 主通道:POST /upload + X-Auth-Token(JWT HS256) ≤50MB
// 备用:职教云 icve OSS 通道(>50MB) / opple 通道(兜底)
// 兼容性:Buffer / node:crypto 在 Cloudflare Workers(nodejs_compat)下同样可用
import { createHash } from "node:crypto";
import { EngineError, UA_BROWSER, fetchX } from "./types";

const UPLOAD_SECRET = "9a31f2e82617e4b4b482110f8c928b9b2734d809f060c30f12e8b2574a84c122";

function b64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// 流式计算 SHA-256:分块读取而非 file.arrayBuffer() 整体拷贝,
// 避免大文件在内存受限环境(Cloudflare Workers 单隔离实例 128MB)中出现双份拷贝导致 OOM。
// File 的 .stream() 可反复消费,不影响后续 FormData 转发。
async function sha256Hex(file: File): Promise<string> {
  const hash = createHash("sha256");
  const reader = file.stream().getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) hash.update(value);
  }
  return hash.digest("hex");
}

async function makeToken(sha256?: string): Promise<string> {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify(sha256 ? { timestamp: Date.now(), sha256 } : { timestamp: Date.now() }));
  const hmac = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(UPLOAD_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", hmac, new TextEncoder().encode(`${header}.${payload}`));
  return `${header}.${payload}.${b64url(Buffer.from(sig))}`;
}

export interface CloudUploadResult {
  link: string;
  channel: "tc" | "icve" | "opple";
}

/** 主通道上传接口 */
async function viaTc(file: File): Promise<string> {
  const token = await makeToken(await sha256Hex(file));
  const fd = new FormData();
  fd.append("file", file, file.name);
  const resp = await fetchX("https://tc.qdqqd.com/upload", {
    method: "POST",
    headers: { "X-Auth-Token": token, "User-Agent": UA_BROWSER },
    body: fd,
    timeoutMs: 180000,
  });
  const text = await resp.text();
  if (resp.status !== 200) throw new Error(`tc 通道 HTTP ${resp.status}: ${text.slice(0, 120)}`);
  const data = JSON.parse(text) as { data?: string; msg?: string };
  if (!data.data) throw new Error(data.msg || "tc 通道未返回链接");
  return data.data;
}

/** 兜底通道:cac.opple.com(返回 {state:1, url}) */
async function viaOpple(file: File): Promise<string> {
  const fd = new FormData();
  fd.append("file", file, file.name);
  const resp = await fetchX("https://cac.opple.com/yc-media/servlet/upload", {
    method: "POST",
    headers: { "User-Agent": UA_BROWSER },
    body: fd,
    timeoutMs: 180000,
  });
  const data = JSON.parse(await resp.text()) as { state?: number; url?: string };
  if (data.state !== 1 || !data.url) throw new Error("opple 通道失败");
  const ext = file.name.includes(".") ? file.name.split(".").pop() : "png";
  return `https://cac.opple.com${data.url}#.${ext}`;
}

/** 大文件通道:职教云 icve OSS(公开签名, >50MB 时走这里) */
async function viaIcve(file: File): Promise<string> {
  const tokenResp = await fetchX("https://www.icve.com.cn/project/Api/upload?type", {
    headers: { "User-Agent": UA_BROWSER },
    timeoutMs: 20000,
  });
  const conf = (await tokenResp.json()) as {
    file_system_url?: string;
    signature?: { policy?: string; signature?: string; callback?: string };
    OSSAccessKeyId?: string;
  };
  if (!conf.file_system_url || !conf.signature) throw new Error("icve 通道取签名失败");
  const rnd = () => String(Math.floor(Math.random() * 900) + 100);
  const randName = Array.from({ length: 8 }, () =>
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 62)]
  ).join("");
  const dot = file.name.lastIndexOf(".");
  const ext = dot !== -1 ? file.name.slice(dot + 1).toLowerCase() : "png";
  const key = `file_doc/${rnd()}/${rnd()}/${rnd()}/${randName}.${ext}`;

  const fd = new FormData();
  fd.append("key", key);
  fd.append("policy", conf.signature.policy || "");
  fd.append("OSSAccessKeyId", conf.OSSAccessKeyId || "");
  fd.append("signature", conf.signature.signature || "");
  fd.append("callback", conf.signature.callback || "");
  fd.append("file", file, file.name);
  const resp = await fetchX(conf.file_system_url, {
    method: "POST",
    body: fd,
    timeoutMs: 300000,
  });
  if (resp.status < 200 || resp.status >= 300) throw new Error(`icve 通道 HTTP ${resp.status}`);
  return `https://file.icve.com.cn/${key}`;
}

const MB = 1024 * 1024;

export async function uploadToCloud(file: File): Promise<CloudUploadResult> {
  if (file.size > 2000 * MB) {
    throw new EngineError("TOO_LARGE", "文件超出 2GB 上限");
  }
  // 与官网一致的通道选择:>50MB 走 icve,主通道失败 opple 兜底
  if (file.size <= 50 * MB) {
    try {
      return { link: await viaTc(file), channel: "tc" };
    } catch {
      try {
        return { link: await viaOpple(file), channel: "opple" };
      } catch {
        throw new EngineError("UPSTREAM", "上传通道暂时不可用，请稍后重试");
      }
    }
  }
  try {
    return { link: await viaIcve(file), channel: "icve" };
  } catch {
    try {
      return { link: await viaOpple(file), channel: "opple" };
    } catch {
      throw new EngineError("UPSTREAM", "大文件上传通道暂时不可用，请稍后重试");
    }
  }
}
