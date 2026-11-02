import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "星河 · 全平台内容解析 | 抖音/快手/小红书/TikTok/YouTube/X",
  description:
    "星河（XINGHE）——一键穿越六大星域的全平台内容解析引擎。抖音、快手、小红书、TikTok、YouTube、X 分享链接粘贴即析，秒取无水印高清直链；星云仓库提供永久免费文件直链托管。",
  keywords: [
    "星河",
    "全平台解析",
    "抖音无水印",
    "快手解析",
    "小红书解析",
    "TikTok下载",
    "YouTube解析",
    "X/Twitter视频",
    "免费图床",
    "文件直链",
  ],
  authors: [{ name: "星河 XINGHE" }],
  openGraph: {
    title: "星河 · 全平台内容解析",
    description: "一条链接，穿越六大星域。无水印直链，光速直达。",
    siteName: "星河 XINGHE",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-screen bg-[#030014] font-sans text-white antialiased`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
