// OpenNext for Cloudflare 适配配置
// 星河为「静态首页 + 动态 API 路由」结构：无 ISR、无增量缓存、无服务端绑定，
// 因此无需挂载 KV / R2 / D1，直接使用默认配置即可。
// 如未来启用 ISR，参考：https://opennext.js.org/cloudflare/caching
import { defineCloudflareConfig } from "@opennextjs/cloudflare/config";

export default defineCloudflareConfig({});
