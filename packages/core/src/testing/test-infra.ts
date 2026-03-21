import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { ExecutionPlan } from '../types/task.js';

/**
 * Test Infrastructure Auto-Setup
 *
 * Microsoft/Google 방식: 테스트를 작성하는 것이 아니라
 * 테스트를 실행할 수 있는 **인프라**를 자동으로 구성합니다.
 *
 * - Docker 기반 테스트 환경 (docker-compose.test.yml)
 * - CI/CD 파이프라인 (GitHub Actions)
 * - 테스트 리포트 자동 생성 설정
 */

export function generateTestInfra(projectRoot: string, plan: ExecutionPlan): string[] {
  const created: string[] = [];
  const teams = [...new Set(plan.tasks.map(t => t.team))];
  const hasBackend = teams.includes('backend');
  const hasFrontend = teams.includes('frontend');

  // 1. Docker Compose for test environment
  if (hasBackend) {
    const dockerCompose = [
      'services:',
      '  test-db:',
      '    image: postgres:16-alpine',
      '    environment:',
      '      POSTGRES_DB: test_db',
      '      POSTGRES_USER: test',
      '      POSTGRES_PASSWORD: test',
      '    ports:',
      '      - "5434:5432"',
      '    tmpfs:',
      '      - /var/lib/postgresql/data  # RAM disk for speed',
      '',
      '  test-redis:',
      '    image: redis:7-alpine',
      '    ports:',
      '      - "6380:6379"',
    ].join('\n');

    const path = join(projectRoot, 'docker-compose.test.yml');
    if (!existsSync(path)) {
      writeFileSync(path, dockerCompose);
      created.push('docker-compose.test.yml');
    }
  }

  // 2. GitHub Actions CI pipeline
  const ciDir = join(projectRoot, '.github', 'workflows');
  const ciPath = join(ciDir, 'ci.yml');
  if (!existsSync(ciPath)) {
    mkdirSync(ciDir, { recursive: true });

    const ci = [
      'name: CI',
      'on:',
      '  push:',
      '    branches: [main]',
      '  pull_request:',
      '    branches: [main]',
      '',
      'jobs:',
      '  test:',
      '    runs-on: ubuntu-latest',
      hasBackend ? '    services:\n      postgres:\n        image: postgres:16-alpine\n        env:\n          POSTGRES_DB: test_db\n          POSTGRES_USER: test\n          POSTGRES_PASSWORD: test\n        ports:\n          - 5432:5432\n        options: >-\n          --health-cmd pg_isready\n          --health-interval 10s\n          --health-timeout 5s\n          --health-retries 5' : '',
      '    steps:',
      '      - uses: actions/checkout@v4',
      '      - uses: actions/setup-node@v4',
      '        with:',
      '          node-version: 22',
      '          cache: npm',
      '      - run: npm ci',
      '      - run: npm run build',
      '      - run: npm test',
      hasFrontend ? '      - run: npx playwright install --with-deps\n      - run: npx playwright test' : '',
    ].filter(Boolean).join('\n');

    writeFileSync(ciPath, ci);
    created.push('.github/workflows/ci.yml');
  }

  return created;
}
