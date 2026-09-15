# TakeNotes 自部署

推荐一人部署一份：Next.js + SQLite + 单管理员登录。Docker 将运行环境打包；数据卷保存数据库，更新应用容器不会自动清空笔记和历史。此版本不适合多人共用账号或部署多个应用副本。

## 1. 准备配置

部署机器需要 Docker Engine 与 Compose 插件。下面使用 Node.js 24 执行交互式配置工具，不需要先安装项目依赖。

```bash
git clone https://github.com/bluedinosaur233/TakeNotes.git
cd TakeNotes
node scripts/setup-admin.mjs --docker
```

工具写入 `.env.docker`，密码不回显，至少 12 位，不要把密码放进命令参数或聊天。这里的文件与本地开发的 `.env.local` 相互独立。

- 本机体验：访问地址使用 `http://localhost:3000`。
- 公网部署：填写实际的 `https://你的域名`，并完成下方 HTTPS 配置。
- 如需问答，编辑 `.env.docker` 中的 `DEEPSEEK_API_KEY`，保留其他内容。当前默认模型 `deepseek-flash`，按自己的账户权限调整。
- 密钥与管理员配置不提交 Git，也不进入镜像。每份部署生成独立密码和会话密钥，不共享示例凭证。

## 2. 本机启动

```bash
docker compose --env-file .env.docker up -d --build
docker compose --env-file .env.docker logs --tail=100 app
```

浏览器打开 `http://localhost:3000`，进入登录页。应用只绑定宿主机的 `127.0.0.1`，不会通过服务器公网 IP 直接开放 3000 端口。

如端口占用，在 `.env.docker` 添加 `APP_PORT=3001`，并把 `APP_URL` 改为 `http://localhost:3001`。此后所有 Compose 命令均带 `--env-file .env.docker`。`APP_URL` 必须与浏览器访问的协议、主机和端口一致；`localhost` 与 `127.0.0.1` 不是同一来源。只有本机 HTTP 允许登录，公网须用 HTTPS。

数据库固定为 `/app/data/takenotes.db`，位于 `app_data` 数据卷。容器启动先执行 `prisma migrate deploy`，成功后启动应用；缺少管理员配置或迁移失败则不会开放应用。首次使用为空库，不会自动 seed 或导入开发机数据库。

可选示例数据（会覆盖相同种子 ID 的笔记）：

```bash
docker compose --env-file .env.docker exec app node node_modules/tsx/dist/cli.mjs prisma/seed.ts
```

## 3. 公网 HTTPS

先将域名的 DNS A/AAAA 记录指向服务器，确保其实际可达；开放 80、443 端口。修改 `.env.docker`：

```dotenv
APP_URL="https://notes.example.com"
TAKENOTES_DOMAIN="notes.example.com"
```

将示例域名替换成自己的域名，再运行：

```bash
docker compose --env-file .env.docker -f compose.yaml -f compose.https.yaml up -d --build
docker compose --env-file .env.docker -f compose.yaml -f compose.https.yaml logs --tail=100 caddy
```

Caddy 负责申请和续期 HTTPS 证书，并把请求转发给应用；转发流式回答时关闭缓冲。此模式后续的 Compose 管理命令都沿用相同两个 `-f` 参数。已有 Nginx/Caddy 可使用自己的代理，保持原始 Host、正确的转发协议，并关闭 `/api/ask` 响应缓冲和公开缓存。Next.js Server Actions 也会校验来源，不要通过关闭来源校验解决配置问题。

配置更改后用 `up -d --force-recreate` 重建应用容器，使新环境变量生效；只执行 `restart` 不会重新载入 env_file。不要在访问日志、工单、截图或聊天中暴露 Cookie、API 密钥和管理员配置。

## 4. 备份与升级

开发机备份：

```bash
pnpm db:backup
```

该脚本读取 `.env` 的 `DATABASE_URL`（或已注入的环境变量），使用 SQLite 在线备份 API 生成一致性快照，可在应用运行时执行；不是简单复制正在写入的数据库文件。它不会覆盖已存在的目标。若你把数据库地址单独写在 `.env.local`，请显式传入相同的 `DATABASE_URL`。

