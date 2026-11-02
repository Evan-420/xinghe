// 六大平台品牌图形(SVG 内联)
export function DouyinIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 1 1-2.59-2.59c.27 0 .53.04.78.12V9.77a5.76 5.76 0 0 0-.78-.05 5.66 5.66 0 1 0 5.66 5.66V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.28 4.28 0 0 1-3.22-1.48z" />
    </svg>
  );
}

export function KuaishouIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12.53 3.16 10.4 9.03l-.5 1.65-.25.83-.7 2.3-1.94-6.4H4.6l2.72 7.94-3.03 4.42 2.3 1.55 2.42-3.63.62 1.65a6.5 6.5 0 0 0 1.87 2.62l1.46-1.86a4.53 4.53 0 0 1-1.62-2.28l-.5-1.5 1.25-3.53 1.24-3.53.83 2.14h3.6l-1.98-6.24zM18.3 6.9l-2.15 1.24 1.72 3.5-1.72 3.06 2.15 1.28 2.16-3.87a1.28 1.28 0 0 0 .06-1.14z" />
    </svg>
  );
}

export function XhsIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M11.44 11.2 7.7 5.3H5.5l4.72 7.02L5.2 19h2.1l4.05-5.7 3.4 5.7H17l-4.83-7.28L16.6 5.3h-2.14zM17.3 5.3v13.4h1.8V5.3z" />
    </svg>
  );
}

export function TiktokIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M19.32 8.72a5.9 5.9 0 0 1-3.47-1.13v6.36a5.94 5.94 0 1 1-5.94-5.94c.28 0 .55.02.82.06v3.05a2.94 2.94 0 1 0 2.12 2.83V2.5h3a5.9 5.9 0 0 0 3.47 6.22z" />
    </svg>
  );
}

export function YoutubeIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M21.58 7.19a2.5 2.5 0 0 0-1.76-1.77C18.25 5 12 5 12 5s-6.25 0-7.82.42A2.5 2.5 0 0 0 2.42 7.2 26.1 26.1 0 0 0 2 12a26.1 26.1 0 0 0 .42 4.81 2.5 2.5 0 0 0 1.76 1.77C5.75 19 12 19 12 19s6.25 0 7.82-.42a2.5 2.5 0 0 0 1.76-1.77A26.1 26.1 0 0 0 22 12a26.1 26.1 0 0 0-.42-4.81zM10 15.27V8.73L15.5 12z" />
    </svg>
  );
}

export function XIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M17.53 3H21l-7.19 8.21L22 21h-6.56l-4.28-5.6L6.2 21H3l7.5-8.56L2.4 3h6.72l4 5.26zm-1.15 16h1.9L7.75 4.9H5.7z" />
    </svg>
  );
}

export function PlatformGlyph({
  platform,
  className = "h-5 w-5",
}: {
  platform: string;
  className?: string;
}) {
  switch (platform) {
    case "douyin":
      return <DouyinIcon className={className} />;
    case "kuaishou":
      return <KuaishouIcon className={className} />;
    case "xhs":
      return <XhsIcon className={className} />;
    case "tiktok":
      return <TiktokIcon className={className} />;
    case "youtube":
      return <YoutubeIcon className={className} />;
    case "twitter":
      return <XIcon className={className} />;
    default:
      return null;
  }
}
