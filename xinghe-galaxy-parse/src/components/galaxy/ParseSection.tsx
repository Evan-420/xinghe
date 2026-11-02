"use client";

// 星河 · 全平台解析区
import { useCallback, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import {
  Search,
  Loader2,
  Sparkles,
  Download,
  Copy,
  ExternalLink,
  Music2,
  AlertTriangle,
  Wand2,
  Image as ImageIcon,
  Film,
  Radio,
  Timer,
  Eye,
  ThumbsUp,
  MessageCircle,
  Share2,
  Star,
  Link2,
} from "lucide-react";
import { PlatformGlyph } from "./PlatformIcons";
import type { ParseResult } from "@/lib/engines/types";

interface ParseResponse {
  ok?: boolean;
  error?: string;
  hint?: string;
  code?: string;
  platform?: string;
  inputUrl?: string;
  result?: ParseResult;
}

const KIND_LABEL: Record<string, string> = {
  video: "视频",
  image: "图集",
  mixed: "视频 + 图集",
  live: "直播",
};

function fmtNum(n?: number): string {
  if (!n || n <= 0) return "";
  if (n >= 1e8) return (n / 1e8).toFixed(1).replace(/\.0$/, "") + "亿";
  if (n >= 1e4) return (n / 1e4).toFixed(1).replace(/\.0$/, "") + "万";
  return String(n);
}

function fmtDuration(ms?: number): string {
  if (!ms || ms <= 0) return "";
  const s = Math.round(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

function fmtDate(ts?: number): string {
  if (!ts) return "";
  const d = new Date(ts * 1000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const EXAMPLE_LINKS = [
  { label: "抖音示例", text: "https://v.douyin.com/kfO-hDJg40g/" },
  { label: "快手示例", text: "https://v.kuaishou.com/JZIEtZbT" },
];

// 站内媒体代理：绕过 CDN 防盗链，让直链在本站直接播放/显示
const proxied = (u: string) => `/api/media?url=${encodeURIComponent(u)}`;
// 下载直链：走站内代理并携带 dl 参数 → 强制附件下载（自动补全扩展名）
const dlHref = (u: string, name: string) =>
  `/api/media?url=${encodeURIComponent(u)}&dl=${encodeURIComponent(name)}`;

export default function ParseSection() {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [detected, setDetected] = useState<string | null>(null);
  const [data, setData] = useState<ParseResponse | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);

  const guessPlatform = useCallback((text: string): string | null => {
    const m = text.match(/https?:\/\/([0-9a-zA-Z.-]+)\.[a-z]{2,}/i);
    if (!m) {
      if (/抖音|douyin/i.test(text)) return "douyin";
      if (/快手|kuaishou/i.test(text)) return "kuaishou";
      if (/小红书|xiaohongshu|xhs/i.test(text)) return "xhs";
      if (/tiktok/i.test(text)) return "tiktok";
      if (/youtube|油管/i.test(text)) return "youtube";
      if (/twitter|推特/i.test(text)) return "twitter";
      return null;
    }
    const h = m[1].toLowerCase();
    if (h.includes("douyin")) return "douyin";
    if (h.includes("kuaishou") || h.includes("chenzhongtech") || h.includes("gifshow")) return "kuaishou";
    if (h.includes("xhslink") || h.includes("xiaohongshu")) return "xhs";
    if (h.includes("tiktok")) return "tiktok";
    if (h.includes("youtu")) return "youtube";
    if (h.includes("x.com") || h.includes("twitter") || h.includes("t.co")) return "twitter";
    return null;
  }, []);

  const onInputChange = (v: string) => {
    setInput(v);
    setDetected(guessPlatform(v));
  };

  const doParse = async (text?: string) => {
    const payload = (text ?? input).trim();
    if (!payload) {
      toast({ title: "请先粘贴分享链接", variant: "destructive" });
      inputRef.current?.focus();
      return;
    }
    setLoading(true);
    setData(null);
    try {
      const res = await fetch("/api/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: payload }),
      });
      const json = (await res.json()) as ParseResponse;
      setData(json);
      if (json.ok) {
        setHistory((h) => [payload, ...h.filter((x) => x !== payload)].slice(0, 6));
        toast({ title: "解析成功", description: "星河已捕获该作品的无水印直链" });
      } else {
        toast({ title: "解析失败", description: json.error, variant: "destructive" });
      }
    } catch {
      setData({ error: "网络请求失败，请稍后重试" });
      toast({ title: "网络错误", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copy = (text: string, label = "链接") => {
    navigator.clipboard.writeText(text).then(
      () => toast({ title: `已复制${label}` }),
      () => toast({ title: "复制失败", variant: "destructive" })
    );
  };

  const result = data?.result;
  const videoUrl = useMemo(() => result?.videos[0]?.url, [result]);

  // 下载文件名基底：平台 + 标题摘要（扩展名由代理根据 Content-Type 自动补全）
  const fileBase = useMemo(() => {
    if (!result) return "media";
    const t = (result.title || "")
      .replace(/[\\/:*?"<>|#&%\s]+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .slice(0, 30);
    const p = result.platform || "media";
    return t ? `${p}_${t}` : p;
  }, [result]);

  return (
    <section id="parse" className="relative mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <div className="mb-6 text-center">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-violet-200/90 backdrop-blur">
          <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
          六大平台 · 粘贴即析 · 无水印原片
        </div>
        <h2 className="bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
          星链解析矩阵
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-300/80">
          把任意一条分享文本丢进来 —— 星河会自动识别平台、穿透短链、剥开水印，将最原始的高清媒体直链呈现在你面前。
        </p>
      </div>

      {/* 输入区 */}
      <div className="group relative rounded-2xl border border-white/10 bg-white/[0.04] p-1.5 shadow-[0_0_60px_-15px_rgba(139,92,246,0.35)] backdrop-blur-xl transition-shadow duration-500 focus-within:shadow-[0_0_80px_-10px_rgba(139,92,246,0.55)]">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !loading && doParse()}
              placeholder="粘贴抖音 / 快手 / 小红书 / TikTok / YouTube / X 分享链接或整段分享文案…"
              className="h-13 border-0 bg-transparent pl-11 pr-24 text-[15px] text-white placeholder:text-slate-500 focus-visible:ring-0"
              aria-label="分享链接输入框"
              disabled={loading}
            />
            {detected && (
              <span className="absolute right-3 top-1/2 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white">
                <PlatformGlyph platform={detected} className="h-3.5 w-3.5" />
                已识别
              </span>
            )}
          </div>
          <Button
            onClick={() => doParse()}
            disabled={loading}
            className="h-13 bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 px-8 text-[15px] font-semibold text-white shadow-lg shadow-violet-900/50 transition-all duration-300 hover:shadow-violet-700/60 hover:brightness-110 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="mr-1 h-4 w-4 animate-spin" /> 星河解析中
              </>
            ) : (
              <>
                <Wand2 className="mr-1 h-4 w-4" /> 立即解析
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 示例 & 历史 */}
      <div className="mt-3 flex flex-wrap items-center gap-2 px-1 text-xs text-slate-400">
        <span className="text-slate-500">快速体验：</span>
        {EXAMPLE_LINKS.map((e) => (
          <button
            key={e.label}
            onClick={() => {
              setInput(e.text);
              setDetected(guessPlatform(e.text));
              doParse(e.text);
            }}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1 transition-colors duration-300 hover:border-violet-400/40 hover:text-violet-200"
          >
            {e.label}
          </button>
        ))}
        {history.length > 0 && (
          <>
            <span className="ml-2 text-slate-500">最近：</span>
            {history.slice(0, 3).map((h, i) => (
              <button
                key={i}
                onClick={() => {
                  setInput(h);
                  setDetected(guessPlatform(h));
                }}
                className="max-w-45 truncate rounded-full border border-white/10 bg-white/5 px-3 py-1 transition-colors duration-300 hover:border-cyan-400/40 hover:text-cyan-200"
              >
                {h.slice(0, 30)}
              </button>
            ))}
          </>
        )}
      </div>

      {/* 加载进度 */}
      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 rounded-xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur"
          >
            <div className="mb-2 flex items-center justify-between text-xs text-slate-300">
              <span className="flex items-center gap-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />
                {detected ? `正在穿越 ${detected === "xhs" ? "小红书" : detected === "twitter" ? "X" : ""} 星域…` : "正在定位链接坐标…"}
              </span>
              <span className="font-mono text-cyan-300">QUANTUM LINK</span>
            </div>
            <Progress value={66} className="h-1.5 bg-white/10 *:data-[slot=progress-indicator]:bg-gradient-to-r *:data-[slot=progress-indicator]:from-violet-500 *:data-[slot=progress-indicator]:to-cyan-400" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* 错误卡片 */}
      <AnimatePresence>
        {data && !data.ok && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-5 rounded-xl border border-rose-400/20 bg-rose-500/[0.07] p-5 backdrop-blur"
          >
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
              <div className="min-w-0">
                <p className="font-medium text-rose-200">{data.error}</p>
                {data.hint && <p className="mt-1 text-xs leading-relaxed text-rose-200/60">{data.hint}</p>}
                <p className="mt-2 font-mono text-[11px] text-rose-200/40">ERR · {data.code} {data.platform ? `· ${data.platform}` : ""}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 结果卡片 */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="mt-6 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03] shadow-[0_20px_80px_-20px_rgba(124,58,237,0.4)] backdrop-blur-xl"
          >
            {/* 头部:平台徽标 + 类型 */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-white/[0.03] px-5 py-3">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/10 text-white">
                  <PlatformGlyph platform={result.platform} className="h-4.5 w-4.5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-white">
                    {KIND_LABEL[result.kind] || "作品"}解析完成
                  </p>
                  <p className="text-[11px] text-slate-400">via {result.via}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {result.ipLocation && <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-300">IP {result.ipLocation}</Badge>}
                {fmtDate(result.createTime) && <Badge variant="outline" className="border-white/15 bg-white/5 text-slate-300">{fmtDate(result.createTime)}</Badge>}
                {result.expiresAt && (
                  <Badge className="gap-1 border-amber-400/30 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25">
                    <Timer className="h-3 w-3" /> 直链有时效
                  </Badge>
                )}
              </div>
            </div>

            <div className="grid gap-5 p-5 md:grid-cols-[220px_1fr]">
              {/* 左:封面 */}
              <div className="space-y-3">
                {result.cover && (
                  <div className="relative overflow-hidden rounded-xl border border-white/10">
                    <img
                      src={proxied(result.cover)}
                      alt="作品封面"
                      className="aspect-3/4 w-full object-cover"
                      loading="lazy"
                    />
                    {result.durationMs ? (
                      <span className="absolute bottom-2 right-2 flex items-center gap-1 rounded-md bg-black/70 px-1.5 py-0.5 text-[11px] font-mono text-white">
                        <Film className="h-3 w-3" /> {fmtDuration(result.durationMs)}
                      </span>
                    ) : null}
                  </div>
                )}
                {/* 作者 */}
                {result.author && (
                  <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/[0.04] p-3">
                    {result.author.avatar ? (
                      <img src={proxied(result.author.avatar)} alt="作者头像" className="h-10 w-10 shrink-0 rounded-full border border-white/20 object-cover" />
                    ) : (
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/30 text-violet-200">
                        <Star className="h-4 w-4" />
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{result.author.name}</p>
                      {result.author.id && <p className="truncate text-[11px] text-slate-400">@{result.author.id}</p>}
                      {result.author.signature && <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-slate-500">{result.author.signature}</p>}
                    </div>
                  </div>
                )}
              </div>

              {/* 右:标题/数据/媒体/直链 */}
              <div className="min-w-0 space-y-4">
                <p className="text-[15px] leading-relaxed text-slate-100">{result.title}</p>

                {/* 数据徽章 */}
                <div className="flex flex-wrap gap-2">
                  {result.stats?.play ? <Stat icon={<Eye className="h-3.5 w-3.5" />} label="播放" value={fmtNum(result.stats.play)} /> : null}
                  {result.stats?.like ? <Stat icon={<ThumbsUp className="h-3.5 w-3.5" />} label="点赞" value={fmtNum(result.stats.like)} /> : null}
                  {result.stats?.comment ? <Stat icon={<MessageCircle className="h-3.5 w-3.5" />} label="评论" value={fmtNum(result.stats.comment)} /> : null}
                  {result.stats?.share ? <Stat icon={<Share2 className="h-3.5 w-3.5" />} label="分享" value={fmtNum(result.stats.share)} /> : null}
                  {result.stats?.favorite ? <Stat icon={<Star className="h-3.5 w-3.5" />} label="收藏" value={fmtNum(result.stats.favorite)} /> : null}
                  {result.images.length > 0 && <Stat icon={<ImageIcon className="h-3.5 w-3.5" />} label="图片" value={`${result.images.length} 张`} />}
                </div>

                {/* 视频预览（经站内代理，可直接播放） */}
                {videoUrl && result.kind !== "live" && (
                  <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40">
                    <video
                      key={videoUrl}
                      controls
                      playsInline
                      preload="metadata"
                      poster={result.cover ? proxied(result.cover) : undefined}
                      className="max-h-90 w-full bg-black"
                    >
                      <source src={proxied(videoUrl)} type="video/mp4" />
                      您的浏览器不支持内嵌视频播放，请点击下方下载按钮
                    </video>
                    <a
                      href={dlHref(videoUrl, fileBase)}
                      download
                      className="flex items-center justify-center gap-2 border-t border-white/10 bg-gradient-to-r from-violet-600/25 to-cyan-600/25 py-2.5 text-[13px] font-medium text-white transition-all duration-300 hover:from-violet-600/45 hover:to-cyan-600/45"
                    >
                      <Download className="h-4 w-4" /> 下载视频 · 无水印原片
                    </a>
                  </div>
                )}

                {/* 直播流列表 */}
                {result.kind === "live" && result.liveStreams && (
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-sm font-medium text-rose-200">
                      <Radio className="h-4 w-4 animate-pulse" /> 直播流（{result.liveStreams.length} 条线路）
                    </p>
                    {result.liveStreams.map((s, i) => (
                      <LinkRow key={i} label={`${s.label} · FLV`} url={s.flv || s.hls || ""} onCopy={copy} />
                    ))}
                  </div>
                )}

                {/* 图集缩略 */}
                {result.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {result.images.slice(0, 8).map((img, i) => (
                      <a key={i} href={img} target="_blank" rel="noopener noreferrer" className="group relative overflow-hidden rounded-lg border border-white/10">
                        <img src={proxied(img)} alt={`图片 ${i + 1}`} loading="lazy" className="aspect-square w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                      </a>
                    ))}
                    {result.images.length > 8 && (
                      <div className="flex aspect-square items-center justify-center rounded-lg border border-white/10 bg-white/5 text-xs text-slate-400">
                        +{result.images.length - 8}
                      </div>
                    )}
                  </div>
                )}

                {/* 直链列表 */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-400">无水印直链 · {result.videos.length + result.images.length} 条</p>
                    {(result.videos.length + result.images.length) > 1 && (
                      <button
                        onClick={() => copy([...result.videos.map((v) => v.url), ...result.images].join("\n"), "全部链接")}
                        className="text-xs text-cyan-300 transition-colors hover:text-cyan-200"
                      >
                        复制全部
                      </button>
                    )}
                  </div>
                  {result.videos.map((v, i) => (
                    <LinkRow
                      key={`v${i}`}
                      label={`视频${result.videos.length > 1 ? ` ${i + 1}` : ""}${v.quality ? ` · ${v.quality}` : ""}`}
                      url={v.url}
                      onCopy={copy}
                      dl={result.videos.length > 1 ? `${fileBase}_v${i + 1}` : fileBase}
                    />
                  ))}
                  {result.images.map((img, i) => (
                    <LinkRow key={`i${i}`} label={`图片 ${i + 1}`} url={img} onCopy={copy} dl={`${fileBase}_img${i + 1}`} />
                  ))}
                  {result.music?.url && (
                    <LinkRow
                      label={`音频${result.music.title ? ` · ${result.music.title}` : ""}`}
                      url={result.music.url}
                      onCopy={copy}
                      icon={<Music2 className="h-3.5 w-3.5" />}
                      dl={`${fileBase}_music`}
                    />
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
      <span className="text-cyan-300">{icon}</span>
      {label} <b className="font-semibold text-white">{value}</b>
    </span>
  );
}

function LinkRow({
  label,
  url,
  onCopy,
  icon,
  dl,
}: {
  label: string;
  url: string;
  onCopy: (t: string, l?: string) => void;
  icon?: React.ReactNode;
  dl?: string;
}) {
  if (!url) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2 transition-colors duration-300 hover:border-violet-400/30">
      <span className="flex shrink-0 items-center gap-1.5 text-xs text-violet-300">{icon || <Link2 className="h-3.5 w-3.5" />}{label}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-[11px] text-slate-400">{url}</span>
      <button onClick={() => onCopy(url)} className="shrink-0 rounded-md bg-white/10 p-1.5 text-slate-300 transition-colors duration-300 hover:bg-emerald-500/30 hover:text-emerald-200" aria-label="复制链接">
        <Copy className="h-3.5 w-3.5" />
      </button>
      {dl && (
        <a
          href={dlHref(url, dl)}
          download
          className="shrink-0 rounded-md bg-white/10 p-1.5 text-slate-300 transition-colors duration-300 hover:bg-violet-500/30 hover:text-violet-200"
          aria-label={`下载${label}`}
          title={`下载 ${dl}`}
        >
          <Download className="h-3.5 w-3.5" />
        </a>
      )}
      <a href={url} target="_blank" rel="noopener noreferrer" className="shrink-0 rounded-md bg-white/10 p-1.5 text-slate-300 transition-colors duration-300 hover:bg-cyan-500/30 hover:text-cyan-200" aria-label="新标签打开">
        <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}
