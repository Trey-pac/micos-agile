/**
 * importUtils.js — Client-side fuzzy column matcher + file parser.
 *
 * Parses CSV / XLSX files into rows, then auto-maps spreadsheet column headers
 * to the target Firestore fields using synonym matching + Levenshtein distance.
 * No external AI API needed — handles ~95 % of messy real-world headers.
 */

import Papa from 'papaparse';
import * as XLSX from 'xlsx';

// ── File Parsing ───────────────────────────────────────────────────

/**
 * Accepts a File object (.csv, .xlsx, .xls) and returns { headers: string[], rows: object[] }.
 * Each row is { [header]: value }.
 */
export async function parseFile(file) {
  const ext = file.name.split('.').pop().toLowerCase();

  if (ext === 'csv' || ext === 'tsv' || ext === 'txt') {
    return parseCSV(file);
  }
  if (ext === 'xlsx' || ext === 'xls') {
    return parseExcel(file);
  }
  throw new Error(`Unsupported file type: .${ext}. Use .csv, .xlsx, or .xls`);
}

function parseCSV(file) {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: 'greedy',
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        if (results.errors.length > 0 && results.data.length === 0) {
          reject(new Error(results.errors[0].message));
          return;
        }
        resolve({
          headers: results.meta.fields || [],
          rows: results.data,
        });
      },
      error: (err) => reject(err),
    });
  });
}

async function parseExcel(file) {
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array' });
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  // Convert to array-of-objects with headers from first row
  const raw = XLSX.utils.sheet_to_json(sheet, { defval: '' });

  if (raw.length === 0) {
    throw new Error('The spreadsheet appears to be empty.');
  }
  const headers = Object.keys(raw[0]);
  return { headers, rows: raw };
}

// ── Fuzzy Column Matching ──────────────────────────────────────────

/**
 * Attempt to map each spreadsheet header to a target field.
 *
 * Returns a Map<headerName, fieldKey | null>.
 *
 * Algorithm per header:
 *   1. Exact synonym match (case-insensitive, trimmed) → 100 confidence
 *   2. Substring inclusion (header contains synonym or vice versa) → 80
 *   3. Levenshtein distance ≤ 3 on the closest synonym → 60
 *   4. No match → null
 *
 * Each target field is only assigned ONCE (greedy best-first).
 */
export function autoMapColumns(headers, targetFields) {
  // Build all candidate scores: [{ header, fieldKey, score }]
  const candidates = [];

  for (const header of headers) {
    const h = normalize(header);

    for (const field of targetFields) {
      let bestScore = 0;

      for (const syn of field.synonyms) {
        const s = normalize(syn);

        // Exact match
        if (h === s) {
          bestScore = Math.max(bestScore, 100);
          break;
        }
        // Substring
        if (h.includes(s) || s.includes(h)) {
          bestScore = Math.max(bestScore, 80);
        }
        // Levenshtein
        const dist = levenshtein(h, s);
        if (dist <= 3) {
          bestScore = Math.max(bestScore, 60 - dist * 5); // 60, 55, 50, 45
        }
      }

      if (bestScore > 0) {
        candidates.push({ header, fieldKey: field.key, score: bestScore });
      }
    }
  }

  // Sort descending by score, then greedily assign (no duplicate fields, no duplicate headers)
  candidates.sort((a, b) => b.score - a.score);

  const mapping = new Map(); // header → fieldKey
  const assignedFields = new Set();

  for (const { header, fieldKey, score } of candidates) {
    if (mapping.has(header)) continue;
    if (assignedFields.has(fieldKey)) continue;
    if (score < 40) continue; // minimum threshold

    mapping.set(header, fieldKey);
    assignedFields.add(fieldKey);
  }

  // Fill unmapped headers with null
  for (const header of headers) {
    if (!mapping.has(header)) {
      mapping.set(header, null);
    }
  }

  return mapping;
}

function normalize(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Classic Levenshtein distance (edit distance) between two strings.
 * Used as a fallback for close-but-not-exact header matches.
 */
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      const cost = b[i - 1] === a[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,     // deletion
        matrix[i][j - 1] + 1,     // insertion
        matrix[i - 1][j - 1] + cost, // substitution
      );
    }
  }
  return matrix[b.length][a.length];
}

// ── Row Transformation ─────────────────────────────────────────────

/**
 * Given raw rows + column mapping + target fields, produce clean Firestore-ready objects.
 * Coerces types (number fields get parseFloat'd), strips empty strings, skips rows
 * that are missing ALL required fields.
 */
export function transformRows(rows, mapping, targetFields) {
  // Invert mapping: fieldKey → header
  const fieldToHeader = {};
  for (const [header, fieldKey] of mapping.entries()) {
    if (fieldKey) fieldToHeader[fieldKey] = header;
  }

  const fieldMap = Object.fromEntries(targetFields.map((f) => [f.key, f]));
  const requiredKeys = targetFields.filter((f) => f.required).map((f) => f.key);

  const clean = [];
  const skipped = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const doc = {};
    let hasRequired = true;

    for (const field of targetFields) {
      const header = fieldToHeader[field.key];
      if (!header) continue;

      let val = raw[header];

      // Coerce types
      if (field.type === 'number') {
        val = parseFloat(String(val).replace(/[$,]/g, ''));
        if (isNaN(val)) val = null;
      } else {
        val = val != null ? String(val).trim() : '';
      }

      if (val !== '' && val !== null) {
        doc[field.key] = val;
      }
    }

    // Check required fields
    for (const rk of requiredKeys) {
      if (!doc[rk]) {
        hasRequired = false;
        break;
      }
    }

    if (hasRequired && Object.keys(doc).length > 0) {
      clean.push(doc);
    } else {
      skipped.push({ rowIndex: i + 2, reason: hasRequired ? 'Empty row' : 'Missing required fields', raw });
    }
  }

  return { clean, skipped };
}
