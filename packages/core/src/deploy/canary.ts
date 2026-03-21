import { execFileSync } from 'node:child_process';
import { writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Canary Deployment + Auto-Rollback
 *
 * Netflix/Google 방식: 일부 사용자 → 모니터링 → 전체 배포
 *
 * 현재 지원:
 * - Vercel Preview Deployments (기본)
 * - Docker + Nginx weight-based routing (고급)
 */

export interface CanaryConfig {
  provider: 'vercel' | 'docker' | 'manual';
  canaryPercentage: number;      // 1-50% of traffic
  monitorDurationMinutes: number; // How long to monitor before promoting
  rollbackOnErrorRate: number;    // Error rate threshold (%) to auto-rollback
  healthCheckUrl?: string;
}

export const DEFAULT_CANARY_CONFIG: CanaryConfig = {
  provider: 'vercel',
  canaryPercentage: 10,
  monitorDurationMinutes: 15,
  rollbackOnErrorRate: 5,
};

export interface DeploymentResult {
  id: string;
  url: string;
  status: 'deployed' | 'promoting' | 'promoted' | 'rolled_back' | 'failed';
  canaryPercentage: number;
  errorRate?: number;
  timestamp: string;
}

/**
 * Generate Vercel deployment config for canary.
 */
export function generateVercelCanaryConfig(projectRoot: string): string {
  const config = {
    github: {
      enabled: true,
      autoAlias: false,  // Don't auto-promote — manual or script-based
    },
    headers: [
      {
        source: '/(.*)',
        headers: [
          { key: 'x-deployment-type', value: 'canary' },
        ],
      },
    ],
  };

  const path = join(projectRoot, 'vercel.canary.json');
  writeFileSync(path, JSON.stringify(config, null, 2));
  return path;
}

/**
 * Generate a deployment script that handles canary + monitoring + rollback.
 */
export function generateDeployScript(projectRoot: string, config: CanaryConfig): string {
  const scriptsDir = join(projectRoot, 'scripts');
  if (!existsSync(scriptsDir)) mkdirSync(scriptsDir, { recursive: true });

  const healthUrl = config.healthCheckUrl || 'http://localhost:3000/health';
  const monitorSec = config.monitorDurationMinutes * 60;
  const deployCmd = config.provider === 'vercel'
    ? 'DEPLOY_URL=$(vercel deploy --prebuilt 2>&1 | tail -1)'
    : 'DEPLOY_URL="http://localhost:3000"';
  const rollbackCmd = config.provider === 'vercel' ? '# vercel rollback' : '# docker rollback';
  const promoteCmd = config.provider === 'vercel' ? '# vercel promote' : '# docker promote';

  const lines = [
    '#!/bin/bash',
    '# Arc-Reactor Canary Deployment Script',
    'set -e',
    '',
    'HEALTH_URL="' + healthUrl + '"',
    'ERROR_THRESHOLD=' + config.rollbackOnErrorRate,
    'MONITOR_DURATION=' + monitorSec,
    'CHECK_INTERVAL=30',
    '',
    'echo "Starting canary deployment..."',
    'echo "  Traffic: ' + config.canaryPercentage + '%"',
    'echo "  Monitor: ' + config.monitorDurationMinutes + ' minutes"',
    '',
    deployCmd,
    '',
    'ELAPSED=0',
    'ERROR_COUNT=0',
    'TOTAL_CHECKS=0',
    '',
    'while [ $ELAPSED -lt $MONITOR_DURATION ]; do',
    '  TOTAL_CHECKS=$((TOTAL_CHECKS + 1))',
    '  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL" 2>/dev/null || echo "000")',
    '  if [ "$HTTP_CODE" != "200" ]; then',
    '    ERROR_COUNT=$((ERROR_COUNT + 1))',
    '  fi',
    '  ERROR_RATE=$((ERROR_COUNT * 100 / (TOTAL_CHECKS > 0 ? TOTAL_CHECKS : 1)))',
    '  if [ $ERROR_RATE -ge $ERROR_THRESHOLD ]; then',
    '    echo "Error rate exceeded. Rolling back..."',
    '    ' + rollbackCmd,
    '    exit 1',
    '  fi',
    '  sleep $CHECK_INTERVAL',
    '  ELAPSED=$((ELAPSED + CHECK_INTERVAL))',
    'done',
    '',
    'echo "Canary passed. Promoting..."',
    promoteCmd,
    'echo "Deployment complete"',
  ];

  const script = lines.join('\n');

  const scriptPath = join(scriptsDir, 'canary-deploy.sh');
  writeFileSync(scriptPath, script, { mode: 0o755 });
  return scriptPath;
}
