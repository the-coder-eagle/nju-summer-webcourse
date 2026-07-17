/**
 * Environment variable check script.
 * Usage: node scripts/check-env.mjs
 */
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");

console.log("Checking environment...\n");

function checkPort(name, def) {
  const v = process.env[name] || def;
  const p = parseInt(v, 10);
  if (isNaN(p) || p < 1 || p > 65535) { console.error("FAIL " + name + "=" + v); process.exitCode = 1; }
  else console.log("OK " + name + "=" + v);
}

function checkFile(name, def) {
  const v = process.env[name] || def;
  const ap = resolve(ROOT, v);
  if (existsSync(ap)) console.log("OK " + name + "=" + v);
  else console.log("WARN " + name + "=" + v + " (will be created)");
}

checkPort("FRONTEND_PORT", "3000");
checkPort("BACKEND_PORT", "7001");

const bu = process.env.BACKEND_INTERNAL_URL || "http://localhost:7001";
try { new URL(bu); console.log("OK BACKEND_INTERNAL_URL=" + bu); }
catch { console.error("FAIL BACKEND_INTERNAL_URL=" + bu); process.exitCode = 1; }

checkFile("DATABASE_PATH", "./data/course-demo.sqlite");
checkFile("FOOTBALL_DATABASE_PATH", "./data/football.sqlite");

if (process.env.NODE_ENV === "production" && (process.env.KOA_KEYS || "").includes("development"))
  console.warn("WARN: development KOA_KEYS in production!");

console.log(process.exitCode ? "\nFAIL" : "\nOK All valid.");
process.exit(process.exitCode || 0);
