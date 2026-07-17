#!/usr/bin/env node

/**
 * MCP Server — Football Platform Agent
 *
 * Exposes football match/team/standing data as MCP tools so WorkBuddy
 * can call them via the Model Context Protocol.
 *
 * Usage (in Claude Desktop / WorkBuddy config):
 *   {
 *     "mcpServers": {
 *       "football-platform": {
 *         "command": "node",
 *         "args": ["backend/scripts/mcp-server.mjs"],
 *         "env": { "FOOTBALL_API_URL": "http://localhost:7001" }
 *       }
 *     }
 *   }
 */

import { randomUUID } from "node:crypto";
import { createInterface } from "node:readline";

const API_URL = process.env.FOOTBALL_API_URL || "http://localhost:7001";

// ---- MCP Protocol Helpers ----

function send(message) {
  process.stdout.write(JSON.stringify(message) + "\n");
}

function log(msg) {
  process.stderr.write(`[mcp-server] ${msg}\n`);
}

// ---- API Client ----

async function apiFetch(path) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    return { error: `API ${res.status}: ${res.statusText}` };
  }
  return res.json();
}

async function apiPost(path, body) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return { error: data?.error?.message || data?.error || `HTTP ${res.status}` };
  }
  return data;
}

// ---- Tool Definitions ----

const TOOLS = [
  {
    name: "search_matches",
    description: "搜索足球赛程。可按联赛（worldcup/spl）和状态筛选。返回比赛列表含主客队信息。",
    inputSchema: {
      type: "object",
      properties: {
        league: { type: "string", enum: ["worldcup", "spl"], description: "联赛" },
        status: { type: "string", enum: ["scheduled", "live", "finished"], description: "比赛状态" },
      },
    },
  },
  {
    name: "get_match_detail",
    description: "获取单场比赛详情，包含主客队信息和评论数。",
    inputSchema: {
      type: "object",
      properties: {
        matchId: { type: "number", description: "比赛 ID" },
      },
      required: ["matchId"],
    },
  },
  {
    name: "search_teams",
    description: "搜索球队信息，包含队名、队徽、所属联赛。",
    inputSchema: {
      type: "object",
      properties: {
        league: { type: "string", enum: ["worldcup", "spl"], description: "筛选联赛" },
      },
    },
  },
  {
    name: "get_standings",
    description: "获取联赛积分榜，包含胜/平/负/进球/失球/积分，按积分降序排列。",
    inputSchema: {
      type: "object",
      properties: {
        league: { type: "string", enum: ["worldcup", "spl"], description: "联赛（必填）" },
      },
      required: ["league"],
    },
  },
  {
    name: "get_bracket",
    description: "获取淘汰赛对阵图，包含从16强到决赛的树形对阵结构。",
    inputSchema: {
      type: "object",
      properties: {
        league: { type: "string", enum: ["worldcup", "spl"], description: "联赛（必填）" },
      },
      required: ["league"],
    },
  },
  {
    name: "get_match_comments",
    description: "获取某场比赛的评论列表，支持分页。",
    inputSchema: {
      type: "object",
      properties: {
        matchId: { type: "number", description: "比赛 ID" },
        page: { type: "number", description: "页码，默认 1" },
      },
      required: ["matchId"],
    },
  },
];

// ---- Tool Handler ----

