#!/usr/bin/env node
/**
 * Send a useful production-update summary to Telegram admin chats.
 *
 * Usage:
 *   node scripts/telegram-deploy-notify.mjs
 *   node scripts/telegram-deploy-notify.mjs --app all --lines "الرت کوپن فوری" "قطع خلاصه سبد ۵دقیقه"
 *   node scripts/telegram-deploy-notify.mjs --since abc1234
 *   node scripts/telegram-deploy-notify.mjs --write-changelog-only
 *
 * Env:
 *   CRON_SECRET
 *   TELEGRAM_DEPLOY_NOTIFY_URL  (default https://admin.hajiasal.ir/api/cron/telegram-deploy-notify)
 *   APP_ROLE / DEPLOY_APP
 *   DEPLOY_CHANGELOG_FILE       optional text file (one bullet per line)
 *   DEPLOY_SUMMARY              optional; newlines or " | " separated Persian bullets
 */
import { execSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const STATE_FILE = join(ROOT, "data", "telegram-last-deploy-sha.txt");
const DEFAULT_CHANGELOG = join(ROOT, "data", "deploy-changelog.txt");

function argValue(flag) {
  const i = process.argv.indexOf(flag);
  if (i === -1) return null;
  return process.argv[i + 1] ?? null;
}

function hasFlag(flag) {
  return process.argv.includes(flag);
}

function collectLinesFlag() {
  const i = process.argv.indexOf("--lines");
  if (i === -1) return [];
  return process.argv.slice(i + 1).filter((a) => !a.startsWith("--"));
}

function sh(cmd) {
  try {
    return execSync(cmd, {
      cwd: ROOT,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

function gitSha() {
  return sh("git rev-parse --short HEAD") || undefined;
}

function readLastSha() {
  try {
    if (!existsSync(STATE_FILE)) return "";
    return readFileSync(STATE_FILE, "utf8").trim();
  } catch {
    return "";
  }
}

function writeLastSha(sha) {
  if (!sha) return;
  try {
    mkdirSync(dirname(STATE_FILE), { recursive: true });
    writeFileSync(STATE_FILE, `${sha}\n`, "utf8");
  } catch {
    /* ignore */
  }
}

function readChangelogFile(path) {
  if (!path || !existsSync(path)) return [];
  try {
    return readFileSync(path, "utf8")
      .split(/\r?\n/)
      .map((l) => l.replace(/^[-•*\s]+/, "").trim())
      .filter(Boolean)
      .slice(0, 20);
  } catch {
    return [];
  }
}

function writeChangelogFile(path, lines) {
  if (!path || !lines.length) return;
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(
      path,
      `${lines.map((l) => `- ${l}`).join("\n")}\n`,
      "utf8",
    );
  } catch {
    /* ignore */
  }
}

function envSummaryLines() {
  const raw = (process.env.DEPLOY_SUMMARY ?? "").trim();
  if (!raw) return [];
  return raw
    .split(/\r?\n|\s*\|\s*/)
    .map((l) => l.replace(/^[-•*\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 20);
}

/** Path → Persian action phrase (not vague "سایر"). */
function categorizePaths(paths) {
  const buckets = new Map();
  const add = (label, weight = 1) => {
    buckets.set(label, (buckets.get(label) ?? 0) + weight);
  };

  for (const raw of paths) {
    const p = raw.replace(/\\/g, "/");
    if (!p || p.startsWith("node_modules/") || p.startsWith(".next/")) continue;
    if (
      p.includes("telegram") ||
      p.includes("TELEGRAM") ||
      p.includes("telegram-relay") ||
      p.includes("telegram-deploy")
    ) {
      add("ربات تلگرام و اعلان‌های ادمین", 4);
    } else if (p.includes("/coupon") || p.includes("coupons")) {
      add("کد تخفیف و کوپن", 3);
    } else if (
      p.includes("checkout") ||
      p.includes("snappay") ||
      p.includes("zibal") ||
      p.includes("payment")
    ) {
      add("پرداخت و تسویه حساب", 3);
    } else if (
      p.includes("/cart") ||
      p.includes("order-stock") ||
      p.includes("order-pricing")
    ) {
      add("سبد خرید و ثبت سفارش", 2);
    } else if (p.includes("/auth") || p.includes("otp")) {
      add("ورود و احراز هویت", 2);
    } else if (p.includes("/ticket") || p.includes("support")) {
      add("پشتیبانی و تیکت", 2);
    } else if (p.includes("/admin")) {
      add("پنل ادمین", 2);
    } else if (p.includes("/seller")) {
      add("پنل فروشنده", 2);
    } else if (p.includes("/account")) {
      add("حساب کاربری مشتری", 1);
    } else if (
      p.includes("/product") ||
      p.includes("inventory") ||
      p.includes("products")
    ) {
      add("محصولات و انبار", 2);
    } else if (
      p.includes("e2e/") ||
      p.includes(".test.") ||
      p.includes("/tests/")
    ) {
      add("تست‌های خودکار", 1);
    } else if (p.includes("docs/") || p.endsWith(".md")) {
      add("مستندات عملیاتی", 1);
    } else if (p.includes("scripts/") || p.includes("cpanel-deploy")) {
      add("اسکریپت دیپلوی و هاست", 1);
    } else if (
      p.includes("public/") ||
      p.includes("fonts/") ||
      p.includes("images/")
    ) {
      add("فایل‌های استاتیک / ظاهر", 1);
    } else if (p.includes(".env") || p.includes("ENV-SETUP")) {
      add("پیکربندی محیطی", 2);
    } else {
      add("به‌روزرسانی کد فروشگاه", 1);
    }
  }

  return [...buckets.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([label, count]) => ({ label, count }));
}

function gitChangedPaths(sinceSha) {
  if (sinceSha) {
    const range = sh(`git diff --name-only ${sinceSha}..HEAD`);
    if (range) return range.split(/\r?\n/).filter(Boolean);
  }
  // No prior deploy marker: only this commit (not a huge window).
  const one = sh("git diff --name-only HEAD~1..HEAD");
  if (one) return one.split(/\r?\n/).filter(Boolean);
  const staged = sh("git show --pretty=format: --name-only --no-renames HEAD");
  return staged ? staged.split(/\r?\n/).filter(Boolean) : [];
}

function translateCommitSubject(subject) {
  let s = subject.trim();
  s = s.replace(/^feat(\([^)]*\))?:\s*/i, "قابلیت: ");
  s = s.replace(/^fix(\([^)]*\))?:\s*/i, "رفع باگ: ");
  s = s.replace(/^chore(\([^)]*\))?:\s*/i, "نگهداری: ");
  s = s.replace(/^docs(\([^)]*\))?:\s*/i, "مستندات: ");
  s = s.replace(/^refactor(\([^)]*\))?:\s*/i, "بازنویسی: ");
  s = s.replace(/^test(\([^)]*\))?:\s*/i, "تست: ");
  s = s.replace(/^perf(\([^)]*\))?:\s*/i, "عملکرد: ");
  return s.slice(0, 160);
}

