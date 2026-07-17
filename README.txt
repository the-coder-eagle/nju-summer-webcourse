================================================================================
  世界杯/苏超赛事信息与互动预测平台 — 交付文档
================================================================================

一、仓库地址
--------------------------------------------------------------------------------
  GitHub: https://github.com/the-coder-eagle/nju-summer-webcourse.git
  分支: dev

  私有仓库，已邀请 sunshinezxf@hotmail.com 作为协作者。


二、镜像启动方式
--------------------------------------------------------------------------------

  前置要求：Node.js >= 24.14.1, npm >= 11, Docker Desktop

  【方式一：本地开发启动】
    cd webdev-template
    npm install
    npm run dev
    → 前端 http://localhost:3000
    → 后端 http://localhost:7001

  【方式二：Docker Compose 一键启动】
    cd webdev-template
    docker compose -f infra/compose.yaml up --build -d
    → 前端 http://localhost:3000
    → 后端 http://localhost:7001

  【方式三：X64 运行产物包】
    docker load -i webdev-football-amd64.tar.gz
    docker compose -f infra/compose.yaml up -d


三、Web 服务公网访问地址
--------------------------------------------------------------------------------
  （如有部署到公网服务器，请在此填写）
  本地开发: http://localhost:3000


四、技术栈
--------------------------------------------------------------------------------
  前端: Next.js 16 + React 19 + TailwindCSS 4 + TypeScript (App Router)
  后端: Midway.js 4 + Koa + node:sqlite (DatabaseSync)
  契约: OpenAPI 3.1 (contracts/openapi.yaml)
  测试: Node.js Native Test Runner
  部署: Docker + Docker Compose (linux/amd64)
  Agent: 基于 REST API 的自然语言查询端点 (/api/agent/query)


五、项目结构
--------------------------------------------------------------------------------
  webdev-template/
  ├── frontend/           # Next.js 前端 (App Router)
  │   ├── src/app/        # 页面路由 (matches, teams, standings, bracket, ...)
  │   ├── src/components/ # 复用组件 (loading-skeleton, empty-state, error-state, ...)
  │   └── src/lib/        # API 客户端 (类型 + fetch 封装)
  ├── backend/            # Midway.js 后端
  │   ├── src/controller/ # REST 控制器 (match, team, standing, prediction, ...)
  │   ├── src/service/    # 业务逻辑层
  │   ├── src/entity/     # 数据模型类型定义
  │   ├── src/utils/      # 工具函数 (日期、用户上下文、校验)
  │   └── test/           # API 测试 + 并发测试
  ├── contracts/          # OpenAPI 3.1 契约
  ├── specs/              # 功能 Spec 与验收标准
  ├── infra/              # Dockerfile + Compose
  └── docs/               # 架构文档


六、核心功能清单
--------------------------------------------------------------------------------
  [x] 赛程浏览 — 按联赛筛选、分页、排序
  [x] 球队信息 — 列表 + 详情
  [x] 积分榜 — 小组赛战绩排名 (积分→净胜球→进球)
  [x] 淘汰赛图 — 树形对阵结构 (十六强→决赛)
  [x] 比分预测 — 开赛前提交/修改、唯一约束防重复
  [x] 比赛结果录入 — 管理员录入、状态机校验
  [x] 比赛状态管理 — scheduled→live→finished 流转
  [x] 用户收藏 — 比赛/球队收藏、添加/取消
  [x] 评论互动 — 发表/删除评论、软删除、分页
  [x] 并发一致性 — 预测和收藏的并发去重 (事务/UPSERT)
  [x] Agent 查询 — 自然语言查询赛程/积分/球队 (/api/agent/query)
  [x] 前端四态 — 加载/成功/空/错误状态覆盖
  [x] Docker 部署 — 前后端容器化 + Compose 编排


七、npm run check 结果
--------------------------------------------------------------------------------
  运行命令: npm run check
  （运行结果请见 EVIDENCE 目录或测试输出截图）


八、课程印象最深内容
--------------------------------------------------------------------------------
  本次课程最大的收获是理解了"契约驱动开发"的完整流程：从 Spec（业务意图）
  → Contract（OpenAPI 机器可读契约）→ 前后端独立实现 → Contract Test 验证，
  这一流程确保了前后端分离后仍然保持一致的接口语义。

  其次是并发一致性的实践：通过数据库唯一索引 + UPSERT 语句（INSERT ... ON
  CONFLICT DO UPDATE），在 SQLite 上实现了预测和收藏的并发去重，而不仅仅是
  应用层的 check-then-act。配合并发测试（Promise.all 模拟）验证了机制的
  正确性，这与课程中学到的"数据库层面保证"理念一致。


九、课程改进建议（可选）
--------------------------------------------------------------------------------
  1. 建议增加 OpenAPI 自动校验工具链的演示（如 spectral lint），让学生更早
     接触契约门禁的概念。
  2. 建议在 TypeORM 之外也认可 node:sqlite 等轻量方案，只要契约和数据访问
     边界清晰即可。
  3. 建议增加 Docker 多阶段构建和镜像优化的动手实践。


================================================================================
  提交时间: 2026-07-17
================================================================================
