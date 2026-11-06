# 秦巴秋韵 · 汉中—光雾山—恩阳 3 天自驾

2026.11.08 — 11.12，两天落地 + 三天整自驾。
纯静态站点，无构建步骤，直接部署。

**线上**：<https://trip-hz.fycheung.site>

---

## 结构

```
index.html                 单页（首屏 / 地图 / 每日 / 住宿 / 预算 / 须知）
assets/css/site.css        全部样式
assets/js/data.js          行程文案与坐标（改这里就是改内容）
assets/js/routes.js        预计算的高德驾车路径 + 里程/时长
assets/js/site.js          渲染、滚动动效、落叶画布
assets/js/map.js           高德地图渲染与交互
tools/                     构建脚本（部署时不需要）
```

## 地图怎么工作的

1. `tools/build-routes.js` 用高德 **Driving 插件**把所有路段算一次，输出 `assets/js/routes.js`
   （已做过抽稀，约 34 KB），页面加载时不再请求算路，**不吃每日配额、打开即出图**。
2. `assets/js/map.js` 只做渲染：深色底图、彩色路线 + 光晕、编号点位、按天聚焦。
3. 页面上的里程/时长全部来自这份真实算路结果，不是手写数字。

### 重新生成路线

```bash
# 需要一个白名单包含本机域名的 Key
python -m http.server 80            # 或 node tools/serve.js
npm i playwright-core
node tools/build-routes.js          # 生成 assets/js/routes.js
node tools/simplify.js              # 抽稀
```

## 本地预览

```bash
python -m http.server 8000
# 打开 http://localhost:8000
```

地图需要把 `localhost` 或实际域名加进高德控制台的 **域名白名单**
（console.amap.com → 应用管理 → Web端(JS API) → 域名白名单），否则只会显示兜底提示。

## 高德 Key

- Key：`ddfec8dab891f69b52b0ce4c4fb05fd3`（Web 端 JS API）
- 安全密钥：写在 `assets/js/map.js` 顶部
- 也可用 URL 参数临时覆盖：`?key=xxx&sec=yyy`

JS API 的 Key 暴露在前端是设计如此，安全性依赖**域名白名单**，务必只放自己的域名。

## 部署

腾讯 EdgeOne Pages：GitHub 仓库 → 新建项目 → 框架预设 `其他` / 无构建 → 输出目录 `/`。
加速区域选 **全球可用区（不含中国大陆）**，绑定自定义域名 `trip-hz.fycheung.site`。

---

里程、车程以高德实时路径为准；天气与价格为 2026-11-06 汇整，出行前请再核一次。
