# 002：世界杯/苏超赛事信息与互动预测平台

> 状态：草案
> 关联事项：方向一 · 赛事信息服务大作业

## 目标

球迷可以浏览世界杯或苏超的赛程、球队信息、积分榜和淘汰赛图，在赛前提交比分预测，赛后查看比赛结果，并通过收藏和评论与其他用户互动；同一用户对同一场比赛只能保留一条有效预测，并发提交不会产生重复记录，开赛后预测不可修改。

## 用户故事

1. 作为一名球迷，我希望浏览赛程列表和每场比赛的详细信息（对阵双方、时间、地点），以便了解即将进行的比赛安排。
2. 作为一名球迷，我希望查看各支球队的基本信息（队名、队徽、所属联赛），以便熟悉参赛队伍。
3. 作为一名球迷，我希望查看小组积分榜和淘汰赛对阵图，以便把握赛事整体进展。
4. 作为一名球迷，我希望在比赛开始前提交对某场比赛的比分预测，以便参与互动竞猜。
5. 作为一名球迷，我希望修改自己在开赛前的预测，但开赛后不能再改，以保证预测公平。
6. 作为一名管理员，我希望录入比赛结果，以便系统据此评判预测正确性并计算积分。
7. 作为一名球迷，我希望收藏我关注的比赛或球队，以便快速找到它们。
8. 作为一名球迷，我希望在比赛详情页发表评论并与他人互动，以便分享观点和讨论赛事。

## 范围

- 赛程浏览：列表展示 + 单场详情，支持按联赛（世界杯 / 苏超）筛选。
- 球队信息：球队列表展示，含队名、队徽链接、所属联赛。
- 积分榜：小组赛积分榜（胜 / 平 / 负 / 进球 / 失球 / 积分），按积分降序排列。
- 淘汰赛图：淘汰赛阶段对阵树形展示，从十六强到决赛。
- 比分预测：用户对尚未开始的比赛提交主客队比分预测；同一用户同一比赛仅一条有效记录；开赛后不可创建或修改。
- 比赛结果录入：管理员 / 授权角色录入比分；结果录入后预测可被评判。
- 用户收藏：收藏比赛或球队；支持添加和取消收藏；用户可查看自己的收藏列表。
- 评论互动：在比赛详情页发表文字评论；展示比赛关联的评论列表，按时间倒序。
- 并发一致性：同一用户对同一场比赛的预测通过数据库唯一约束保证不重复；并发提交场景使用事务或条件更新确保串行化语义。
- 前后端分离：后端提供 RESTful API，前端通过 `/api/*` 同源代理消费，契约以 `contracts/openapi.yaml` 为唯一事实来源。
- 前端四态覆盖：所有数据获取流程覆盖加载、成功、空结果、错误四种用户可见状态。

## 非目标

- 用户注册、登录与身份认证（假定已有用户标识可通过请求头或上下文传递，本 spec 不定义认证协议细节）。
- 密码找回、Profile 管理、头像上传。
- 实时推送 / WebSocket 通知。
- 多语言国际化。
- 预测排行榜与积分奖励系统。
- 管理员后台 UI（结果录入假定通过 API 工具或基础表单完成，不包含独立管理后台）。
- 图片上传（队徽通过 URL 引用，不实现文件上传）。
- 第三方 API 对接（赛事数据来源于自有数据库的初始化种子数据或手动录入）。

## 业务规则

### 赛程与球队

- **BR-01**：赛程列表默认按比赛时间升序排列；支持按联赛筛选（`league` 参数，枚举值：`worldcup`、`spl`）；无匹配记录时返回空数组及 `200`。
- **BR-02**：单场详情包含主队、客队、开赛时间、比赛地点、联赛、比赛状态（`scheduled` / `live` / `finished` / `postponed` / `cancelled`）。
- **BR-03**：球队列表按队名字母序排列；每支球队至少包含 `id`、`name`、`logoUrl`、`league`。