function gitCommitSubjects(sinceSha, limit = 3) {
  const cmd = sinceSha
    ? `git log --pretty=format:%s ${sinceSha}..HEAD`
    : `git log -1 --pretty=format:%s`;
  const out = sh(cmd);
  if (!out) return [];
  return out
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^merge /i.test(s))
    .map(translateCommitSubject)
    .slice(0, limit);
}

function looksMostlyPersian(text) {
  const persian = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[A-Za-z]/g) || []).length;
  return persian >= 3 && persian >= latin;
}

function versionEquals(a, b) {
  if (!a || !b) return false;
  return a.replace(/^v/, "") === b.replace(/^v/, "");
}

/**
 * Prefer explicit human lines; otherwise build Persian bullets from git or file.
 * Always avoid empty / English-only "git missing" walls of noise.
 */
function buildUsefulSummary({ sinceSha, manualLines, changelogFile }) {
  if (manualLines.length > 0) return manualLines.slice(0, 20);

  const fromEnv = envSummaryLines();
  if (fromEnv.length > 0) return fromEnv;

  const fromFile = readChangelogFile(changelogFile);
  // Prefer non-placeholder changelog
  const usefulFile = fromFile.filter(
    (l) =>
      !/مخزن git روی هاست/i.test(l) &&
      !/جزئیات ثبت نشد/i.test(l) &&
      !/^دیپلوی اعمال شد/i.test(l),
  );
  if (usefulFile.length > 0) return usefulFile.slice(0, 20);

  const hasGit = Boolean(sh("git rev-parse --is-inside-work-tree"));
  if (!hasGit) {
    if (fromFile.length > 0) return fromFile.slice(0, 20);
    return [
      "ساخت و ری‌استارت پروداکشن اعمال شد",
      "برای خلاصه دقیق، قبل از آپلود روی ماشین توسعه: node scripts/telegram-deploy-notify.mjs --write-changelog-only",
    ];
  }

  const paths = gitChangedPaths(sinceSha);
  const cats = categorizePaths(paths);
  const commits = gitCommitSubjects(sinceSha, 4);
  const lines = [];

  if (sinceSha && versionEquals(sinceSha, gitSha()) && commits.length === 0) {
    return [
      "ری‌استارت / دیپلوی مجدد همان نسخه (تغییر کد جدید نبود)",
      `نسخه: ${sinceSha}`,
    ];
  }

  for (const { label, count } of cats) {
    lines.push(
      count > 1 ? `${label} (${count} فایل)` : label,
    );
  }
  // Only add commit subjects if Persian (or already translated prefix) —
  // English walls of text were the "خلاصه بد" complaint.
  for (const c of commits) {
    if (!looksMostlyPersian(c) && !/^(قابلیت|رفع باگ|نگهداری|مستندات|بازنویسی|تست|عملکرد):/.test(c)) {
      continue;
    }
    if (lines.some((l) => l.includes(c.slice(0, 24)))) continue;
    lines.push(c);
  }
  if (paths.length > 0 && cats.length === 0) {
    lines.push(`${paths.length} فایل در این دیپلوی تغییر کرده`);
  }

  if (lines.length === 0) {
    lines.push("دیپلوی اعمال شد (تغییر قابل‌تشخیص در git نبود)");
  }
  return lines.slice(0, 10);
}

