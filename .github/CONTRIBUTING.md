# 参与贡献

欢迎提交问题报告和 Pull Request。报告问题时，请说明复现步骤、浏览器版本、预期结果和实际结果；截图和备份文件请使用示例数据。

## 开发与检查

需要 Node.js 22.12+、npm 和 Python 3（用于仓库扫描）。

```bash
npm ci
npm run dev
```

提交前运行：

```bash
npm run build
npm run test:security
npx playwright install chromium
npm test
npm run check:release
```

CI 还会使用 `python3 scripts/check-release.py --history` 检查提交历史。涉及数据保存或交互行为的改动，请运行相关浏览器测试。

## 约定

- 应用数据保存在浏览器 IndexedDB；保持无需账户和后端即可使用。
- 不提交凭据、个人数据、部署配置和生成产物，测试使用虚构数据。
- 新代码使用 Apache-2.0；引入第三方代码或素材时保留来源和许可，并更新 `docs/THIRD_PARTY_NOTICES.md`。