### 积分榜

- **BR-04**：积分榜按联赛分组；同一联赛内按积分降序、净胜球降序、进球数降序排列；积分计算：胜 = 3 分、平 = 1 分、负 = 0 分。
- **BR-05**：淘汰赛图以树形结构展示对阵关系；包含当前阶段（十六强 / 四分之一决赛 / 半决赛 / 决赛）及各场次对阵双方与比分。

### 比分预测

- **BR-06**：用户仅可对状态为 `scheduled` 的比赛创建或修改预测；比赛状态变为 `live`、`finished`、`postponed` 或 `cancelled` 后禁止创建和修改。
- **BR-07**：同一用户对同一场比赛只能保留一条有效预测记录。数据库层通过 `(userId, matchId)` 唯一约束保证；并发提交场景通过事务包裹"检查现有记录 + 插入或更新"操作，或使用 `INSERT … ON CONFLICT` / 条件 UPSERT 机制，确保不会产生重复记录。
- **BR-08**：预测提交必须同时提供主队进球数（`homeScore`）和客队进球数（`awayScore`），均为非负整数；缺少任一字段或值为负数、非整数时返回 `400`。
- **BR-09**：用户可修改自己的预测（在比赛开始前）；修改时传入全部字段（`homeScore`、`awayScore`），传递空字段视为校验错误。

### 比赛结果录入

- **BR-10**：仅管理员或授权角色可录入比赛结果；录入时需提供 `homeScore`、`awayScore`（非负整数），可选提供 `status` 更新（默认 `finished`）。
- **BR-11**：同一场比赛的结果只能录入一次；录入后不可覆盖（如需修正需通过独立的管理接口操作，不在此 spec 范围）。数据库层通过 `matchId` 唯一约束或结果表的唯一关联保证不重复。

### 收藏

- **BR-12**：用户可收藏比赛或球队；收藏类型通过 `type` 字段区分（`match` / `team`），配合 `targetId` 指向对应实体。同一用户对同一目标不可重复收藏，数据库层通过 `(userId, type, targetId)` 唯一约束保证。
- **BR-13**：用户仅可操作（查看、删除）自己的收藏；跨用户访问返回 `403` 或 `404`（不暴露是否存在）。

### 评论

- **BR-14**：用户可在任意比赛详情页发表评论；评论内容长度 1-500 字符，需去除首尾空白；超出范围返回 `400`。
- **BR-15**：评论列表按创建时间倒序排列；支持分页（`page`、`pageSize` 参数，默认第 1 页每页 20 条）。
- **BR-16**：用户可删除自己的评论；管理员可删除任意评论；删除采用软删除（设置 `deletedAt`），已删除的评论不在列表中返回。

### 并发一致性

- **BR-17**：所有涉及唯一约束的写入操作（预测、收藏、结果录入）必须在数据库层面使用事务或条件更新，并通过唯一索引防止竞态条件。后端须编写并发测试：模拟两个并发请求对同一用户同一比赛提交预测，验证最终仅一条记录存在且 HTTP 响应中至少一个返回成功（`200` / `201`），另一个返回冲突错误（`409`）或幂等结果。

### 比赛状态流转

- **BR-18**：比赛状态按 `scheduled → live → finished` 主路径流转；`postponed` 和 `cancelled` 为旁路终态（不可再转为其他状态）。状态更新仅限管理员通过 `PATCH /api/matches/{matchId}` 操作：
  - `scheduled → live`：管理员将比赛标记为进行中（开赛）。
  - `live → finished`：管理员将比赛标记为已结束；也可直接通过 `POST /api/matches/{matchId}/results` 录入结果时自动将状态置为 `finished`（BR-10）。
  - 任意状态 → `postponed` 或 `cancelled`：管理员标记延期或取消。
  - 非法转换（如 `finished → live`、`postponed → scheduled`、终态到任意状态）返回 `400`。