容器备份示例（每次改成新的文件名）：

```bash
docker compose --env-file .env.docker exec app node scripts/backup.mjs /app/data/backups/before-upgrade-YYYYMMDD.db
docker compose --env-file .env.docker cp app:/app/data/backups/before-upgrade-YYYYMMDD.db ./takenotes-backup-YYYYMMDD.db
```

**再将快照复制到另一台机器或可靠存储**。仅保存在同一个数据卷里不算异地备份。数据库含私人笔记、历史摘录和会话记录，按敏感文件保管；管理员配置也应单独安全备份。脚本仅创建快照，不代替自动备份计划。

确认工作区没有待处理的本地改动，并完成备份后，升级：

```bash
git pull --ff-only
docker compose --env-file .env.docker up -d --build
docker compose --env-file .env.docker logs --tail=100 app
```

公网 HTTPS 模式请在上述 Compose 命令加入两个 `-f` 参数。迁移是前向升级；镜像回滚不保证能回滚数据库结构。**不要执行 `docker compose down -v` 或删除数据卷**，那会删除数据库，恢复依赖备份。

## 5. 恢复快照或导入原有本地库

以下操作会替换当前数据库内容。先确认快照来源、路径和时间，并备份现有数据库。导入本地笔记应先在开发机用备份脚本产生快照，不要复制正在写入的 `dev.db`。

1. 停止应用：`docker compose --env-file .env.docker stop app`，保证没有写入。
2. 启动一次性维护容器：`docker compose --env-file .env.docker run --rm --no-deps --entrypoint sh app`。它与应用挂载同一数据卷。
3. 在维护容器里执行 `ls -la /app/data`，确认目标。将现有 `takenotes.db` **移动**到一个新的保留名称，例如 `takenotes-before-restore-YYYYMMDD.db`；如存在对应的 `takenotes.db-wal`、`takenotes.db-shm`，一并移动到匹配的新名称。使用前先检查保留名称不存在，不覆盖旧备份；不删除整个目录。
4. 输入 `exit` 离开维护容器。将确认好的快照复制给已停止的应用容器，例如：`docker compose --env-file .env.docker cp ./takenotes-backup-YYYYMMDD.db app:/app/data/takenotes.db`。
5. 复制可能改变文件所有者。执行 `docker compose --env-file .env.docker run --rm --no-deps --user 0 --cap-add CHOWN --entrypoint chown app node:node /app/data/takenotes.db`，仅修正这个数据库文件的所有者。
6. 运行 `node scripts/setup-admin.mjs --docker`，确认 RESET 并重新设置管理员凭据，轮换会话密钥，防止备份中的旧会话继续使用。
7. `docker compose --env-file .env.docker up -d --force-recreate app`。启动流程会补齐快照缺少的迁移。登录后核对笔记数量、正文和历史记录；确认成功前保留替换前的数据库文件。

如遇权限、迁移或快照校验失败，停止应用并检查，不要重置或强制删除数据库。首次导入与恢复步骤相同；尚无旧数据库时跳过不存在文件的移动。公网模式始终加上相同的两个 `-f` 参数。

## 6. 管理与已知边界

- 改密码：再次运行配置工具，确认 RESET，重建应用容器；旧会话会失效。没有邮件找回功能，须有服务器文件访问权。
- 会话默认 7 天有效；退出撤销数据库会话。HTTPS 下 Cookie 使用 Secure、HttpOnly、SameSite=Lax。
- 登录限流是整个实例共用 10 次/15 分钟，不依赖可伪造的客户端 IP 标头；公开实例可能被耗尽登录窗口，需代理层加强防护。
- AI 默认 50 次/UTC 日、10 次提问/分钟、单并发、45 秒超时。不是金额预算，仍需供应商额度控制。问题与命中片段会发送给配置的模型服务商。
- 不支持多用户隔离、多副本扩容或网络共享磁盘上的 SQLite。单机磁盘容量、备份和服务器安全仍由部署者负责。
- 当前镜像为保留 Prisma 迁移工具而包含部分构建依赖，优先维护简单，未追求最小镜像。原生 SQLite 驱动在镜像目标架构中安装。
