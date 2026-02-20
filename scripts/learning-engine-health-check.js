/**
 * learning-engine-health-check.js — Verify Learning Engine build integrity.
 *
 * Checks:
 * 1. All expected files exist
 * 2. Key exports are present (no broken imports)
 * 3. Firestore rules cover stats/ and alerts/
 * 4. vercel.json has cron config
 * 5. No TODO/FIXME left in learning engine files
 *
 * Run: node scripts/learning-engine-health-check.js
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = resolve(__dirname, '..');

let totalChecks = 0;
let passed = 0;
let failed = 0;
const failures = [];

function check(label, condition) {
  totalChecks++;
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    failures.push(label);
    console.log(`  ❌ ${label}`);
  }
}

function fileExists(relPath) {
  return existsSync(resolve(ROOT, relPath));
}

function fileContains(relPath, pattern) {
  if (!fileExists(relPath)) return false;
  const content = readFileSync(resolve(ROOT, relPath), 'utf-8');
  if (typeof pattern === 'string') return content.includes(pattern);
  return pattern.test(content);
}

// ═══════════════════════════════════════════════════════════════
// CHECKS
// ═══════════════════════════════════════════════════════════════

console.log('\n🧠 LEARNING ENGINE HEALTH CHECK\n');
console.log('── Phase 1: Foundation Files ──');
check('fieldMap.js exists', fileExists('src/services/learningEngine/fieldMap.js'));
check('constants.js exists', fileExists('src/services/learningEngine/constants.js'));
check('stats.js exists', fileExists('src/services/learningEngine/stats.js'));
check('backfill.js exists', fileExists('api/learning-engine/backfill.js'));
check('fieldMap exports getCropKey', fileContains('src/services/learningEngine/fieldMap.js', 'export function getCropKey'));
check('fieldMap exports getCustomerKey', fileContains('src/services/learningEngine/fieldMap.js', 'export function getCustomerKey'));
check('constants exports FARM_ID', fileContains('src/services/learningEngine/constants.js', 'FARM_ID'));
check('stats exports welfordUpdate', fileContains('src/services/learningEngine/stats.js', 'export function welfordUpdate'));
check('stats exports updateEWMA', fileContains('src/services/learningEngine/stats.js', 'export function updateEWMA'));
check('stats exports applyBiasCorrection', fileContains('src/services/learningEngine/stats.js', 'export function applyBiasCorrection'));
check('stats exports calculateProductionBuffer', fileContains('src/services/learningEngine/stats.js', 'export function calculateProductionBuffer'));

console.log('\n── Phase 2: API Routes ──');
check('on-order-create.js exists', fileExists('api/learning-engine/on-order-create.js'));
check('on-harvest-create.js exists', fileExists('api/learning-engine/on-harvest-create.js'));
check('dismiss-alert.js exists', fileExists('api/learning-engine/dismiss-alert.js'));
check('on-order-create has Welford', fileContains('api/learning-engine/on-order-create.js', 'welfordUpdate'));
check('on-order-create has EWMA', fileContains('api/learning-engine/on-order-create.js', 'updateEWMA'));
check('on-order-create has anomaly check', fileContains('api/learning-engine/on-order-create.js', 'checkOrderAnomaly'));
check('on-order-create has bias correction', fileContains('api/learning-engine/on-order-create.js', 'applyBiasCorrection'));
check('on-harvest-create has yield tracking', fileContains('api/learning-engine/on-harvest-create.js', 'yieldMean'));

console.log('\n── Phase 2: Alert UI ──');
check('AlertsBadge.jsx exists', fileExists('src/components/Alerts/AlertsBadge.jsx'));
check('AlertsList.jsx exists', fileExists('src/components/Alerts/AlertsList.jsx'));
check('Layout imports AlertsBadge', fileContains('src/components/Layout.jsx', 'AlertsBadge'));
check('AppRoutes has alerts route', fileContains('src/components/AppRoutes.jsx', 'alerts'));

console.log('\n── Phase 3: Nightly + Hooks + UI Integration ──');
check('nightly-stats.js exists', fileExists('api/learning-engine/nightly-stats.js'));
check('nightly-stats has confidence', fileContains('api/learning-engine/nightly-stats.js', 'calculateConfidence'));
check('nightly-stats has trend', fileContains('api/learning-engine/nightly-stats.js', 'getTrend'));
check('nightly-stats has bias correction', fileContains('api/learning-engine/nightly-stats.js', 'applyBiasCorrection'));
check('nightly-stats writes dashboard', fileContains('api/learning-engine/nightly-stats.js', 'dashboard'));
check('nightly-stats has avgMAPE', fileContains('api/learning-engine/nightly-stats.js', 'avgMAPE'));
check('nightly-stats has avgConfidence', fileContains('api/learning-engine/nightly-stats.js', 'avgConfidence'));
check('useLearningEngine.js exists', fileExists('src/hooks/useLearningEngine.js'));
check('hook: useLearningDashboard', fileContains('src/hooks/useLearningEngine.js', 'export function useLearningDashboard'));
check('hook: useCustomerStats', fileContains('src/hooks/useLearningEngine.js', 'export function useCustomerStats'));
check('hook: useAlertCount', fileContains('src/hooks/useLearningEngine.js', 'export function useAlertCount'));
check('hook: useOrderAnomalyAlerts', fileContains('src/hooks/useLearningEngine.js', 'export function useOrderAnomalyAlerts'));
check('hook: useYieldProfiles', fileContains('src/hooks/useLearningEngine.js', 'export function useYieldProfiles'));
check('OrderBoard imports useOrderAnomalyAlerts', fileContains('src/components/orders/OrderFulfillmentBoard.jsx', 'useOrderAnomalyAlerts'));
check('OrderBoard shows anomaly warning', fileContains('src/components/orders/OrderFulfillmentBoard.jsx', 'anomalyAlert'));
check('SowingCalculator imports Learning Engine', fileContains('src/components/SowingCalculator.jsx', 'useAllCustomerCropStats'));
check('SowingCalculator has EWMA demand', fileContains('src/components/SowingCalculator.jsx', 'EWMA demand'));
check('SowingCalculator has buffer suggestion', fileContains('src/components/SowingCalculator.jsx', 'Yield data suggests'));
check('CustomerManager imports Learning Engine', fileContains('src/components/CustomerManager.jsx', 'useAllCustomerCropStats'));
check('CustomerManager has ordering intelligence', fileContains('src/components/CustomerManager.jsx', 'Ordering Intelligence'));
check('Dashboard imports Learning Engine', fileContains('src/components/Dashboard.jsx', 'useLearningDashboard'));
check('Dashboard has Learning Engine card', fileContains('src/components/Dashboard.jsx', 'Learning Engine'));

console.log('\n── Phase 4: Feedback Loop ──');
check('TrustBadge.jsx exists', fileExists('src/components/ui/TrustBadge.jsx'));
check('TrustBadge has tier logic', fileContains('src/components/ui/TrustBadge.jsx', 'getTier'));
check('TrustBadge has verified tier', fileContains('src/components/ui/TrustBadge.jsx', 'verified'));
check('CustomerManager imports TrustBadge', fileContains('src/components/CustomerManager.jsx', 'TrustBadge'));
check('SowingCalculator imports TrustBadge', fileContains('src/components/SowingCalculator.jsx', 'TrustBadge'));
check('SowingCalculator stores ewmaPredictedQty', fileContains('src/components/SowingCalculator.jsx', 'ewmaPredictedQty'));
check('on-order-create has adjustedEwma', fileContains('api/learning-engine/on-order-create.js', 'adjustedEwma'));

console.log('\n── Infrastructure ──');
check('Firestore rules cover stats/', fileContains('firestore.rules', 'stats'));
check('Firestore rules cover alerts/', fileContains('firestore.rules', 'alerts'));
check('vercel.json has cron config', fileContains('vercel.json', 'crons'));
check('vercel.json has nightly-stats schedule', fileContains('vercel.json', 'nightly-stats'));
check('LEARNING_ENGINE_BUILD_LOG.md exists', fileExists('LEARNING_ENGINE_BUILD_LOG.md'));

console.log('\n── No TODOs/FIXMEs in Learning Engine ──');
const leFiles = [
  'src/services/learningEngine/fieldMap.js',
  'src/services/learningEngine/constants.js',
  'src/services/learningEngine/stats.js',
  'api/learning-engine/backfill.js',
  'api/learning-engine/on-order-create.js',
  'api/learning-engine/on-harvest-create.js',
  'api/learning-engine/dismiss-alert.js',
  'api/learning-engine/nightly-stats.js',
  'src/hooks/useLearningEngine.js',
];
for (const f of leFiles) {
  check(`No TODO/FIXME in ${f}`, !fileContains(f, /\b(TODO|FIXME|HACK|XXX)\b/));
}

// ═══════════════════════════════════════════════════════════════
// SUMMARY
// ═══════════════════════════════════════════════════════════════

console.log('\n══════════════════════════════════════════');
console.log(`  TOTAL: ${totalChecks}  |  PASSED: ${passed}  |  FAILED: ${failed}`);
console.log('══════════════════════════════════════════\n');

if (failures.length > 0) {
  console.log('FAILURES:');
  for (const f of failures) {
    console.log(`  - ${f}`);
  }
  console.log('');
}

// Exit with code matching result
process.exit(failed > 0 ? 1 : 0);