- 设计决策说明：`live` 状态的产生有二种路径——(a) 管理员通过 `PATCH /api/matches/{matchId}` 手动触发 `scheduled → live`；(b) 种子数据或定时任务直接写入 `live` 状态。实现时两种路径均受 BR-18 的状态机校验保护。

## 数据模型

以下为核心实体及其关系概要，具体字段定义以 `contracts/openapi.yaml` Schema 和数据库 Migration 为准。

### 实体关系

```
Team ──1:N── Match (homeTeamId)     ── 主队
Team ──1:N── Match (awayTeamId)     ── 客队
Match ──1:N── Prediction            ── 用户对比赛的预测
Match ──1:1── MatchResult           ── 比赛最终结果
Match ──1:N── Comment               ── 比赛评论
User  ──1:N── Prediction            ── 用户的预测
User  ──1:N── Favorite              ── 用户的收藏
User  ──1:N── Comment               ── 用户的评论
Standing  ──N:1── Team              ── 球队积分排名
```

### 核心实体及关键字段

| 实体 | 关键字段 | 说明 |
|------|----------|------|
| **Match** | `id`, `homeTeamId`, `awayTeamId`, `kickoffTime`, `venue`, `league`(enum:`worldcup`,`spl`), `status`(enum:`scheduled`,`live`,`finished`,`postponed`,`cancelled`), `stage`(enum:`group`,`round16`,`quarter`,`semi`,`final`), `createdAt`, `updatedAt` | `status` 流转受 BR-18 状态机约束 |
| **Team** | `id`, `name`, `logoUrl`, `league`(enum:`worldcup`,`spl`), `createdAt` | 按 `name` 字母序排列（BR-03） |
| **Standing** | `id`, `teamId`, `league`, `played`, `won`, `drawn`, `lost`, `goalsFor`, `goalsAgainst`, `goalDifference`(计算列或存储列), `points` | 排序规则见 BR-04 |
| **Bracket** | `id`, `league`, `stage`, `matchId`(可空), `homeTeamId`(可空), `awayTeamId`(可空), `homeScore`(可空), `awayScore`(可空), `parentNodeId`(可空，构建树形) | 树形对阵结构（BR-05）；叶子节点通过 `matchId` 关联具体比赛 |
| **Prediction** | `id`, `userId`, `matchId`, `homeScore`(非负整数), `awayScore`(非负整数), `createdAt`, `updatedAt` | 唯一约束 `(userId, matchId)`（BR-07） |
| **MatchResult** | `id`, `matchId`, `homeScore`(非负整数), `awayScore`(非负整数), `enteredBy`, `createdAt` | 唯一约束 `matchId`（BR-11）；录入后比赛 `status` 置为 `finished` |
| **Favorite** | `id`, `userId`, `type`(enum:`match`,`team`), `targetId`, `createdAt` | 唯一约束 `(userId, type, targetId)`（BR-12） |
| **Comment** | `id`, `userId`, `matchId`, `content`(1-500字符), `createdAt`, `deletedAt`(可空) | 软删除（BR-16）；列表查询过滤 `deletedAt IS NULL` |

### 约束汇总

| 来源 | 约束 | 实现方式 |
|------|------|----------|
| BR-07 | `Prediction.(userId, matchId)` 唯一 | 数据库唯一索引 + 事务 UPSERT |
| BR-11 | `MatchResult.matchId` 唯一 | 数据库唯一索引 |
| BR-12 | `Favorite.(userId, type, targetId)` 唯一 | 数据库唯一索引 + 事务 |
| BR-14 | `Comment.content` 长度 1-500，去除首尾空白 | 应用层校验 |
| BR-16 | `Comment.deletedAt` 软删除标记 | 查询默认过滤 `WHERE deletedAt IS NULL` |
| BR-18 | `Match.status` 状态机流转 | 应用层状态机校验，禁止非法转换 |

## Contract 影响

