#!/usr/bin/env node

/**
 * SessionStart Hook — Vibranium 연결 확인
 * Vibranium API가 접근 가능한지 확인하고, 상태를 출력합니다.
 */

const API_URL = process.env.VIBRANIUM_API_URL || '';
const API_KEY = process.env.VIBRANIUM_API_KEY || '';

async function main() {
  if (!API_URL) {
    console.log('[Arc-Reactor] Vibranium not configured. Set VIBRANIUM_API_URL to enable feature reuse.');
    return;
  }

  try {
    const res = await fetch(`${API_URL}/health`, { signal: AbortSignal.timeout(5000) });
    if (res.ok) {
      const auth = API_KEY ? 'authenticated' : 'read-only (no API key)';
      console.log(`[Arc-Reactor] Vibranium connected (${auth}). Feature search & reuse enabled.`);
    } else {
      console.log(`[Arc-Reactor] Vibranium API responded with ${res.status}. Feature reuse may be limited.`);
    }
  } catch {
    console.log('[Arc-Reactor] Vibranium API unreachable. Proceeding without feature reuse.');
  }
}

main();
