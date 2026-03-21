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
  'Bash(mkdir:*)',
  'Bash(node:*)',
  'Bash(npm:*)',
  'Bash(npx:*)',
  'Write(*.md)',
  'Write(*.txt)',
  'Write(*.json)',
  'Write(*.ts)',
  'Write(*.tsx)',
  'Write(*.js)',
  'Write(*.jsx)',
  'Write(*.css)',
  'Write(*.html)',
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