- 结论：新增大量 API。现有 `GET /api/health` 保留不变；现有 `GET /api/courses` 和 `POST /api/courses` 保留但与本 spec 无关。
- 新增 OpenAPI operations：

| Method | Path | OperationId | 说明 |
|--------|------|-------------|------|
| `GET` | `/api/matches` | `listMatches` | 赛程列表，支持 `?league=&status=&page=&pageSize=` |
| `GET` | `/api/matches/{matchId}` | `getMatch` | 单场比赛详情（含关联评论数） |
| `PATCH` | `/api/matches/{matchId}` | `updateMatchStatus` | 管理员更新比赛状态（BR-18 状态机） |
| `GET` | `/api/teams` | `listTeams` | 球队列表，支持 `?league=` |
| `GET` | `/api/teams/{teamId}` | `getTeam` | 单支球队详情 |
| `GET` | `/api/standings` | `getStandings` | 积分榜，支持 `?league=` |
| `GET` | `/api/bracket` | `getBracket` | 淘汰赛对阵图，支持 `?league=` |
| `POST` | `/api/predictions` | `createPrediction` | 提交比分预测 |
| `PUT` | `/api/predictions/{predictionId}` | `updatePrediction` | 修改比分预测（仅开赛前） |
| `GET` | `/api/predictions` | `listMyPredictions` | 查看当前用户的预测列表 |
| `POST` | `/api/matches/{matchId}/results` | `enterResult` | 录入比赛结果（管理员） |
| `POST` | `/api/favorites` | `addFavorite` | 添加收藏 |
| `DELETE` | `/api/favorites/{favoriteId}` | `removeFavorite` | 取消收藏 |
| `GET` | `/api/favorites` | `listMyFavorites` | 查看当前用户的收藏列表 |
| `POST` | `/api/matches/{matchId}/comments` | `createComment` | 发表评论 |
| `GET` | `/api/matches/{matchId}/comments` | `listComments` | 获取评论列表，支持 `?page=&pageSize=` |
| `DELETE` | `/api/comments/{commentId}` | `deleteComment` | 删除评论 |

- 迁移 / 废弃安排：不适用。现有 `GET /api/courses` 和 `POST /api/courses` 保持不变，不与新 API 冲突。

## 验收标准

### 赛程浏览

- **AC-01**：给定多条比赛数据，当请求 `GET /api/matches` 时，响应为 `200`，`data` 中比赛按 `kickoffTime` 升序排列，每场比赛包含 `id`、`homeTeam`、`awayTeam`、`kickoffTime`、`league`、`status`、`venue` 字段。
- **AC-02**：给定赛程数据，当请求 `GET /api/matches?league=worldcup` 时，仅返回联赛为 `worldcup` 的比赛；当请求 `GET /api/matches?league=spl` 时，仅返回 `spl` 的比赛；联赛参数无效时返回 `400`。
- **AC-03**：给定比赛数据不存在或 `data` 为空，当请求 `GET /api/matches` 时，返回 `200` 且 `data` 为空数组 `[]`。
- **AC-04**（前端）：给定赛程页面，当数据正在加载时，显示骨架屏或加载指示器；当加载成功且有数据时，渲染比赛卡片列表；当数据为空时，显示"暂无赛程"的空状态提示；当请求失败时，显示错误提示和重试按钮。
- **AC-22**：给定一场有效比赛，当请求 `GET /api/matches/{matchId}` 时，响应为 `200`，包含完整比赛信息及嵌套的主客队对象（`homeTeam`、`awayTeam`），并包含关联评论总数（`commentCount`）字段；当请求不存在的 `matchId` 时返回 `404`。

### 球队信息

- **AC-05**：给定多条球队数据，当请求 `GET /api/teams` 时，响应为 `200`，`data` 中球队按 `name` 字母序排列；每支球队包含 `id`、`name`、`logoUrl`、`league` 字段。
- **AC-23**：给定一支有效球队，当请求 `GET /api/teams/{teamId}` 时，响应为 `200`，包含球队完整信息（`id`、`name`、`logoUrl`、`league`、`createdAt`）；当请求不存在的 `teamId` 时返回 `404`。

