<p align="center">
  <img src="web/public/images/logo.svg" alt="Kairos 时流" width="220">
</p>

<h1 align="center">Kairos 时流</h1>

<p align="center">把任务安排好，把时间留给专注。</p>

<p align="center">
  <a href="https://github.com/zhtyyx/kairos/actions/workflows/verify.yml"><img src="https://github.com/zhtyyx/kairos/actions/workflows/verify.yml/badge.svg" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-Apache--2.0-blue" alt="Apache-2.0"></a>
</p>

Kairos 是一款将番茄钟与任务管理放在一起的网页应用。按项目整理任务，用看板查看进度，用四象限安排优先级，再选择一项任务开始专注。

**无需注册，无需后端。** 日常功能直接在浏览器中运行，数据保存在自己的设备上。

## 能做什么

- **专注计时**：番茄钟、休息提醒和迷你计时器，记录每次投入的时间。
- **任务管理**：项目、看板和四象限视图，按进度与优先级安排工作。
- **回顾记录**：查看专注记录和年度热力图，了解时间花在哪里。
- **本地使用**：导入、导出 JSON 备份；支持 PWA 安装和加载后的离线使用。
- **可选 AI**：把想法拆成可添加的任务，使用自己配置的模型服务。

## 运行起来

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

## 配置 AI（可选）

在设置中填写服务地址、模型名称和 API Key。默认地址为 `https://api.deepseek.com/v1`，也可使用支持 `/chat/completions` 接口且允许浏览器跨域请求的服务。

API Key 保存在当前浏览器的 localStorage。调用时，Key 和对话内容直接发送到你配置的服务；费用和可用性由该服务决定。未配置 Key 时，AI 不启用，番茄钟和任务管理照常使用。

## 开发与贡献

前端使用原生 JavaScript、SCSS 和 Vite，浏览器测试使用 Playwright。

| 路径 | 内容 |
| --- | --- |
| `web/` | 界面、数据存储和 PWA |
| `tests/` | 交互、数据保存和隐私测试 |
| `scripts/` | 仓库文件与提交历史扫描 |

开发检查见[贡献指南](.github/CONTRIBUTING.md)，漏洞报告见[安全说明](.github/SECURITY.md)。

## 许可证

Copyright © 2025–2026 KAIROS.

本项目采用 [Apache-2.0](LICENSE) 许可证。第三方依赖的版权与许可见[第三方声明](docs/THIRD_PARTY_NOTICES.md)。
