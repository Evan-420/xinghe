// POST /api/parse  { text | url } → 自动识别平台 → 引擎解析 → 统一结果
import { NextRequest, NextResponse } from "next/server";
import {
  EngineError,
  extractUrl,
  detectPlatform,
  ParseResult,
  PLATFORM_META,
} from "@/lib/engines/types";
import { parseDouyin, parseKuaishou } from "@/lib/engines/shortvideo";
import { parseTwitter } from "@/lib/engines/twitter";
import { parseXhs } from "@/lib/engines/xhs";
import { parseTiktok } from "@/lib/engines/tiktok";
import { parseYoutube } from "@/lib/engines/youtube";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  let body: { text?: string; url?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "请求体必须是 JSON" }, { status: 400 });
  }

  const raw = (body.text || body.url || "").trim();
  const url = extractUrl(raw);
  if (!url) {
    return NextResponse.json(
      {
        error: "未在输入中检测到链接",
        hint: "请粘贴包含 http(s):// 链接的分享文本，例如「7.72 复制打开抖音 https://v.douyin.com/xxxx」",
        code: "NO_URL",
      },
      { status: 400 }
    );
  }

  const platform = detectPlatform(url);
  if (!platform) {
    const host = (() => {
      try {
        return new URL(url).hostname;
      } catch {
        return url;
      }
    })();
    return NextResponse.json(
      {
        error: `暂不支持 ${host}，当前支持：抖音 / 快手 / 小红书 / TikTok / YouTube / X`,
        code: "UNSUPPORTED",
      },
      { status: 422 }
    );
  }

  try {
    let result: ParseResult;
    switch (platform) {
      case "douyin":
        result = await parseDouyin(url);
        break;
      case "kuaishou":
        result = await parseKuaishou(url);
        break;
      case "xhs":
        result = await parseXhs(url);
        break;
      case "tiktok":
        result = await parseTiktok(url);
        break;
      case "youtube":
        result = await parseYoutube(url);
        break;
      case "twitter":
        result = await parseTwitter(url);
        break;
      default:
        throw new EngineError("UNSUPPORTED", "不支持的平台");
    }
    return NextResponse.json({
      ok: true,
      platform: PLATFORM_META[platform],
      inputUrl: url,
      result,
    });
  } catch (e) {
    if (e instanceof EngineError) {
      return NextResponse.json(
        { error: e.message, hint: e.hint, code: e.code, platform },
        { status: e.code === "RATE_LIMITED" ? 429 : 502 }
      );
    }
    const message = e instanceof Error ? e.message : "解析失败";
    return NextResponse.json({ error: message, code: "INTERNAL", platform }, { status: 500 });
  }
}
