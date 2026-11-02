"use client";

// 星河 · 全平台内容解析站
import { motion, useScroll, useTransform } from "framer-motion";
import SpaceBackground from "@/components/galaxy/SpaceBackground";
import ParseSection from "@/components/galaxy/ParseSection";
import UploadSection from "@/components/galaxy/UploadSection";
import { Reveal } from "@/components/galaxy/Reveal";
import {
  PlatformGlyph,
  DouyinIcon,
  KuaishouIcon,
  XhsIcon,
  TiktokIcon,
  YoutubeIcon,
  XIcon,
} from "@/components/galaxy/PlatformIcons";
import {
  Rocket,
  Github,
  ArrowDown,
  Satellite,
  Radar,
  Orbit,
  Sparkle,
  HeartHandshake,
  Cloud,
  ChevronRight,
  Feather,
  Globe,
  FileText,
} from "lucide-react";

const PLATFORM_CARDS = [
  {
    key: "douyin",
    name: "抖音",
    en: "Douyin",
    icon: <DouyinIcon className="h-6 w-6" />,
    color: "#fe2c55",
    glow: "group-hover:shadow-[0_0_40px_-8px_#fe2c5566]",
    desc: "视频 · 图集 · 实况 · 直播",
    engine: "公开聚合解析节点",
    features: ["无水印 MP4", "图集原图", "直播 FLV/M3U8"],
  },
  {
    key: "kuaishou",
    name: "快手",
    en: "Kuaishou",
    icon: <KuaishouIcon className="h-6 w-6" />,
    color: "#ff7900",
    glow: "group-hover:shadow-[0_0_40px_-8px_#ff790066]",
    desc: "视频 · 图集 · 直播",
    engine: "公开聚合解析节点",
    features: ["原画质直链", "图集拆解", "多线路直播流"],
  },
  {
    key: "xhs",
    name: "小红书",
    en: "RedNote",
    icon: <XhsIcon className="h-6 w-6" />,
    color: "#ff2442",
    glow: "group-hover:shadow-[0_0_40px_-8px_#ff244266]",
    desc: "图文笔记 · 视频笔记",
    engine: "自研笔记页解析引擎",
    features: ["xsec_token 透传", "图集原图", "实况照片"],
  },
  {
    key: "tiktok",
    name: "TikTok",
    en: "TikTok",
    icon: <TiktokIcon className="h-6 w-6" />,
    color: "#25f4ee",
    glow: "group-hover:shadow-[0_0_40px_-8px_#25f4ee66]",
    desc: "视频 · 图集 · 音乐",
    icon2: true,
    engine: "tikwm 公开接口",
    features: ["HD 无水印", "图集原图", "背景音乐提取"],
  },
  {
    key: "youtube",
    name: "YouTube",
    en: "YouTube",
    icon: <YoutubeIcon className="h-6 w-6" />,
    color: "#ff0033",
    glow: "group-hover:shadow-[0_0_40px_-8px_#ff003366]",
    desc: "视频 · Shorts",
    engine: "innertube · ANDROID_VR→IOS",
    features: ["最高 4K", "DASH 音轨", "多档清晰度"],
  },
  {
    key: "twitter",
    name: "X / Twitter",
    en: "X",
    icon: <XIcon className="h-6 w-6" />,
    color: "#e7e9ea",
    glow: "group-hover:shadow-[0_0_40px_-8px_#e7e9ea55]",
    desc: "帖子 · 视频 · 图集",
    engine: "fxtwitter + syndication 双通道",
    features: ["最高码率 MP4", "GIF 动图", "多图下载"],
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

const HERO_EASE = [0.22, 1, 0.36, 1] as const;

export default function Home() {
  const { scrollY } = useScroll();
  const heroY = useTransform(scrollY, [0, 600], [0, 140]);
  const heroOpacity = useTransform(scrollY, [0, 480], [1, 0]);

  return (
    <div className="relative min-h-screen text-white">
      <SpaceBackground />
      {/* 顶栏 */}
      <header className="sticky top-0 z-40 border-b border-white/5 bg-[#030014]/60 backdrop-blur-xl">
        <div className="mx-auto flex h-15 max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          <a href="#" className="flex items-center gap-2.5">
            <span className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-500 shadow-lg shadow-violet-800/50">
              <Orbit className="h-5 w-5 text-white" />
            </span>
            <span className="text-lg font-bold tracking-wide">
              星河
              <span className="ml-1.5 hidden bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-xs font-medium text-transparent sm:inline">
                GALAXY PARSE
              </span>
            </span>
          </a>
          <nav className="hidden items-center gap-1 text-sm text-slate-300 md:flex" aria-label="主导航">
            {[
              ["#parse", "解析"],
              ["#platforms", "平台矩阵"],
              ["#cloud", "星云仓库"],
              ["#about", "关于星河"],
            ].map(([href, label]) => (
              <a key={href} href={href} className="rounded-lg px-3 py-1.5 transition-colors duration-300 hover:bg-white/10 hover:text-white">
                {label}
              </a>
            ))}
          </nav>
          <a
            href="#parse"
            className="flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-cyan-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-900/40 transition-all duration-300 hover:brightness-110"
          >
            <Rocket className="h-4 w-4" /> 开始解析
          </a>
        </div>
      </header>

      <main className="relative z-10">
        {/* ============ Hero ============ */}
        <section className="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-4 text-center sm:px-6">
          <motion.div style={{ y: heroY, opacity: heroOpacity }} className="max-w-4xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-300/20 bg-violet-400/10 px-4 py-1.5 text-xs tracking-wide text-violet-200 backdrop-blur"
            >
              <Satellite className="h-3.5 w-3.5" />
              星河 XINGHE · 全平台星际解析引擎 v2.0
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: HERO_EASE }}
              className="bg-gradient-to-b from-white via-violet-100 to-violet-300/70 bg-clip-text text-6xl font-black tracking-tight text-transparent drop-shadow-[0_0_35px_rgba(167,139,250,0.35)] sm:text-7xl md:text-8xl"
            >
              星河
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.25 }}
              className="mt-5 text-lg leading-relaxed text-slate-200/90 sm:text-xl"
            >
              一条链接，穿越六大星域
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.35 }}
              className="mx-auto mt-3 max-w-2xl text-sm leading-loose text-slate-400 sm:text-[15px]"
            >
              抖音 · 快手 · 小红书 · TikTok · YouTube · X ——
              粘贴任意分享文案，星河引擎自动识别平台、展开短链、剥离水印，
              在数秒之内为你取回最原始的高清媒体直链。无需注册，无需登录，光速直达。
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.45 }}
              className="mt-9 flex flex-wrap items-center justify-center gap-4"
            >
              <a
                href="#parse"
                className="group flex items-center gap-2 rounded-full bg-gradient-to-r from-violet-600 via-purple-600 to-cyan-600 px-8 py-3.5 text-[15px] font-semibold shadow-[0_10px_40px_-10px_rgba(139,92,246,0.7)] transition-all duration-300 hover:shadow-[0_15px_50px_-8px_rgba(139,92,246,0.9)] hover:brightness-110"
              >
                <Sparkle className="h-4.5 w-4.5 transition-transform duration-500 group-hover:rotate-90" />
                立即开始解析
                <ChevronRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
              </a>
              <a
                href="#cloud"
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-8 py-3.5 text-[15px] font-medium text-slate-200 backdrop-blur transition-all duration-300 hover:border-cyan-300/40 hover:bg-white/10"
              >
                <Cloud className="h-4.5 w-4.5" /> 文件托管直链
              </a>
            </motion.div>

            {/* 数字条 */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="mx-auto mt-14 grid max-w-2xl grid-cols-2 gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 backdrop-blur-sm sm:grid-cols-4"
            >
              {[
                ["6", "平台全覆盖"],
                ["≤3s", "平均解析耗时"],
                ["0", "水印残留"],
                ["∞", "每日解析额度"],
              ].map(([v, l], i) => (
                <div key={i} className="bg-[#06021c]/80 px-4 py-5">
                  <p className="bg-gradient-to-r from-violet-300 to-cyan-300 bg-clip-text text-2xl font-bold text-transparent">{v}</p>
                  <p className="mt-1 text-[11px] tracking-wide text-slate-400">{l}</p>
                </div>
              ))}
            </motion.div>
          </motion.div>

          <motion.a
            href="#parse"
            aria-label="向下滚动"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1, y: [0, 8, 0] }}
            transition={{ opacity: { delay: 1.2 }, y: { duration: 2, repeat: Infinity, ease: "easeInOut" } }}
            className="absolute bottom-8 text-slate-400 transition-colors hover:text-white"
          >
            <ArrowDown className="h-5 w-5" />
          </motion.a>
        </section>

        {/* ============ 解析 ============ */}
        <ParseSection />

        {/* ============ 平台矩阵 ============ */}
        <section id="platforms" className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-violet-200/90 backdrop-blur">
              <Radar className="h-3.5 w-3.5 text-cyan-300" />
              引擎矩阵 · 多通道冗余 · 自动降级
            </div>
            <h2 className="bg-gradient-to-r from-white via-violet-200 to-cyan-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
              六大星域 · 全部点亮
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-slate-300/80">
              每个平台背后都不止一条引擎通道：主通道、备用通道、降级通道层层冗余。
              某条星际航线拥挤时，星河会自动切换到下一条，你感知不到任何波动。
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {PLATFORM_CARDS.map((p, i) => (
              <Reveal
                as="article"
                key={p.key}
                variants={fadeUp}
                custom={i}
                className={`group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl transition-all duration-500 hover:-translate-y-1.5 hover:border-white/20 ${p.glow}`}
              >
                <div
                  className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full opacity-20 blur-3xl transition-opacity duration-500 group-hover:opacity-45"
                  style={{ background: p.color }}
                />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 transition-transform duration-500 group-hover:scale-110"
                      style={{ color: p.color }}
                    >
                      {p.icon}
                    </span>
                    <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-medium tracking-wider text-emerald-300">
                      ● ONLINE
                    </span>
                  </div>
                  <h3 className="mt-4 flex items-baseline gap-2 text-lg font-bold text-white">
                    {p.name}
                    <span className="text-[11px] font-normal text-slate-500">{p.en}</span>
                  </h3>
                  <p className="mt-1 text-xs text-slate-400">{p.desc}</p>
                  <ul className="mt-4 space-y-1.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-xs text-slate-300">
                        <Sparkle className="h-3 w-3 shrink-0" style={{ color: p.color }} />
                        {f}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-4 flex items-center gap-1.5 border-t border-white/5 pt-3 text-[11px] text-slate-500">
                    <Satellite className="h-3 w-3" />
                    引擎：{p.engine}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        {/* ============ 星云仓库 ============ */}
        <UploadSection />

        {/* ============ 关于星河 ============ */}
        <section id="about" className="relative mx-auto w-full max-w-6xl px-4 py-16 sm:px-6">
          <div className="mb-10 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-cyan-200/90 backdrop-blur">
              <HeartHandshake className="h-3.5 w-3.5" />
              技术白皮书 · 开放与透明
            </div>
            <h2 className="bg-gradient-to-r from-white via-cyan-200 to-violet-200 bg-clip-text text-3xl font-bold tracking-tight text-transparent sm:text-4xl">
              关于星河
            </h2>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            {[
              {
                icon: <Radar className="h-5 w-5" />,
                title: "引擎哲学：不发明轮子，只做最亮的轨道",
                body: "星河的解析能力站在开源世界的肩膀上：抖音 / 快手由公开聚合解析节点护航；小红书采用自研笔记页解析链路（短链重定向 → __INITIAL_STATE__ 提取）；TikTok 走 tikwm 公开接口；YouTube 复刻 allparse 开源项目验证过的 innertube ANDROID_VR→IOS 回退链；X 则由 fxtwitter 与官方 syndication 双通道护航。每一条引擎都有公开可考的技术出处，欢迎审查与接力。",
              },
              {
                icon: <Cloud className="h-5 w-5" />,
                title: "星云仓库：三级冗余的直链发射台",
                body: "星云仓库在服务端实现了一套完整的多通道直链托管协议：以 HS256 签名铸造 X-Auth-Token，主通道（≤50MB）、icve OSS 大文件通道与 opple 兜底通道三级冗余，任何格式即传即得永久直链——它既是星河的文件发射台，也是本项目安装包的停泊港。",
              },
              {
                icon: <Satellite className="h-5 w-5" />,
                title: "边界与敬畏：只解析，不存储",
                body: "星河是一台链接望远镜，不是仓库：所有解析均实时进行、结果不做任何持久化存储；解析出的内容版权归原平台与创作者所有，请在获得授权的前提下合理使用。请勿将星河用于批量抓取、商业搬运或任何侵犯他人权益的场景——仰望星空的同时，请勿打扰星星。",
              },
            ].map((c, i) => (
              <Reveal
                as="article"
                key={i}
                variants={fadeUp}
                custom={i + 1}
                className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 backdrop-blur-xl transition-colors duration-500 hover:border-violet-300/30"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-500/30 text-cyan-200 shadow-inner">
                  {c.icon}
                </div>
                <h3 className="text-[15px] font-bold leading-snug text-white">{c.title}</h3>
                <p className="mt-3 text-[13px] leading-loose text-slate-400">{c.body}</p>
              </Reveal>
            ))}
          </div>

          {/* ============ 关于作者 ============ */}
          <Reveal variants={fadeUp} custom={4} className="relative mt-8 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-r from-violet-500/[0.10] via-white/[0.03] to-cyan-500/[0.10] p-6 backdrop-blur-xl sm:p-7">
            <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-violet-500/15 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -right-16 h-48 w-48 rounded-full bg-cyan-500/15 blur-3xl" />
            <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
              <div className="relative shrink-0">
                <img
                  src="/avatar.jpeg"
                  alt="作者头像 · Evan～"
                  className="h-20 w-20 rounded-2xl border border-white/15 object-cover shadow-lg shadow-violet-900/40"
                />
                <span className="absolute -bottom-1.5 -right-1.5 flex h-6 w-6 items-center justify-center rounded-lg border border-white/15 bg-[#0a0620] text-cyan-300 shadow-md">
                  <Sparkle className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Feather className="h-4 w-4 text-cyan-300" />
                  <h3 className="text-base font-bold text-white">Evan～</h3>
                  <span className="rounded-full border border-violet-300/25 bg-violet-400/10 px-2 py-0.5 text-[10px] tracking-wider text-violet-200">
                    AUTHOR · 关于作者
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-slate-300/90">
                  真正的博学，不是知识的堆叠，而是看见万物之间那座隐形的桥。
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-2.5 text-xs">
                  <a
                    href="https://evan.space.zhipuaidemo.cn/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200 transition-colors duration-300 hover:border-cyan-300/40 hover:text-cyan-200"
                  >
                    <Globe className="h-3.5 w-3.5" /> 博客 evanblog.com
                  </a>
                  <a
                    href="https://github.com/evan-420"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-slate-200 transition-colors duration-300 hover:border-cyan-300/40 hover:text-cyan-200"
                  >
                    <Github className="h-3.5 w-3.5" /> GitHub github.com/evan-420
                  </a>
                  <a
                    href="https://file.zhuyitai.com/feedback/202608/d30bfc6e5da78f38aff8356b2af35d05.html"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 font-mono text-slate-200 transition-colors duration-300 hover:border-violet-300/40 hover:text-violet-200"
                  >
                    <FileText className="h-3.5 w-3.5" /> 简介 blog.google.com/evan420/
                  </a>
                </div>
              </div>
            </div>
          </Reveal>

          {/* 技术栈横条 */}
          <Reveal
            variants={fadeUp}
            custom={5}
            className="mt-8 overflow-hidden rounded-2xl border border-white/10 bg-black/30 backdrop-blur"
          >
            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-5 text-xs text-slate-400">
              <span className="flex items-center gap-2 font-mono text-cyan-300">
                <Github className="h-4 w-4" /> TECH STACK
              </span>
              {[
                "Next.js 16",
                "TypeScript",
                "Three.js 星野引擎",
                "Framer Motion",
                "Tailwind CSS 4",
                "多通道冗余引擎",
                "直链托管协议",
                "站内媒体代理",
              ].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <span className="h-1 w-1 rounded-full bg-violet-400" />
                  {t}
                </span>
              ))}
            </div>
          </Reveal>
        </section>
      </main>

      {/* ============ 页脚 ============ */}
      <footer className="relative z-10 mt-auto border-t border-white/5 bg-[#030014]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-8 text-center sm:px-6">
          <div className="flex items-center gap-2">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500">
              <Orbit className="h-4 w-4 text-white" />
            </span>
            <span className="font-bold">星河</span>
            <span className="text-xs text-slate-500">GALAXY PARSE</span>
          </div>
          <p className="max-w-xl text-xs leading-relaxed text-slate-500">
            星河为开放技术研究项目，仅做链接解析、不做内容存储。解析所得媒体版权归原作者与平台所有，请在授权范围内合理使用。
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[11px] text-slate-500">
            {["抖音", "快手", "小红书", "TikTok", "YouTube", "X"].map((p) => (
              <span key={p} className="flex items-center gap-1">
                <span className="h-1 w-1 rounded-full bg-cyan-400/70" />
                {p}
              </span>
            ))}
          </div>
          <p className="text-[11px] text-slate-600">© 2026 星河 XINGHE · Crafted among the stars ✦</p>
        </div>
      </footer>
    </div>
  );
}
