#!/usr/bin/env node

/**
 * Stop Hook — 세션 종료 시 Vibranium에 Feature 최종 동기화
 *
 * 세션 중 생성된 Feature들을 배치로 Vibranium에 등록/업데이트합니다.
 * - 새로 생성된 Feature → vibranium_create (status: registered)
 * - 구현이 완료된 Feature → vibranium_update (status: implementing → merged)
 */

const API_URL = process.env.VIBRANIUM_API_URL || '';
const API_KEY = process.env.VIBRANIUM_API_KEY || '';

async function main() {
  if (!API_URL || !API_KEY) return;

  const fs = await import('node:fs');

  // 생성된 파일 목록 읽기
  const trackingFile = '/tmp/arc-reactor-generated-files.json';
  let generatedFiles = [];
  try {
    generatedFiles = JSON.parse(fs.readFileSync(trackingFile, 'utf-8'));
  } catch { /* no files tracked */ }

  // 현재 Feature 정보 읽기
  const featureFile = '/tmp/arc-reactor-current-feature.json';
  let featureData = null;
  try {
    featureData = JSON.parse(fs.readFileSync(featureFile, 'utf-8'));
  } catch { /* no feature tracking */ }

  if (generatedFiles.length > 0) {
    console.log(`[Arc-Reactor] Session generated ${generatedFiles.length} files.`);
  }

  if (featureData?.featureSlug) {
    // Feature 상태 업데이트
    try {
      const res = await fetch(`${API_URL}/api/features/${featureData.featureSlug}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
        body: JSON.stringify({
          status: featureData.prUrl ? 'merged' : 'implementing',
        }),
      });

      if (res.ok) {
        const status = featureData.prUrl ? 'merged' : 'implementing';
        console.log(`[Arc-Reactor] Vibranium synced: ${featureData.featureSlug} → ${status}`);
      }
    } catch {
      console.log(`[Arc-Reactor] Vibranium sync failed for ${featureData.featureSlug}`);
    }
  }

  // 트래킹 파일 정리
  try { fs.unlinkSync(trackingFile); } catch { /* ok */ }
  try { fs.unlinkSync(featureFile); } catch { /* ok */ }
}

main();
