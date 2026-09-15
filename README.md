<p align="center">
  <img src="web/public/images/icon-192.png" alt="Kairos 图标" width="96" height="96">
</p>

<h1 align="center">Kairos · 时流</h1>

<p align="center"><strong>安排好任务，专注于当下。</strong><br>一个将番茄钟、任务管理与专注记录放在一起的本地应用。</p>

<p align="center">
  <a href="https://github.com/zhtyyx/kairos/stargazers"><img src="https://img.shields.io/github/stars/zhtyyx/kairos?style=flat&amp;color=b88b62" alt="GitHub Stars"></a>
  <a href="https://github.com/zhtyyx/kairos/actions/workflows/verify.yml"><img src="https://github.com/zhtyyx/kairos/actions/workflows/verify.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-Apache--2.0-687564" alt="Apache-2.0"></a>
</p>

<p align="center">
  <a href="#功能一览">功能一览</a> ·
  <a href="#快速开始">快速开始</a> ·
  <a href="#部署到自己的站点">自行部署</a> ·
  <a href="#star-history">Star History</a>
</p>

---

**无需注册，无需后端，打开浏览器就能开始。** 按项目整理任务，用看板查看进度，用四象限安排优先级，再选择一项任务开始专注。数据保存在自己的设备上。

## 功能一览

<table>
  <tr>
    <td width="50%"><strong>◷ 专注计时</strong><br>番茄钟、休息提醒与迷你计时器，让每段专注都有记录。</td>
    <td width="50%"><strong>▦ 项目与任务</strong><br>用项目归类任务，在看板与四象限间切换，安排进度和优先级。</td>
  </tr>
  <tr>
    <td><strong>▥ 时间回顾</strong><br>查看专注记录与年度热力图，了解时间花在哪里。</td>
    <td><strong>⌂ 本地与离线</strong><br>浏览器保存数据，支持 PWA 安装、离线使用与 JSON 备份。</td>
  </tr>
  <tr>
    <td><strong>✦ AI 任务拆解</strong><br>连接自己的模型服务，把一个想法拆成可以逐项完成的任务。</td>
    <td><strong>◐ 随心切换</strong><br>浅色与深色主题，中英双语，适配桌面和移动屏幕。</td>
  </tr>
</table>

## 快速开始

需要 **Node.js 22.12+** 和 npm。

```bash
git clone https://github.com/zhtyyx/kairos.git
cd kairos
npm ci
npm run dev
```

打开 **http://localhost:3001**，创建项目或任务，选择任务后开始专注。界面支持中文和英文、浅色和深色主题。

## 部署到自己的站点

```bash
npm run build
```

将生成的 **`dist-pwa/`** 目录部署到 HTTPS 静态托管服务即可，不需要数据库或环境变量。

- 部署在域名根路径，并将未匹配的页面路由回退到 `index.html`。
- 为 `/sw.js` 设置 `Cache-Control: no-cache`，方便浏览器检查更新。
- 只上传 `dist-pwa/`。构建会带上项目许可证和第三方许可声明。

生产版本会缓存应用资源，首次成功加载后可离线使用本地功能；AI 仍需要网络。PWA 安装方式取决于浏览器支持。

## 数据与备份

任务、项目和专注记录保存在**当前浏览器的 IndexedDB** 中，不会自动上传或跨设备同步。同一设备的不同浏览器、不同域名也各有自己的数据。

在设置中使用「导出数据」保存 JSON 备份，使用「导入数据」恢复。清理站点数据、更换浏览器或域名前，请先导出。备份里可能包含个人任务内容，请妥善保存。

<details>
<summary><strong>可选：配置 AI 任务拆解</strong></summary>

在设置中填写服务地址、模型名称和 API Key。默认地址为 `https://api.deepseek.com/v1`，也可使用支持 `/chat/completions` 接口且允许浏览器跨域请求的服务。

API Key 保存在当前浏览器的 localStorage。调用时，Key 和对话内容直接发送到你配置的服务；费用和可用性由该服务决定。未配置 Key 时，AI 不启用，番茄钟和任务管理照常使用。

</details>

## 开发与贡献

前端使用原生 JavaScript、SCSS 和 Vite，浏览器测试使用 Playwright。

| 路径 | 内容 |
| --- | --- |
| `web/` | 界面、数据存储和 PWA |
| `tests/` | 交互、数据保存和隐私测试 |
| `scripts/` | 仓库文件与提交历史扫描 |

开发检查见[贡献指南](.github/CONTRIBUTING.md)，漏洞报告见[安全说明](.github/SECURITY.md)。

## Star History

如果 Kairos 对你有帮助，欢迎点一颗 Star。

<p align="center">
  <a href="https://www.star-history.com/#zhtyyx/kairos&amp;Date">
    <picture>
      <source media="(prefers-color-scheme: dark)" srcset="https://api.star-history.com/svg?repos=zhtyyx/kairos&amp;type=Date&amp;theme=dark">
      <source media="(prefers-color-scheme: light)" srcset="https://api.star-history.com/svg?repos=zhtyyx/kairos&amp;type=Date">
      <img alt="Kairos GitHub Star History：星标数量随时间变化" src="https://api.star-history.com/svg?repos=zhtyyx/kairos&amp;type=Date" width="800">
    </picture>
  </a>
</p>

## 许可证

Copyright © 2025–2026 KAIROS.

本项目采用 [Apache-2.0](LICENSE) 许可证。第三方依赖的版权与许可见[第三方声明](docs/THIRD_PARTY_NOTICES.md)。
