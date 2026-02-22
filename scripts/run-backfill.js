#!/usr/bin/env node
/**
 * run-backfill.js — One-time utility to trigger the Learning Engine backfill.
 *
 * Reads SYNC_API_SECRET from .env and calls the backfill endpoint
 * with the correct Authorization header.
 *
 * Usage:
 *   node scripts/run-backfill.js                    # hits production (micos.io)
 *   node scripts/run-backfill.js --local             # hits localhost:3000
 *   node scripts/run-backfill.js --url https://...   # hits custom URL
 *
 * Requirements:
 *   - .env file in project root with SYNC_API_SECRET=<your-secret>
 *   - Node 18+ (uses native fetch)
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ── Load .env manually (no dotenv dependency) ───────────────────────────────
function loadEnv() {
  try {
    const envPath = resolve(__dirname, '..', '.env');
    const content = readFileSync(envPath, 'utf-8');
    const vars = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx === -1) continue;
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      // Strip surrounding quotes
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      vars[key] = val;
    }
    return vars;
  } catch (err) {
    console.error('❌ Could not read .env file:', err.message);
    process.exit(1);
  }
}

// ── Parse CLI args ──────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isLocal = args.includes('--local');
const urlIdx = args.indexOf('--url');
const customUrl = urlIdx !== -1 ? args[urlIdx + 1] : null;

const PROD_URL = 'https://micos.io/api/learning-engine/backfill';
const LOCAL_URL = 'http://localhost:3000/api/learning-engine/backfill';

const targetUrl = customUrl || (isLocal ? LOCAL_URL : PROD_URL);

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  const env = loadEnv();
  const secret = env.SYNC_API_SECRET;

  if (!secret) {
    console.error('❌ SYNC_API_SECRET not found in .env');
    console.error('   Add it to your .env file: SYNC_API_SECRET=your-secret-here');
    process.exit(1);
  }

  console.log(`🚀 Calling backfill endpoint...`);
  console.log(`   URL: ${targetUrl}`);
  console.log(`   Auth: Bearer <SYNC_API_SECRET> (${secret.length} chars)`);
  console.log('');

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${secret}`,
      },
    });

    const contentType = response.headers.get('content-type') || '';
    let body;

    if (contentType.includes('application/json')) {
      body = await response.json();
    } else {
      body = await response.text();
    }

    if (!response.ok) {
      console.error(`❌ Request failed: ${response.status} ${response.statusText}`);
      console.error(JSON.stringify(body, null, 2));
      process.exit(1);
    }

    console.log(`✅ Backfill complete (${response.status})`);
    console.log(JSON.stringify(body, null, 2));
  } catch (err) {
    console.error('❌ Network error:', err.message);
    process.exit(1);
  }
}

main();
