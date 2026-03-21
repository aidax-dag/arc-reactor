#!/usr/bin/env node

/**
 * UserPromptSubmit Hook — 사용자 입력에서 키워드를 추출하여 Vibranium 자동 검색
 * 결과가 있으면 CEO Agent에게 재활용 가능한 Feature 정보를 주입합니다.
 */

const API_URL = process.env.VIBRANIUM_API_URL || '';

async function main() {
  if (!API_URL) return;

  // 사용자 입력은 stdin으로 전달됨
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

  const userPrompt = parsed.prompt || parsed.content || '';
  if (!userPrompt || userPrompt.length < 5) return;

  // 키워드 추출: 단순하게 주요 단어 사용
  const keywords = userPrompt
    .replace(/[^a-zA-Z0-9가-힣\s]/g, '')
    .split(/\s+/)
    .filter((w) => w.length > 2)
    .slice(0, 5)
    .join(' ');

  if (!keywords) return;

  try {
    // Planning type features 검색
    const planningRes = await fetch(
      `${API_URL}/api/features/search?q=${encodeURIComponent(keywords)}&type=planning&limit=5`,
      { signal: AbortSignal.timeout(5000) }
    );

    // Dev type features 검색
    const devRes = await fetch(
      `${API_URL}/api/features/search?q=${encodeURIComponent(keywords)}&type=dev&status=reusable&limit=5`,
      { signal: AbortSignal.timeout(5000) }
    );

    const planningData = planningRes.ok ? await planningRes.json() : { features: [] };
    const devData = devRes.ok ? await devRes.json() : { features: [] };

    const planningFeatures = planningData.features || [];
    const devFeatures = devData.features || [];

    if (planningFeatures.length === 0 && devFeatures.length === 0) return;

    // 결과를 시스템 메시지로 출력 (Claude에게 주입됨)
    let message = '\n[Vibranium] Reusable features found:\n';

    if (planningFeatures.length > 0) {
      message += '\n📋 Planning Features:\n';
      for (const f of planningFeatures) {
        const impl = f.hasImplementation ? ' 💻' : '';
        message += `  - ${f.name} (${f.slug}) v${f.version} — ${f.useCount} uses${impl}\n`;
        message += `    ${f.description}\n`;
      }
    }

    if (devFeatures.length > 0) {
      message += '\n🔧 Reusable Implementation Features:\n';
      for (const f of devFeatures) {
        const link = f.mergeUrl ? ` → ${f.mergeUrl}` : '';
        message += `  - ${f.name} (${f.slug}) v${f.version}${link}\n`;
        message += `    ${f.description}\n`;
      }
    }

    message += '\nConsider reusing these features. Use vibranium_get(slug) for full specs.\n';

    console.log(message);
  } catch {
    // Vibranium 검색 실패 시 조용히 진행
  }
}

main();
