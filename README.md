# Kairos 时流

开源番茄钟与任务管理工具，支持项目、任务看板、四象限、专注记录和年度热力图。

所有数据保存在当前浏览器 IndexedDB，无需账户、密钥或后端。支持导入导出备份。AI 为可选功能，使用时需自行填写服务地址、模型和 API Key。

## 本地启动

需要 Node.js 22.12+、npm。

```bash
npm ci
npm run dev
```

打开 http://localhost:3001。创建任务后刷新页面，任务仍保存在当前浏览器。

## 构建与验证

```bash
npm run build
npm run test:security
npx playwright install chromium
npm test
npm run check:release
```

构建产物位于 `dist-pwa/`，部署见[静态部署说明](docs/SELF_HOSTING.md)。

## 项目结构

| 目录 | 用途 |
|---|---|
| `web/` | 原生 JavaScript 前端，Vite 构建，PWA |
| `tests/` | 本地数据、界面和隐私回归测试 |
| `scripts/` | 发布文件检查 |

## 隐私与备份

应用不内置维护者后端或遥测服务，任务不会自动上传。AI Key 保存在当前浏览器，调用 AI 时会向你选择的提供方发送输入内容；不要在共享设备保存 Key。

生产构建支持缓存应用外壳。更换浏览器、清理站点数据或更换域名前，请先从设置中导出备份。

请参阅[安全说明](SECURITY.md)和[贡献说明](CONTRIBUTING.md)。

## 许可证

Copyright © 2025–2026 KAIROS.

Apache-2.0，见 [LICENSE](LICENSE)。第三方依赖保留各自许可证，见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。
