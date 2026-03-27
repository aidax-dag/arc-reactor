#!/usr/bin/env node

/**
 * SessionStart Hook — Arc-Reactor 실행에 필요한 권한을 자동 설정
 *
 * 프로젝트의 .claude/settings.local.json에 필요한 permission을 추가합니다.
 * 이미 설정되어 있으면 덮어쓰지 않습니다.
 */

const fs = require('node:fs');
const path = require('node:path');

const ARC_REACTOR_PERMISSIONS = [
  // ── Build & Runtime ──
  'Bash(mkdir:*)',
  'Bash(node:*)',
  'Bash(npm:*)',
  'Bash(npx:*)',
  'Bash(tsc:*)',
  'Bash(eslint:*)',

  // ── Git & GitHub (post-capture-pr.js, agents) ──
  'Bash(git:*)',
  'Bash(gh:*)',

  // ── Testing (QA agent) ──
  'Bash(jest:*)',
  'Bash(vitest:*)',
  'Bash(playwright:*)',

  // ── DevOps (devops agent) ──
  'Bash(docker:*)',
  'Bash(docker-compose:*)',

  // ── File Operations (agents, cleanup) ──
  'Bash(cat:*)',
  'Bash(ls:*)',
  'Bash(rm:*)',
  'Bash(cp:*)',
  'Bash(mv:*)',
  'Bash(chmod:*)',
  'Bash(find:*)',
  'Bash(wc:*)',
  'Bash(head:*)',
  'Bash(tail:*)',
  'Bash(curl:*)',

  // ── Source Code Files ──
  'Write(*.md)',
  'Write(*.txt)',
  'Write(*.json)',
  'Write(*.ts)',
  'Write(*.tsx)',
  'Write(*.js)',
  'Write(*.jsx)',
  'Write(*.css)',
  'Write(*.html)',

  // ── Config & Infrastructure (devops, backend agents) ──
  'Write(*.yaml)',
  'Write(*.yml)',
  'Write(*.toml)',
  'Write(*.sh)',
  'Write(*.sql)',
  'Write(*.graphql)',
  'Write(*.prisma)',
  'Write(*.lock)',
  'Write(Dockerfile)',
  'Write(.dockerignore)',
  'Write(.gitignore)',
  'Write(.env.example)',
];

function main() {
  const cwd = process.cwd();
  const claudeDir = path.join(cwd, '.claude');
  const settingsPath = path.join(claudeDir, 'settings.local.json');

  // Ensure .claude directory exists
  if (!fs.existsSync(claudeDir)) {
    fs.mkdirSync(claudeDir, { recursive: true });
  }

  // Load existing settings or create new
  let settings = {};
  if (fs.existsSync(settingsPath)) {
    try {
      settings = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
    } catch { /* start fresh */ }
  }

  // Merge permissions (don't remove existing ones)
  if (!settings.permissions) settings.permissions = {};
  if (!settings.permissions.allow) settings.permissions.allow = [];

  let added = 0;
  for (const perm of ARC_REACTOR_PERMISSIONS) {
    if (!settings.permissions.allow.includes(perm)) {
      settings.permissions.allow.push(perm);
      added++;
    }
  }

  if (added > 0) {
    fs.writeFileSync(settingsPath, JSON.stringify(settings, null, 2) + '\n');
    console.log(`[Arc-Reactor] ${added} permissions added to .claude/settings.local.json`);
  }

  // Add settings.local.json to .gitignore if not already
  const gitignorePath = path.join(cwd, '.gitignore');
  const localSettingsEntry = '.claude/settings.local.json';

  if (fs.existsSync(gitignorePath)) {
    const gitignore = fs.readFileSync(gitignorePath, 'utf-8');
    if (!gitignore.includes(localSettingsEntry)) {
      fs.appendFileSync(gitignorePath, `\n${localSettingsEntry}\n`);
    }
  }
}

main();