### 积分榜

- **AC-06**：给定联赛小组赛战绩数据，当请求 `GET /api/standings?league=spl` 时，返回该联赛的积分排名列表；每队包含 `teamId`、`teamName`、`played`、`won`、`drawn`、`lost`、`goalsFor`、`goalsAgainst`、`goalDifference`、`points`，并按积分降序排列。

### 淘汰赛图

- **AC-07**：给定淘汰赛阶段数据，当请求 `GET /api/bracket?league=worldcup` 时，返回树形对阵结构；包含当前阶段信息和各节点的主客队及比分；淘汰赛数据尚未生成时返回空结构及 `200`。

### 比分预测

- **AC-08**：给定一场状态为 `scheduled` 的比赛，当用户提交 `POST /api/predictions` 且 `homeScore` 和 `awayScore` 均为非负整数时，返回 `201`，预测记录被持久化。
- **AC-09**：给定一场状态为 `live` 或 `finished` 的比赛，当用户提交 `POST /api/predictions` 时，返回 `400` 且错误信息表明比赛已开始或已结束，禁止预测。
- **AC-10**：给定 `POST /api/predictions` 的请求体中 `homeScore` 缺失、`awayScore` 缺失、任一值为负数或非整数，返回 `400` 且错误信息指明具体字段问题。
- **AC-11**：给定用户已对某场比赛有一条预测，当该用户再次提交预测时（PUT 修改），返回 `200` 且预测被更新；开赛后修改则返回 `400`。
- **AC-24**：给定用户有多条预测记录，当请求 `GET /api/predictions` 时，返回 `200`，列表仅包含当前用户的预测，每条含 `id`、`matchId`、`homeScore`、`awayScore` 及嵌套的比赛摘要（主客队名、开赛时间、状态）；当用户无预测记录时返回 `200` 且 `data` 为空数组；未认证用户请求时返回 `401`。

### 比赛结果录入

- **AC-12**：给定管理员身份和一场状态为 `finished` 的比赛（结果未录入），当提交 `POST /api/matches/{matchId}/results` 且 `homeScore` 和 `awayScore` 均合法时，返回 `201`，结果被持久化，该场比赛的已有预测可以被评判正确性。
- **AC-13**：给定非管理员身份，当尝试录入比赛结果时，返回 `403`。

### 比赛状态管理

- **AC-25**：给定管理员身份，当通过 `PATCH /api/matches/{matchId}` 将比赛状态从 `scheduled` 更新为 `live` 时，返回 `200`，状态被持久化；当尝试非法转换（如 `finished → live`、`postponed → scheduled`）时返回 `400` 且错误信息指明非法状态转换；非管理员请求时返回 `403`。

### 用户收藏

- **AC-14**：给定用户已登录，当提交 `POST /api/favorites` 且 `type` 为 `match`、`targetId` 为有效比赛 ID 时，返回 `201`，收藏记录被持久化；再次对同一目标提交时返回 `409` 冲突。
- **AC-15**：给定用户已收藏某场比赛，当用户请求 `GET /api/favorites` 时，返回 `200` 且列表包含该收藏；当用户请求 `DELETE /api/favorites/{favoriteId}` 时，返回 `200` 且收藏被移除；再次访问该收藏 ID 时返回 `404`。

### 评论互动

