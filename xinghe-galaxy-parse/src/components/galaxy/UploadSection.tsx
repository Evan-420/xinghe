"use client";

// 星云仓库 · 多通道公共网盘直链托管
import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  CloudUpload,
  Link2,
  Copy,
  CheckCircle2,
  FileUp,
  Loader2,
  ExternalLink,
  Download,
  Cloud,
  ShieldCheck,
  Zap,
} from "lucide-react";

interface UploadResponse {
  ok?: boolean;
  link?: string;
  channel?: string;
  fileName?: string;
  size?: number;
  error?: string;
  hint?: string;
}

const CHANNEL_LABEL: Record<string, string> = {
  tc: "星云主通道",
  icve: "icve OSS 通道",
  opple: "opple 备用通道",
};

function fmtSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return (bytes / 1024 / 1024 / 1024).toFixed(2) + " GB";
  if (bytes >= 1024 * 1024) return (bytes / 1024 / 1024).toFixed(1) + " MB";
  return (bytes / 1024).toFixed(0) + " KB";
}

export default function UploadSection() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<UploadResponse | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const doUpload = async (file: File) => {
    if (file.size > 2000 * 1024 * 1024) {
      toast({ title: "文件超出 2GB 上限", variant: "destructive" });
      return;
    }
    setUploading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      // 413:部署平台边缘层直接拒绝(如 Cloudflare 免费版请求体上限 100MB),不会进入应用
      if (res.status === 413) {
        setResult({ error: "文件体积超出部署平台的请求体上限（Cloudflare 免费版边缘节点上限为 100MB），请压缩或拆分后再试" });
        toast({ title: "文件过大", variant: "destructive" });
        return;
      }
      const json = (await res.json()) as UploadResponse;
      setResult(json);
      if (json.ok && json.link) {
        toast({ title: "已入轨星云", description: "直链生成成功" });
      } else {
        toast({ title: "上传失败", description: json.error, variant: "destructive" });
      }
    } catch {
      setResult({ error: "网络请求失败，请稍后重试" });
      toast({ title: "网络错误", variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  return (
    <section id="cloud" className="relative mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-cyan-200/90 backdrop-blur">
          <Cloud className="h-3.5 w-3.5" />
          文件入轨 · 永久直链 · 免登录
        </div>
        <h2 className="bg-gradient-to-r from-white via-cyan-200 to-violet-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
          星云仓库
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300/80">
          任何格式的文件拖进来，星河会通过三级冗余的星际通道把它送入永久轨道，并交给你一条可直连、可分享、可外链的光速直链。
        </p>
      </div>

      {/* 拖拽区 */}
      <div
        role="button"
        tabIndex={0}
        aria-label="上传文件到星云仓库"
        onClick={() => !uploading && inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && !uploading && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files?.[0];
          if (f && !uploading) doUpload(f);
        }}
        className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center backdrop-blur-xl transition-all duration-500 ${
          dragging
            ? "border-cyan-300/70 bg-cyan-400/10 shadow-[0_0_60px_-15px_rgba(34,211,238,0.5)]"
            : "border-white/15 bg-white/[0.03] hover:border-violet-300/50 hover:bg-white/[0.05]"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f && !uploading) doUpload(f);
            e.target.value = "";
          }}
        />
        <AnimatePresence mode="wait">
          {uploading ? (
            <motion.div key="up" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-cyan-300" />
              <p className="text-sm text-slate-200">正在穿越星际通道，飞向永久轨道…</p>
              <Progress value={80} className="mx-auto h-1.5 max-w-xs bg-white/10 *:data-[slot=progress-indicator]:bg-gradient-to-r *:data-[slot=progress-indicator]:from-cyan-400 *:data-[slot=progress-indicator]:to-violet-500" />
            </motion.div>
          ) : (
            <motion.div key="idle" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
              <motion.div
                animate={{ y: [0, -8, 0] }}
                transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/15 bg-gradient-to-br from-violet-500/30 to-cyan-500/30 shadow-lg shadow-violet-900/40"
              >
                <FileUp className="h-7 w-7 text-white" />
              </motion.div>
              <p className="text-[15px] font-medium text-white">拖入文件，或点击选择</p>
              <p className="text-xs text-slate-400">图片 / 视频 / 文档 / 压缩包 · 不限格式 · 单文件 ≤ 2GB</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 结果 */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className={`mt-4 rounded-xl border p-4 backdrop-blur ${
              result.ok ? "border-emerald-400/25 bg-emerald-500/[0.07]" : "border-rose-400/25 bg-rose-500/[0.07]"
            }`}
          >
            {result.ok && result.link ? (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-300">
                  <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                  <b className="text-emerald-200">{result.fileName}</b>
                  {result.size ? <span className="text-slate-400">{fmtSize(result.size)}</span> : null}
                  {result.channel && (
                    <span className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5">
                      {CHANNEL_LABEL[result.channel] || result.channel}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2.5">
                  <Link2 className="h-4 w-4 shrink-0 text-cyan-300" />
                  <span className="min-w-0 flex-1 truncate font-mono text-xs text-slate-300">{result.link}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      navigator.clipboard.writeText(result.link!).then(() => toast({ title: "直链已复制" }))
                    }
                    className="h-7 gap-1 px-2 text-xs text-cyan-300 hover:bg-cyan-500/20 hover:text-cyan-200"
                  >
                    <Copy className="h-3.5 w-3.5" /> 复制
                  </Button>
                  <a
                    href={`/api/media?url=${encodeURIComponent(result.link)}&dl=${encodeURIComponent(result.fileName || "file")}`}
                    download
                    title={`下载 ${result.fileName || ""}`}
                  >
                    <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs text-emerald-300 hover:bg-emerald-500/20 hover:text-emerald-200">
                      <Download className="h-3.5 w-3.5" /> 下载
                    </Button>
                  </a>
                  <a href={result.link} target="_blank" rel="noopener noreferrer">
                    <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs text-violet-300 hover:bg-violet-500/20 hover:text-violet-200">
                      <ExternalLink className="h-3.5 w-3.5" /> 打开
                    </Button>
                  </a>
                </div>
              </div>
            ) : (
              <p className="text-sm text-rose-200">
                {result.error}
                {result.hint && <span className="mt-1 block text-xs text-rose-200/60">{result.hint}</span>}
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* 特性 */}
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {[
          { icon: <Zap className="h-4 w-4" />, title: "光速入轨", desc: "多通道自动择优,上传即得直链" },
          { icon: <ShieldCheck className="h-4 w-4" />, title: "免登录零门槛", desc: "无需注册,不落盘,即传即走" },
          { icon: <CloudUpload className="h-4 w-4" />, title: "永久外链", desc: "图片/视频/文件皆可作外链引用" },
        ].map((f, i) => (
          <div key={i} className="rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur transition-colors duration-300 hover:border-cyan-300/30">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-cyan-500/25 to-violet-500/25 text-cyan-200">
              {f.icon}
            </div>
            <p className="text-sm font-medium text-white">{f.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-slate-400">{f.desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
