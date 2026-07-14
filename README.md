# 世界杯/苏超赛事信息与互动预测平台

Web 全栈开发课程大作业。面向足球赛事的信息服务平台，兼顾赛事数据展示与用户互动，形成从浏览、预测到赛后讨论的完整体验。

## 技术栈

- 前端：Next.js 16、React 19、TypeScript、Tailwind CSS 4
- 后端：Midway.js 4、Koa、TypeScript、node:sqlite
- 契约：OpenAPI 3.0（`contracts/openapi.yaml`）
- 部署：Docker Compose
- AI：DeepSeek v4-flash + Agent 查询接口

## 快速开始

```bash
npm install
cp .env.example .env
npm run dev
```

- 页面：http://localhost:3000
- 后端：http://localhost:7001/api/health
- 契约：`contracts/openapi.yaml`

## 功能

| 功能 | 说明 |
|------|------|
| 赛程浏览 | 按联赛筛选，比赛详情含主客队 |
| 球队信息 | 8 支世界杯球队，按名称排序 |
| 积分榜 | 小组赛积分排名，胜/平/负/进球/失球 |
| 淘汰赛图 | 树形对阵展示，按阶段分组 |
| 比分预测 | 开赛前提交/修改，开赛后禁止 |
| 比赛结果 | 管理员录入，状态机流转 |
| 用户收藏 | 比赛/球队双类型，防重复 |
| 评论互动 | 发表/删除评论，分页，软删除 |
| Agent 查询 | `GET /api/agent/query?q=...` 自然语言查询 |

## 测试

```bash
npm run test    # 32 tests: 27 API + 3 concurrency + 2 unit
```

并发测试验证 AC-18（预测不重复）和 AC-19（收藏不重复），使用 SQLite UPSERT 原子化。

## 目录

```
├── frontend/          # Next.js 页面与组件
├── backend/           # Midway.js API (17 endpoints)
│   └── src/
│       ├── controller/  # 7 controllers
│       ├── service/     # 9 services
│       └── entity/      # 8 entities
├── specs/             # 需求 Spec (26 AC)
├── contracts/         # OpenAPI 契约
├── infra/             # Docker Compose
└── backend/test/      # 测试 (api + concurrency)
```

## Docker 部署

```bash
docker compose -f infra/compose.yaml up --build -d
```
