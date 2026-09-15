# 静态部署

1. 运行 `npm ci` 安装依赖。
2. 运行 `npm run build`。
3. 将 `dist-pwa/` 托管到自己的 HTTPS 静态站点，将应用路由回退到 `index.html`。

无需环境变量或后台服务。本地开发运行 `npm run dev`，访问 http://localhost:3001。

```nginx
server {
    listen 443 ssl;
    server_name kairos.example.com;
    # 配置自己的证书路径。
    root /srv/kairos/dist-pwa;
    index index.html;
    location = /sw.js { add_header Cache-Control "no-cache"; }
    location / { try_files $uri $uri/ /index.html; }
}
```

只托管 `dist-pwa/`，不要上传工作区、Git 目录或私有备份。数据在当前浏览器，不会在设备间自动同步。清理站点数据或更换域名前，先在设置中导出备份。

AI 为可选功能：自行填写 API Key，使用时会向所选服务发送输入内容；公共设备不保存 Key。