- **AC-16**：给定用户已登录，当对一场有效比赛提交 `POST /api/matches/{matchId}/comments` 且 `content` 长度为 1-500 字符时，返回 `201`，评论被持久化；`content` 为空、仅含空格或超过 500 字符时返回 `400`。
- **AC-17**：给定某场比赛有多条评论，当请求 `GET /api/matches/{matchId}/comments` 时，返回 `200`，评论按 `createdAt` 倒序排列；支持 `page` 和 `pageSize` 分页；已删除的评论不出现在列表中。
- **AC-26**：给定用户 A 发表的评论，当用户 A 请求 `DELETE /api/comments/{commentId}` 时，返回 `200`，评论被软删除（`deletedAt` 非空），后续列表查询不再返回该评论；给定管理员身份，当请求删除用户 A 的评论时，返回 `200`，同样生效；给定用户 B（非管理员、非评论作者），当请求删除用户 A 的评论时，返回 `403`；给定不存在的 `commentId` 或已删除的评论时返回 `404`。

### 并发一致性

- **AC-18**：使用并发测试工具（如 `Promise.all` 或多客户端）同时发送两个 `POST /api/predictions` 请求（同一用户、同一场比赛），验证最终数据库仅存在一条预测记录，且 HTTP 响应中一个为 `201`（或 `200`），另一个为 `409`（冲突）或 `200`（幂等覆盖）。
- **AC-19**：使用并发测试工具同时发送两个 `POST /api/favorites` 请求（同一用户、同一目标），验证最终数据库仅存在一条收藏记录，且不会抛出未处理的数据库异常或返回 `500`。

### 边界与错误

- **AC-20**：给定请求的资源不存在（如 `GET /api/matches/99999`），返回 `404` 且错误结构中包含可识别的 `error` 字段和人类可读的消息，不暴露堆栈信息。
- **AC-21**：给定未认证用户访问需要用户身份的接口（如 `POST /api/predictions`、`POST /api/favorites`），返回 `401`。

## 验证映射