async function handleToolCall(name, args) {
  switch (name) {
    case "search_matches": {
      const params = new URLSearchParams();
      if (args.league) params.set("league", args.league);
      if (args.status) params.set("status", args.status);
      const qs = params.toString();
      const result = await apiFetch(`/api/matches${qs ? "?" + qs : ""}`);
      if (result.error) return { content: [{ type: "text", text: `❌ ${result.error}` }] };
      if (!result.data || result.data.length === 0) {
        return { content: [{ type: "text", text: "📭 没有找到符合条件的比赛。" }] };
      }
      const lines = result.data.map(
        (m) => `⚽ ${m.homeTeam.name} vs ${m.awayTeam.name} — ${new Date(m.kickoffTime).toLocaleString("zh-CN")} — ${m.venue} [${m.status}] [ID:${m.id}]`
      );
      return { content: [{ type: "text", text: `找到 ${result.pagination?.total || result.data.length} 场比赛：\n\n${lines.join("\n")}` }] };
    }
    case "get_match_detail": {
      const result = await apiFetch(`/api/matches/${args.matchId}`);
      if (result.error) return { content: [{ type: "text", text: `❌ ${result.error}` }] };
      const m = result.data;
      return {
        content: [{
          type: "text",
          text: `🏟 ${m.homeTeam.name} vs ${m.awayTeam.name}\n` +
            `📅 ${new Date(m.kickoffTime).toLocaleString("zh-CN")}\n` +
            `📍 ${m.venue}\n` +
            `🏆 ${m.league === "worldcup" ? "世界杯" : "苏超"} | ${m.stage}\n` +
            `📊 状态: ${m.status}\n` +
            `💬 评论数: ${m.commentCount}\n` +
            `🆔 比赛 ID: ${m.id}`,
        }],
      };
    }
    case "search_teams": {
      const params = new URLSearchParams();
      if (args.league) params.set("league", args.league);
      const qs = params.toString();
      const result = await apiFetch(`/api/teams${qs ? "?" + qs : ""}`);
      if (result.error) return { content: [{ type: "text", text: `❌ ${result.error}` }] };
      if (!result.data || result.data.length === 0) {
        return { content: [{ type: "text", text: "📭 没有找到球队。" }] };
      }
      const lines = result.data.map(
        (t) => `🏴 ${t.name} — ${t.league === "worldcup" ? "世界杯" : "苏超"} [ID:${t.id}]`
      );
      return { content: [{ type: "text", text: `共 ${result.data.length} 支球队：\n\n${lines.join("\n")}` }] };
    }
    case "get_standings": {
      const result = await apiFetch(`/api/standings?league=${args.league}`);
      if (result.error) return { content: [{ type: "text", text: `❌ ${result.error}` }] };
      if (!result.data || result.data.length === 0) {
        return { content: [{ type: "text", text: "📭 暂无积分榜数据。" }] };
      }
      const leagueLabel = args.league === "worldcup" ? "世界杯" : "苏超";
      const header = `📊 ${leagueLabel}积分榜：\n`;
      const lines = result.data.map(
        (s, i) =>
          `${String(i + 1).padStart(2)}. ${s.teamName} | 赛${s.played} 胜${s.won} 平${s.drawn} 负${s.lost} | 进${s.goalsFor}/失${s.goalsAgainst} 净胜${s.goalDifference} | 积分${s.points}`,
      );
      return { content: [{ type: "text", text: header + lines.join("\n") }] };
    }
    case "get_bracket": {
      const result = await apiFetch(`/api/bracket?league=${args.league}`);
      if (result.error) return { content: [{ type: "text", text: `❌ ${result.error}` }] };
      if (!result.data || result.data.length === 0) {
        return { content: [{ type: "text", text: "📭 暂无淘汰赛数据。" }] };
      }
      const stageLabels = { round16: "16强", quarter: "1/4决赛", semi: "半决赛", final: "决赛" };
      const byStage = {};
      for (const n of result.data) {
        (byStage[n.stage] ||= []).push(n);
      }
      const lines = [];
      for (const stage of ["final", "semi", "quarter", "round16"]) {
        const nodes = byStage[stage];
        if (!nodes) continue;
        lines.push(`\n🏆 ${stageLabels[stage] || stage}：`);
        for (const n of nodes) {
          const home = n.homeTeamName || "待定";
          const away = n.awayTeamName || "待定";
          const score =
            n.homeScore !== null && n.homeScore !== undefined
              ? ` (${n.homeScore}:${n.awayScore})`
              : "";
          lines.push(`  ${home} vs ${away}${score}`);
        }
      }
      return { content: [{ type: "text", text: lines.join("\n") }] };
    }
    case "get_match_comments": {
      const page = args.page || 1;
      const result = await apiFetch(`/api/matches/${args.matchId}/comments?page=${page}`);
      if (result.error) return { content: [{ type: "text", text: `❌ ${result.error}` }] };
      if (!result.data || result.data.length === 0) {
        return { content: [{ type: "text", text: "💬 暂无评论。" }] };
      }
      const lines = result.data.map(
        (c) => `💬 [${c.userId}] ${c.content} — ${new Date(c.createdAt).toLocaleString("zh-CN")}`,
      );
      return { content: [{ type: "text", text: `共 ${result.pagination?.total || 0} 条评论（第 ${page} 页）：\n\n${lines.join("\n")}` }] };
    }
    default:
      return { content: [{ type: "text", text: `未知工具: ${name}` }] };
  }
}

// ---- MCP Protocol Handler ----

async function handleRequest(request) {
  const { id, method, params } = request;

  try {
    switch (method) {
      case "initialize":
        send({
          jsonrpc: "2.0",
          id,
          result: {
            protocolVersion: "0.3.0",
            capabilities: { tools: {} },
            serverInfo: {
              name: "football-platform",
              version: "1.0.0",
              description: "世界杯/苏超赛事信息查询 Agent — 提供赛程、球队、积分榜、淘汰赛及评论数据。",
            },
          },
        });
        break;

      case "notifications/initialized":
        // No response needed for notifications
        break;

      case "tools/list":
        send({ jsonrpc: "2.0", id, result: { tools: TOOLS } });
        break;

      case "tools/call":
        const result = await handleToolCall(params.name, params.arguments || {});
        send({ jsonrpc: "2.0", id, result });
        break;

      case "ping":
        send({ jsonrpc: "2.0", id, result: {} });
        break;

      default:
        send({ jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } });
    }
  } catch (err) {
    log(`Error handling ${method}: ${err.message}`);
    send({ jsonrpc: "2.0", id, error: { code: -32603, message: err.message } });
  }
}

// ---- Main ----

const rl = createInterface({ input: process.stdin });

log("MCP Football Platform Server starting...");
log(`Backend API: ${API_URL}`);

rl.on("line", (line) => {
  if (!line.trim()) return;
  try {
    const request = JSON.parse(line);
    handleRequest(request);
  } catch (err) {
    log(`Parse error: ${err.message}`);
  }
});

rl.on("close", () => {
  log("Shutting down.");
  process.exit(0);
});
