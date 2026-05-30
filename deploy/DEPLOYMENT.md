# hot-pot.ton-ton.fun 部署说明

## 信息

| 项 | 值 |
|----|-----|
| 域名 | https://hot-pot.ton-ton.fun |
| 服务器 | `ubuntu@82.157.123.207`（SSH key: `~/.ssh/id_ed25519_tonton`） |
| 应用目录 | `/var/www/hot-pot.ton-ton.fun` |
| 进程 | PM2 `hotpot-party` → `127.0.0.1:3005` |
| Nginx | `/etc/nginx/sites-available/hot-pot.ton-ton.fun` |
| 数据库 | `.env` 中 `DATABASE_URL`（Eazo 托管 Postgres） |

## 一键部署（本地 Windows）

```powershell
cd D:\Creation\Projects\hotpot-party
.\deploy\deploy-hot-pot.ps1
```

脚本会：本地 `npm run build`（standalone）→ 打包上传 → PM2 重启 → Nginx reload → Certbot（首次）。

## 数据库迁移

在**本地**对生产库执行（与服务器共用同一 `DATABASE_URL`）：

```powershell
npm run db:push
```

## 手动健康检查

```bash
ssh -i ~/.ssh/id_ed25519_tonton ubuntu@82.157.123.207 \
  "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3005/ && pm2 logs hotpot-party --lines 20"
```

## 环境变量

生产 `.env` 随部署包上传，至少需要：

- `DATABASE_URL` — Postgres
- `DEEPSEEK_API_KEY`（可选）— Agent 台词

勿将 `.env` 提交到 Git。
