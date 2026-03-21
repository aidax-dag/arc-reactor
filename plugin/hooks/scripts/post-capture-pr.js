#!/usr/bin/env node

/**
 * PostToolUse Hook (Bash: git push / gh pr) — PR URL 캡처
 *
 * git push 또는 gh pr create 실행 후, PR URL을 캡처하여
 * Vibranium에 업데이트합니다.
 */

const API_URL = process.env.VIBRANIUM_API_URL || '';
const API_KEY = process.env.VIBRANIUM_API_KEY || '';

async function main() {
  if (!API_URL || !API_KEY) return;

  let input = '';
  for await (const chunk of process.stdin) {
    input += chunk;
  }

  let parsed;
  try {
    parsed = JSON.parse(input);
  } catch {
    return;
  }

  const stdout = parsed.stdout || parsed.tool_output || '';

  // PR URL 패턴 감지: https://github.com/org/repo/pull/123
  const prMatch = stdout.match(/https:\/\/github\.com\/[^\s]+\/pull\/\d+/);
  if (!prMatch) return;

  const prUrl = prMatch[0];

  // Feature ID를 tracking 파일에서 읽기
  const fs = await import('node:fs');
  const trackingFile = '/tmp/arc-reactor-current-feature.json';

  let featureSlug = '';
  try {
    const data = JSON.parse(fs.readFileSync(trackingFile, 'utf-8'));
    featureSlug = data.featureSlug || '';
  } catch { /* no tracking file */ }

  if (!featureSlug) {
    console.log(`[Arc-Reactor] PR created: ${prUrl} (no feature tracking active)`);
    return;
  }

  // Vibranium에 PR URL 업데이트
  try {
    const res = await fetch(`${API_URL}/api/features/${featureSlug}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${API_KEY}`,
      },
      body: JSON.stringify({
        mergeUrl: prUrl,
        status: 'merged',
      }),
    });

    if (res.ok) {
      console.log(`[Arc-Reactor] Vibranium updated: ${featureSlug} → merged (${prUrl})`);
    } else {
      console.log(`[Arc-Reactor] Vibranium update failed for ${featureSlug}: ${res.status}`);
    }
  } catch (err) {
    console.log(`[Arc-Reactor] Vibranium update error: ${err}`);
  }
}

main();