| AC | 验证方式 | 命令或可复现步骤 | 结果 / 证据 |
|----|----------|------------------|-------------|
| AC-01 | API / Contract 测试 | 启动后端，插入含不同 `kickoffTime` 的比赛，对 `GET /api/matches` 断言排序与字段 | 待补充自动测试 |
| AC-02 | API / Contract 测试 | 分别以 `?league=worldcup` 和 `?league=spl` 请求，断言结果仅包含对应联赛；以 `?league=invalid` 请求断言 `400` | 待补充自动测试 |
| AC-03 | API / Contract 测试 | 清空比赛表，请求 `GET /api/matches`，断言 `200` 且 `data` 为 `[]` | 待补充自动测试 |
| AC-04 | 组件测试 / 浏览器验收 | Mock 三种 API 状态（loading / 有数据 / 空数组 / 网络错误），断言 UI 四态均正确渲染 | 待补充自动测试 + 人工截图 |
| AC-05 | API / Contract 测试 | 插入多条球队数据，请求 `GET /api/teams`，断言按 `name` 字母序排列及字段完整性 | 待补充自动测试 |
| AC-06 | API / Contract 测试 | 插入联赛战绩数据，请求 `GET /api/standings?league=spl`，断言排序规则（积分→净胜球→进球） | 待补充自动测试 |
| AC-07 | API / Contract 测试 | 插入淘汰赛对阵数据，请求 `GET /api/bracket?league=worldcup`，断言树形结构完整；空数据时断言空结构 + `200` | 待补充自动测试 |
| AC-08 | API / Contract 测试 | 对 `scheduled` 比赛提交有效预测，断言 `201` 及持久化 | 待补充自动测试 |
| AC-09 | API / Contract 测试 | 对 `live` 或 `finished` 比赛提交预测，断言 `400` 且消息表明禁止预测 | 待补充自动测试 |
| AC-10 | API / Contract 测试 | 分别以缺失字段、负数、非整数值提交预测，断言 `400` 及具体字段错误 | 待补充自动测试 |
| AC-11 | API / Contract 测试 | 先创建预测，再 PUT 修改（开赛前）断言 `200`；将比赛状态改为 `live` 后 PUT 断言 `400` | 待补充自动测试 |
| AC-12 | API / Contract 测试 | 以管理员身份对 `finished` 比赛录入结果，断言 `201` 及持久化 | 待补充自动测试 |
| AC-13 | API / Contract 测试 | 以普通用户身份尝试录入结果，断言 `403` | 待补充自动测试 |
| AC-14 | API / Contract 测试 | 添加收藏断言 `201`；重复添加断言 `409` | 待补充自动测试 |
| AC-15 | API / Contract 测试 | 添加收藏后 GET 列表断言包含；DELETE 后断言返回 `200`；再次 GET 或 DELETE 断言 `404` | 待补充自动测试 |
| AC-16 | API / Contract 测试 | 提交有效评论断言 `201`；提交空字符串、仅空格、超长内容分别断言 `400` | 待补充自动测试 |
| AC-17 | API / Contract 测试 | 创建多条评论（含已软删除），请求列表，断言按 `createdAt` 倒序、分页有效、已删除不出现在列表中 | 待补充自动测试 |
| AC-18 | 并发测试 | 使用 `Promise.all` 同时发送两个相同用户+比赛的预测请求，断言数据库仅一条记录且响应状态码合规 | 待补充并发测试脚本及结果 |
| AC-19 | 并发测试 | 同时发送两个相同用户+目标的收藏请求，断言数据库仅一条记录且无 `500` | 待补充并发测试脚本及结果 |
| AC-20 | API / Contract 测试 | 请求不存在的比赛 ID，断言 `404` 且 error 结构可读，不包含堆栈 | 待补充自动测试 |
| AC-21 | API / Contract 测试 | 不带认证信息请求预测/收藏接口，断言 `401` | 待补充自动测试 |
| AC-22 | API / Contract 测试 | 请求有效 `matchId`，断言 `200` 及嵌套主客队对象 + `commentCount`；请求不存在的 ID，断言 `404` | 待补充自动测试 |
| AC-23 | API / Contract 测试 | 请求有效 `teamId`，断言 `200` 及完整字段；请求不存在的 ID，断言 `404` | 待补充自动测试 |
| AC-24 | API / Contract 测试 | 以已认证用户请求预测列表，断言 `200` 且仅含自己的记录；清空后断言空数组 `[]`；未认证断言 `401` | 待补充自动测试 |
| AC-25 | API / Contract 测试 | 以管理员身份合法转换（`scheduled→live`）断言 `200`；非法转换断言 `400`；普通用户断言 `403` | 待补充自动测试 |
| AC-26 | API / Contract 测试 | 评论作者删除断言 `200` + 软删除验证；管理员删他人评论断言 `200`；非作者非管理员断言 `403`；不存在的 ID 断言 `404` | 待补充自动测试 |

## 验收记录

- `npm run check`：待执行。
- 人工验收：待执行。
- 前端四态截图：待补充。
- 并发测试证据：待补充（BR-17 并发测试脚本及执行结果）。

## 后续

- 设计并实现数据库 Entity 与 Migration（`Match`、`Team`、`Standing`、`Bracket`、`Prediction`、`MatchResult`、`Favorite`、`Comment`），对齐数据模型节中的约束汇总。
- 在 `contracts/openapi.yaml` 中补齐本 spec 所列全部 17 个 API 的请求 / 响应 Schema、状态码及错误结构（含新增的 `PATCH /api/matches/{matchId}`）。
- 实现比赛状态机校验逻辑（BR-18），覆盖所有合法与非法转换路径。
- 为每个 API 编写 Service 层单元测试和 Contract 测试。
- 实现前端页面：赛程页、球队页、积分榜页、淘汰赛页、比赛详情页（含预测、评论）、个人收藏页、个人预测页。
- 实现并发场景的端到端测试（BR-17）。
- 种子数据脚本：初始化示例世界杯和苏超的球队、赛程及积分榜数据。
- Agent / Skill 接入：将一项 Web 服务能力（如查询赛程或提交预测）通过 MCP 或 Skill 接入 WorkBuddy，实现对话式调用。