const writeOnly = hasFlag("--write-changelog-only");
const secret = process.env.CRON_SECRET?.trim();
const url = (
  process.env.TELEGRAM_DEPLOY_NOTIFY_URL ||
  "https://admin.hajiasal.ir/api/cron/telegram-deploy-notify"
).trim();

const app =
  argValue("--app") ||
  process.env.APP_ROLE?.trim() ||
  process.env.DEPLOY_APP ||
  "all";
const title = argValue("--title") || "آپدیت پروداکشن حاجی‌عسل";
const manual = collectLinesFlag();
const changelogFile =
  argValue("--changelog-file") ||
  process.env.DEPLOY_CHANGELOG_FILE?.trim() ||
  DEFAULT_CHANGELOG;
const sinceArg = argValue("--since");
const lastSha = sinceArg || readLastSha();
const version = argValue("--version") || gitSha();

const summaryLines = buildUsefulSummary({
  sinceSha: lastSha,
  manualLines: manual,
  changelogFile,
});

// Always refresh changelog so host uploads (often without .git) still have Persian bullets.
writeChangelogFile(changelogFile, summaryLines);
console.log("[telegram-deploy-notify] changelog →", changelogFile);
console.log("[telegram-deploy-notify] lines:", summaryLines.join(" | "));

if (writeOnly) {
  process.exit(0);
}

if (!secret) {
  console.error(
    "[telegram-deploy-notify] CRON_SECRET missing — changelog written, notify skipped",
  );
  process.exit(0);
}

const body = {
  title,
  app,
  version,
  source: "scripts/telegram-deploy-notify.mjs",
  summaryLines,
};

try {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  console.log("[telegram-deploy-notify]", res.status, text.slice(0, 500));

  if (res.ok) {
    let sent = true;
    try {
      const json = JSON.parse(text);
      if (json && json.sent === false) sent = false;
    } catch {
      /* text body */
    }
    if (sent && version) writeLastSha(version);
  } else {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(
    "[telegram-deploy-notify] failed:",
    error instanceof Error ? error.message : error,
  );
  // Never fail the whole deploy because of Telegram
  process.exit(0);
}
