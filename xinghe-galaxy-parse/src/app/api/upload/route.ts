// POST /api/upload  FormData(file) → 星云仓库多通道直链
import { NextRequest, NextResponse } from "next/server";
import { uploadToCloud } from "@/lib/engines/cloud";
import { EngineError } from "@/lib/engines/types";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ error: "请求必须是 multipart/form-data" }, { status: 400 });
  }
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "缺少 file 字段" }, { status: 400 });
  }
  if (file.size === 0) {
    return NextResponse.json({ error: "文件为空" }, { status: 400 });
  }
  try {
    const { link, channel } = await uploadToCloud(file);
    return NextResponse.json({
      ok: true,
      link,
      channel,
      fileName: file.name,
      size: file.size,
    });
  } catch (e) {
    if (e instanceof EngineError) {
      return NextResponse.json({ error: e.message, hint: e.hint, code: e.code }, { status: e.code === "TOO_LARGE" ? 413 : 502 });
    }
    const message = e instanceof Error ? e.message : "上传失败";
    return NextResponse.json({ error: message, code: "INTERNAL" }, { status: 500 });
  }
}
