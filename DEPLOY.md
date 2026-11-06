# 部署指南 · EdgeOne Pages + 自定义域名

> 目标：`https://trip-hz.fycheung.site`
> 加速区域：**全球可用区（不含中国大陆）** —— 和 `trip.fycheung.site` 保持一致
> 仓库：<https://github.com/adiooooos/qinba-autumn-trip>

代码已经推上 GitHub，`main` 分支就是可部署状态（纯静态，没有构建步骤）。

---

## 第 0 步：先确认一件事（30 秒）

高德 Key `ddfec8dab891f69b52b0ce4c4fb05fd3` 的域名白名单里**已经有 `trip-hz.fycheung.site`**，
我实测过：带这个 Referer 请求，高德返回的是正常 JS，不是 `INVALID_USER_DOMAIN`。所以这一步不用再动。

只有一种情况要补：你想让 **EdgeOne 的预览域名**（形如 `xxx.edgeone.dev`）也能看到地图，
那就把那个域名也加进白名单。

> 位置：<https://console.amap.com/dev/key/app> → 找到这个 Key → 编辑 → 域名白名单，一行一个，不要带 `http://`。

---

## 第 1 步：创建 EdgeOne Pages 项目

1. 打开 <https://console.cloud.tencent.com/edgeone/pages>
2. 点 **创建项目**
3. 选 **导入 Git 仓库** → 首次会跳转 GitHub 授权 → 允许 WorkBuddy/腾讯云 读取仓库
4. 选中 **`adiooooos/qinba-autumn-trip`**，分支 `main`

### 构建配置（照抄）

| 字段 | 填什么 |
|---|---|
| 框架预设 | **其他 / 无框架**（不要选 Next.js、Vue 之类） |
| 构建命令 | **留空** |
| 输出目录 | **`/`**（或留空） |
| 根目录 | 留空 |
| 环境变量 | 不需要 |

### 加速区域（这一步最关键）

在创建页找到 **加速区域**，选：

> ✅ **全球可用区（不含中国大陆）**

⚠️ 不要选「中国大陆可用区」或「全球可用区（含中国大陆）」——
那需要域名完成 **ICP 备案**，`fycheung.site` 目前是按海外线路跑的，
选了含中国大陆会导致域名校验不通过，或者要求你先去备案。

选完点 **开始部署**，等 1—2 分钟，状态变成「成功」。

---

## 第 2 步：绑定自定义域名

1. 进项目 → 左侧 **域名管理** → **添加域名**
2. 域名填：`trip-hz.fycheung.site`
3. 加速区域确认仍是 **全球可用区（不含中国大陆）**
4. 提交后，控制台会给你一条 **CNAME 记录**，形如：

   ```
   主机记录：trip-hz
   记录类型：CNAME
   记录值：  xxxxxxxx.edgeone.cool   ← 以控制台实际显示为准
   ```

   > 每个项目、每个账号的记录值都不一样，**不要照抄别人截图里的值**。

---

## 第 3 步：加 DNS 解析

去 `fycheung.site` 的 DNS 服务商（如果 NS 在腾讯云，就是
<https://console.cloud.tencent.com/cns> 或 DNSPod 控制台）：

| 主机记录 | 类型 | 线路 | 记录值 | TTL |
|---|---|---|---|---|
| `trip-hz` | CNAME | 默认 | 控制台给的那条 `xxx.edgeone.cool` | 600 |

保存后一般 **1—10 分钟**生效。验证：

```bash
dig +short trip-hz.fycheung.site CNAME
curl -I https://trip-hz.fycheung.site
```

回到 EdgeOne 域名管理，状态从「待验证」变成 **「已生效 / 已部署」** 就成功了。
HTTPS 证书 EdgeOne 会自动签发（免费 DV），通常 5—15 分钟。

---

## 第 4 步：验证

打开 <https://trip-hz.fycheung.site>，逐项对一遍：

- [ ] 首屏「秦巴秋韵」两个大字不重叠，底部 5 个数字能滚出来
- [ ] 地图出图，不是「地图没能加载」的提示框
- [ ] 五个日切换 chip 能点，点了地图会飞到对应那天
- [ ] 左侧面板里显示 **434 km**（这是高德实算的三天自驾总里程，不是手写的）
- [ ] 手机打开：底部路线面板默认收起成一条，点头部能展开

---

## 之后怎么改内容

改 `assets/js/data.js` 就行 —— 文案、坐标、酒店、预算全在里面。
推送到 `main`，EdgeOne 会自动重新部署（默认开启，约 1 分钟）。

如果改了**途经点坐标**，记得重新生成路线：

```bash
npm i playwright-core
node tools/build-routes.js    # 重新用高德 Driving 算一遍
node tools/simplify.js        # 抽稀，压到 30 KB 左右
git commit -am "chore: rebuild routes" && git push
```

---

## 常见问题

**Q：地图空白 / 提示 INVALID_USER_DOMAIN**
域名白名单没加对。白名单要写裸域名 `trip-hz.fycheung.site`，不带协议、不带路径、不带端口。

**Q：自定义域名一直「待验证」**
① CNAME 没加对主机记录（是 `trip-hz`，不是 `trip-hz.fycheung.site`）；
② 域名之前有 A 记录没删，CNAME 和 A 记录不能共存；
③ 刚改完 DNS，等 10 分钟再点一次「验证」。

**Q：中国大陆访问慢 / 打不开**
这就是「不含中国大陆」的代价 —— 流量走香港/新加坡节点。个人行程页够用；
要国内直连就必须备案 + 换含中国大陆的加速区域。

**Q：想换域名**
改 EdgeOne 域名管理里的绑定即可，同时把新域名加进高德白名单。
