"use client";

// 入场动画容器（严格一次性）
// ⚠ 不使用 framer-motion 的 whileInView prop：其在 v12 的实现中，once:true 只阻止
//    "离场回退"，元素滚出视口后再次滚回时仍会重播入场动画（框架 InViewFeature 的
//    setActive 会在每次重新进入时再次触发）。
// ✅ 此处改用 useInView hook：其底层在首次进入视口后立即 unobserve 目标元素，
//    侦听被彻底拆除，无论之后怎样滚动（滚出再滚回、快速滚动、整页刷新前），
//    每个元素的入场动画都恰好播放一次；React 状态一旦为 true 永不复位，
//    也不会出现离场时回退隐藏的问题。
// 整页刷新（新的一次加载）重新播放入场动画属于正常预期行为。
import { motion, useInView, type Variants } from "framer-motion";
import { useRef, type ReactNode } from "react";

export function Reveal({
  as = "div",
  variants,
  custom = 0,
  className,
  children,
}: {
  as?: "div" | "article" | "section";
  variants: Variants;
  custom?: number;
  className?: string;
  children?: ReactNode;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const entered = useInView(ref, { once: true, amount: 0.15 });
  const Comp = as === "article" ? motion.article : motion.div;
  return (
    <Comp
      ref={ref}
      variants={variants}
      custom={custom}
      initial="hidden"
      animate={entered ? "show" : "hidden"}
      className={className}
    >
      {children}
    </Comp>
  );
}
