/**
 * 独立种子数据脚本
 *
 * 初始化世界杯和苏超的球队、赛程、积分榜及淘汰赛数据。
 * 可重复执行 — 通过 DELETE + INSERT 保证幂等。
 *
 * 用法:
 *   node scripts/seed.mjs [--db path/to/football.sqlite]
 *
 * 默认数据库路径: backend/data/football.sqlite
 */

import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH =
  process.argv.includes("--db")
    ? process.argv[process.argv.indexOf("--db") + 1]
    : resolve(__dirname, "..", "data", "football.sqlite");

console.log(`Seed database: ${DB_PATH}`);

mkdirSync(dirname(DB_PATH), { recursive: true });
const db = new DatabaseSync(DB_PATH);
db.exec("PRAGMA journal_mode=WAL");
db.exec("PRAGMA busy_timeout=5000");

// ================================================================
// Table creation (idempotent via IF NOT EXISTS)
// ================================================================

db.exec(`
  CREATE TABLE IF NOT EXISTS teams (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo_url TEXT NOT NULL DEFAULT '',
    league TEXT NOT NULL CHECK (league IN ('worldcup', 'spl')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS matches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    home_team_id INTEGER NOT NULL REFERENCES teams(id),
    away_team_id INTEGER NOT NULL REFERENCES teams(id),
    kickoff_time TEXT NOT NULL,
    venue TEXT NOT NULL DEFAULT '',
    league TEXT NOT NULL CHECK (league IN ('worldcup', 'spl')),
    status TEXT NOT NULL DEFAULT 'scheduled'
      CHECK (status IN ('scheduled', 'live', 'finished', 'postponed', 'cancelled')),
    stage TEXT NOT NULL DEFAULT 'group'
      CHECK (stage IN ('group', 'round16', 'quarter', 'semi', 'final')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS standings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    team_id INTEGER NOT NULL REFERENCES teams(id),
    league TEXT NOT NULL CHECK (league IN ('worldcup', 'spl')),
    played INTEGER NOT NULL DEFAULT 0,
    won INTEGER NOT NULL DEFAULT 0,
    drawn INTEGER NOT NULL DEFAULT 0,
    lost INTEGER NOT NULL DEFAULT 0,
    goals_for INTEGER NOT NULL DEFAULT 0,
    goals_against INTEGER NOT NULL DEFAULT 0,
    goal_difference INTEGER NOT NULL DEFAULT 0,
    points INTEGER NOT NULL DEFAULT 0,
    UNIQUE (team_id, league)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS brackets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    league TEXT NOT NULL CHECK (league IN ('worldcup', 'spl')),
    stage TEXT NOT NULL CHECK (stage IN ('round16', 'quarter', 'semi', 'final')),
    match_id INTEGER REFERENCES matches(id),
    home_team_id INTEGER REFERENCES teams(id),
    away_team_id INTEGER REFERENCES teams(id),
    home_team_name TEXT,
    away_team_name TEXT,
    home_score INTEGER,
    away_score INTEGER,
    parent_node_id INTEGER REFERENCES brackets(id),
    position TEXT NOT NULL CHECK (position IN ('left', 'right'))
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS predictions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    match_id INTEGER NOT NULL REFERENCES matches(id),
    home_score INTEGER NOT NULL CHECK (home_score >= 0),
    away_score INTEGER NOT NULL CHECK (away_score >= 0),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, match_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS favorites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('match', 'team')),
    target_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, type, target_id)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    match_id INTEGER NOT NULL REFERENCES matches(id),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at TEXT
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS match_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id INTEGER NOT NULL REFERENCES matches(id) UNIQUE,
    home_score INTEGER NOT NULL CHECK (home_score >= 0),
    away_score INTEGER NOT NULL CHECK (away_score >= 0),
    entered_by TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

// ================================================================
// Seed data (DELETE + INSERT for idempotency)
// ================================================================

console.log("Clearing existing data...");
db.exec("DELETE FROM match_results");
db.exec("DELETE FROM comments");
db.exec("DELETE FROM favorites");
db.exec("DELETE FROM predictions");
db.exec("DELETE FROM brackets");
db.exec("DELETE FROM standings");
db.exec("DELETE FROM matches");
db.exec("DELETE FROM teams");

console.log("Seeding teams...");
const insertTeam = db.prepare(
  "INSERT INTO teams (name, logo_url, league) VALUES (?, ?, ?)"
);
const teams = [
  // World Cup
  ["阿根廷", "https://flagcdn.com/w320/ar.png", "worldcup"],
  ["巴西", "https://flagcdn.com/w320/br.png", "worldcup"],
  ["英格兰", "https://flagcdn.com/w320/gb-eng.png", "worldcup"],
  ["法国", "https://flagcdn.com/w320/fr.png", "worldcup"],
  ["德国", "https://flagcdn.com/w320/de.png", "worldcup"],
  ["日本", "https://flagcdn.com/w320/jp.png", "worldcup"],
  ["摩洛哥", "https://flagcdn.com/w320/ma.png", "worldcup"],
  ["西班牙", "https://flagcdn.com/w320/es.png", "worldcup"],
  // SPL (Scottish Premiership)
  ["凯尔特人", "https://flagcdn.com/w320/gb-sct.png", "spl"],
  ["格拉斯哥流浪者", "https://flagcdn.com/w320/gb-sct.png", "spl"],
  ["阿伯丁", "https://flagcdn.com/w320/gb-sct.png", "spl"],
  ["哈茨", "https://flagcdn.com/w320/gb-sct.png", "spl"],
];
for (const t of teams) {
  insertTeam.run(...t);
}
console.log(`  → ${teams.length} teams inserted`);

console.log("Seeding matches...");
const insertMatch = db.prepare(
  `INSERT INTO matches (home_team_id, away_team_id, kickoff_time, venue, league, status, stage)
   VALUES (?, ?, ?, ?, 'worldcup', 'scheduled', 'group')`
);
const matches = [
  // Group A
  [1, 2, "2026-07-20T18:00:00Z", "卢赛尔体育场"],
  [3, 4, "2026-07-20T22:00:00Z", "海湾体育场"],
  [1, 3, "2026-07-24T18:00:00Z", "卢赛尔体育场"],
  [2, 4, "2026-07-24T22:00:00Z", "海湾体育场"],
  [2, 3, "2026-07-28T18:00:00Z", "卢赛尔体育场"],
  [1, 4, "2026-07-28T22:00:00Z", "海湾体育场"],
  // Group B
  [5, 6, "2026-07-21T18:00:00Z", "教育城体育场"],
  [7, 8, "2026-07-21T22:00:00Z", "974 体育场"],
  [5, 7, "2026-07-25T18:00:00Z", "教育城体育场"],
  [6, 8, "2026-07-25T22:00:00Z", "974 体育场"],
  [6, 7, "2026-07-29T18:00:00Z", "教育城体育场"],
  [5, 8, "2026-07-29T22:00:00Z", "974 体育场"],
];
for (const m of matches) {
  insertMatch.run(...m);
}
console.log(`  → ${matches.length} matches inserted`);

console.log("Seeding standings...");
const insertStanding = db.prepare(
  `INSERT INTO standings (team_id, league, played, won, drawn, lost, goals_for, goals_against, goal_difference, points)
   VALUES (?, 'worldcup', 0, 0, 0, 0, 0, 0, 0, 0)`
);
for (let teamId = 1; teamId <= 8; teamId++) {
  insertStanding.run(teamId);
}
// SPL standings
const insertSplStanding = db.prepare(
  `INSERT INTO standings (team_id, league, played, won, drawn, lost, goals_for, goals_against, goal_difference, points)
   VALUES (?, 'spl', 0, 0, 0, 0, 0, 0, 0, 0)`
);
for (let teamId = 9; teamId <= 12; teamId++) {
  insertSplStanding.run(teamId);
}
console.log("  → 12 standings inserted");

console.log("Seeding brackets (World Cup knockout)...");
const insertBracket = db.prepare(
  `INSERT INTO brackets (league, stage, position, parent_node_id)
   VALUES ('worldcup', ?, ?, ?)`
);
// Create the bracket tree structure
// Final
insertBracket.run("final", "left", null);   // id 1
insertBracket.run("final", "right", null);  // id 2
// Semi-finals (parent_node_id points to final nodes)
insertBracket.run("semi", "left", 1);   // id 3 → final left
insertBracket.run("semi", "right", 1);  // id 4 → final left
insertBracket.run("semi", "left", 2);   // id 5 → final right
insertBracket.run("semi", "right", 2);  // id 6 → final right
// Quarter-finals
insertBracket.run("quarter", "left", 3);   // id 7
insertBracket.run("quarter", "right", 3);  // id 8
insertBracket.run("quarter", "left", 4);   // id 9
insertBracket.run("quarter", "right", 4);  // id 10
insertBracket.run("quarter", "left", 5);   // id 11
insertBracket.run("quarter", "right", 5);  // id 12
insertBracket.run("quarter", "left", 6);   // id 13
insertBracket.run("quarter", "right", 6);  // id 14
// Round of 16
for (let parentId = 7; parentId <= 14; parentId++) {
  insertBracket.run("round16", "left", parentId);
  insertBracket.run("round16", "right", parentId);
}
console.log("  → 30 bracket nodes inserted");

db.close();
console.log("\n✅ Seed completed successfully!");
console.log(`   Database: ${DB_PATH}`);
console.log("   Teams:    12 (8 World Cup + 4 SPL)");
console.log("   Matches:  12 (World Cup group stage)");
console.log("   Standings: 12");
console.log("   Brackets: 30 (World Cup knockout tree)");
