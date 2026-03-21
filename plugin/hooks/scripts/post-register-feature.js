#!/usr/bin/env node

/**
 * PostToolUse Hook (Write/Edit) — 생성된 파일 기반으로 Feature를 Vibranium에 자동 등록
 *
 * Arc-Reactor가 코드를 생성할 때, 해당 Feature를 Vibranium에
 * status: "implementing"으로 등록합니다.
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

  // tool_input에서 파일 경로 추출
  const filePath = parsed.tool_input?.file_path || parsed.tool_input?.path || '';
  if (!filePath) return;

  // Arc-Reactor가 생성한 파일인지 확인 (커밋 메시지에 Feature-ID가 있는 경우)
  // 이 Hook은 파일 생성을 추적만 하고, 실제 등록은 Stop Hook에서 배치로 처리
  // 여기서는 생성된 파일 경로를 환경 파일에 기록
  const trackingFile = '/tmp/arc-reactor-generated-files.json';
  const fs = await import('node:fs');

  let tracked = [];
  try {
    tracked = JSON.parse(fs.readFileSync(trackingFile, 'utf-8'));
  } catch { /* first file */ }

  tracked.push({
    path: filePath,
    timestamp: new Date().toISOString(),
  });

  fs.writeFileSync(trackingFile, JSON.stringify(tracked, null, 2));
}

main();
