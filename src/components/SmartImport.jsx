import { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { parseFile, autoMapColumns, transformRows } from '../utils/importUtils';

/**
 * SmartImport — Universal spreadsheet import modal.
 *
 * Props:
 *   isOpen        — boolean
 *   onClose       — () => void
 *   config        — an importConfig object from data/importConfigs.js
 *   onImport      — (cleanRows: object[]) => Promise<{ success: number, failed: number }>
 *   existingCount — optional number of existing items (shown as context)
 *
 * Flow:
 *   1. Drop / pick a CSV or Excel file
 *   2. Auto-map columns via fuzzy matching
 *   3. User reviews & adjusts column mapping
 *   4. Preview transformed data
 *   5. Confirm → bulk write to Firestore
 */

const STEP = { UPLOAD: 'upload', MAP: 'map', PREVIEW: 'preview', DONE: 'done' };

export default function SmartImport({ isOpen, onClose, config, onImport, existingCount }) {
  const [step, setStep] = useState(STEP.UPLOAD);
  const [file, setFile] = useState(null);
  const [headers, setHeaders] = useState([]);
  const [rows, setRows] = useState([]);
  const [mapping, setMapping] = useState(new Map());
  const [cleanRows, setCleanRows] = useState([]);
  const [skippedRows, setSkippedRows] = useState([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef(null);

  // ── Reset on close ──
  const handleClose = useCallback(() => {
    setStep(STEP.UPLOAD);
    setFile(null);
    setHeaders([]);
    setRows([]);
    setMapping(new Map());
    setCleanRows([]);
    setSkippedRows([]);
    setImporting(false);
    setResult(null);
    setError(null);
    onClose();
  }, [onClose]);

  // ── Step 1: File selection ──
  const handleFile = useCallback(async (f) => {
    setError(null);
    try {
      const { headers: h, rows: r } = await parseFile(f);
      if (r.length === 0) {
        setError('File is empty — no data rows found.');
        return;
      }
      setFile(f);
      setHeaders(h);
      setRows(r);
      // Auto-map
      const m = autoMapColumns(h, config.fields);
      setMapping(m);
      setStep(STEP.MAP);
    } catch (err) {
      setError(err.message || 'Failed to parse file.');
    }
  }, [config]);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer?.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onPick = useCallback((e) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  }, [handleFile]);

  // ── Step 2: Update a single mapping ──
  const updateMapping = useCallback((header, fieldKey) => {
    setMapping((prev) => {
      const next = new Map(prev);
      // If fieldKey already assigned to another header, unassign it
      if (fieldKey) {
        for (const [h, fk] of next) {
          if (fk === fieldKey && h !== header) {
            next.set(h, null);
          }
        }
      }
      next.set(header, fieldKey || null);
      return next;
    });
  }, []);

  const proceedToPreview = useCallback(() => {
    const { clean, skipped } = transformRows(rows, mapping, config.fields);
    setCleanRows(clean);
    setSkippedRows(skipped);
    setStep(STEP.PREVIEW);
  }, [rows, mapping, config]);

  // ── Step 4: Import ──
  const doImport = useCallback(async () => {
    setImporting(true);
    setError(null);
    try {
      const res = await onImport(cleanRows);
      setResult(res);
      setStep(STEP.DONE);
    } catch (err) {
      setError(err.message || 'Import failed.');
    } finally {
      setImporting(false);
    }
  }, [cleanRows, onImport]);

  // ── Helpers ──
  const mappedFieldCount = [...mapping.values()].filter(Boolean).length;
  const requiredFields = config.fields.filter((f) => f.required);
  const mappedRequiredCount = requiredFields.filter((f) =>
    [...mapping.values()].includes(f.key)
  ).length;
  const allRequiredMapped = mappedRequiredCount === requiredFields.length;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={handleClose}
      >
        <motion.div
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* ── Header ── */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{config.icon}</span>
              <div>
                <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                  Import {config.label}
                </h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {step === STEP.UPLOAD && 'Drop a CSV or Excel file to get started'}
                  {step === STEP.MAP && `Map your columns → ${config.label} fields`}
                  {step === STEP.PREVIEW && `Review ${cleanRows.length} rows before importing`}
                  {step === STEP.DONE && 'Import complete!'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 text-xl cursor-pointer"
            >
              ✕
            </button>
          </div>

          {/* ── Step indicator ── */}
          <div className="flex items-center gap-2 px-6 py-3 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
            {[
              { key: STEP.UPLOAD, label: '1. Upload', icon: '📁' },
              { key: STEP.MAP, label: '2. Map Columns', icon: '🔗' },
              { key: STEP.PREVIEW, label: '3. Preview', icon: '👁️' },
              { key: STEP.DONE, label: '4. Done', icon: '✅' },
            ].map((s, i) => {
              const steps = [STEP.UPLOAD, STEP.MAP, STEP.PREVIEW, STEP.DONE];
              const current = steps.indexOf(step);
              const idx = steps.indexOf(s.key);
              const isActive = idx === current;
              const isPast = idx < current;
              return (
                <div key={s.key} className="flex items-center gap-2">
                  {i > 0 && (
                    <div className={`w-6 h-0.5 rounded ${isPast ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
                  )}
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap ${
                      isActive
                        ? 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400'
                        : isPast
                          ? 'text-green-600 dark:text-green-500'
                          : 'text-gray-400 dark:text-gray-500'
                    }`}
                  >
                    {s.icon} {s.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto p-6">
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-sm text-red-700 dark:text-red-400">
                ⚠️ {error}
              </div>
            )}

            {/* ── STEP: UPLOAD ── */}
            {step === STEP.UPLOAD && (
              <div
                className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
                  dragOver
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-300 dark:border-gray-600 hover:border-green-400 hover:bg-green-50/50 dark:hover:bg-green-900/10'
                }`}
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={onDrop}
                onClick={() => fileRef.current?.click()}
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.tsv,.txt"
                  className="hidden"
                  onChange={onPick}
                />
                <div className="text-5xl mb-4">{dragOver ? '📥' : '📄'}</div>
                <p className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-1">
                  {dragOver ? 'Drop it!' : 'Drop your spreadsheet here'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                  or click to browse — CSV, Excel (.xlsx / .xls)
                </p>
                <div className="inline-flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded-lg px-3 py-2">
                  <span>💡</span>
                  <span>First row should be column headers. We'll auto-detect the rest!</span>
                </div>
                {existingCount > 0 && (
                  <p className="mt-4 text-xs text-gray-400 dark:text-gray-500">
                    You currently have {existingCount} {config.label.toLowerCase()} — new rows will be added alongside them.
                  </p>
                )}
              </div>
            )}

            {/* ── STEP: MAP COLUMNS ── */}
            {step === STEP.MAP && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    <span className="font-bold text-green-600 dark:text-green-400">{file?.name}</span>
                    {' — '}{rows.length} rows, {headers.length} columns
                  </p>
                  <span className={`text-xs font-semibold px-2 py-1 rounded-full ${
                    allRequiredMapped
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                      : 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                  }`}>
                    {mappedFieldCount} / {config.fields.length} mapped
                  </span>
                </div>

                {/* Mapping rows */}
                <div className="space-y-2">
                  {headers.map((header) => {
                    const fieldKey = mapping.get(header);
                    const sampleValues = rows.slice(0, 3).map((r) => r[header]).filter(Boolean).join(', ');

                    return (
                      <div
                        key={header}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          fieldKey
                            ? 'border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10'
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/50'
                        }`}
                      >
                        {/* Source column */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-800 dark:text-gray-200 truncate">
                            📊 {header}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                            e.g. {sampleValues || '(empty)'}
                          </p>
                        </div>

                        {/* Arrow */}
                        <span className={`text-lg ${fieldKey ? 'text-green-500' : 'text-gray-300 dark:text-gray-600'}`}>
                          →
                        </span>

                        {/* Target field dropdown */}
                        <select
                          value={fieldKey || ''}
                          onChange={(e) => updateMapping(header, e.target.value)}
                          className={`w-44 text-sm rounded-lg border px-2 py-2 bg-white dark:bg-gray-800 cursor-pointer ${
                            fieldKey
                              ? 'border-green-300 dark:border-green-700 text-green-700 dark:text-green-400 font-semibold'
                              : 'border-gray-300 dark:border-gray-600 text-gray-500 dark:text-gray-400'
                          }`}
                        >
                          <option value="">— Skip —</option>
                          {config.fields.map((f) => (
                            <option key={f.key} value={f.key}>
                              {f.label}{f.required ? ' *' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                {/* Unmapped required fields warning */}
                {!allRequiredMapped && (
                  <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 text-sm text-amber-700 dark:text-amber-400">
                    ⚠️ Required fields not yet mapped:{' '}
                    {requiredFields
                      .filter((f) => ![...mapping.values()].includes(f.key))
                      .map((f) => f.label)
                      .join(', ')}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP: PREVIEW ── */}
            {step === STEP.PREVIEW && (
              <div className="space-y-4">
                {/* Stats bar */}
                <div className="flex items-center gap-4">
                  <span className="text-sm font-semibold text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-3 py-1 rounded-full">
                    ✅ {cleanRows.length} rows ready
                  </span>
                  {skippedRows.length > 0 && (
                    <span className="text-sm font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 px-3 py-1 rounded-full">
                      ⚠️ {skippedRows.length} skipped
                    </span>
                  )}
                </div>

                {/* Preview table */}
                {cleanRows.length > 0 && (
                  <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-gray-700">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800">
                          <th className="px-3 py-2 text-left text-xs font-bold text-gray-500 dark:text-gray-400 w-10">#</th>
                          {config.fields
                            .filter((f) => [...mapping.values()].includes(f.key))
                            .map((f) => (
                              <th
                                key={f.key}
                                className="px-3 py-2 text-left text-xs font-bold text-gray-500 dark:text-gray-400"
                              >
                                {f.label}
                              </th>
                            ))}
                        </tr>
                      </thead>
                      <tbody>
                        {cleanRows.slice(0, 50).map((row, i) => (
                          <tr
                            key={i}
                            className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50"
                          >
                            <td className="px-3 py-2 text-xs text-gray-400">{i + 1}</td>
                            {config.fields
                              .filter((f) => [...mapping.values()].includes(f.key))
                              .map((f) => (
                                <td
                                  key={f.key}
                                  className="px-3 py-2 text-gray-700 dark:text-gray-300 max-w-[200px] truncate"
                                >
                                  {row[f.key] ?? '—'}
                                </td>
                              ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {cleanRows.length > 50 && (
                      <div className="px-4 py-2 text-xs text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                        Showing first 50 of {cleanRows.length} rows
                      </div>
                    )}
                  </div>
                )}

                {/* Skipped rows detail */}
                {skippedRows.length > 0 && (
                  <details className="text-sm">
                    <summary className="cursor-pointer text-amber-600 dark:text-amber-400 font-semibold hover:underline">
                      View {skippedRows.length} skipped rows
                    </summary>
                    <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                      {skippedRows.slice(0, 20).map((s, i) => (
                        <div key={i} className="text-xs text-gray-500 dark:text-gray-400">
                          Row {s.rowIndex}: {s.reason}
                        </div>
                      ))}
                      {skippedRows.length > 20 && (
                        <div className="text-xs text-gray-400">…and {skippedRows.length - 20} more</div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* ── STEP: DONE ── */}
            {step === STEP.DONE && result && (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">🎉</div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                  Import Complete!
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-1">
                  <span className="font-bold text-green-600 dark:text-green-400">{result.success}</span> {config.label.toLowerCase()} imported successfully
                </p>
                {result.failed > 0 && (
                  <p className="text-amber-600 dark:text-amber-400 text-sm">
                    {result.failed} rows failed to import
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
            <div>
              {step === STEP.MAP && (
                <button
                  onClick={() => { setStep(STEP.UPLOAD); setFile(null); setHeaders([]); setRows([]); setError(null); }}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                >
                  ← Pick different file
                </button>
              )}
              {step === STEP.PREVIEW && (
                <button
                  onClick={() => setStep(STEP.MAP)}
                  className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 cursor-pointer"
                >
                  ← Adjust mapping
                </button>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg cursor-pointer"
              >
                {step === STEP.DONE ? 'Close' : 'Cancel'}
              </button>

              {step === STEP.MAP && (
                <button
                  onClick={proceedToPreview}
                  disabled={!allRequiredMapped}
                  className="px-5 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg shadow cursor-pointer transition-colors"
                >
                  Preview Data →
                </button>
              )}

              {step === STEP.PREVIEW && (
                <button
                  onClick={doImport}
                  disabled={importing || cleanRows.length === 0}
                  className="px-5 py-2 text-sm font-bold text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg shadow cursor-pointer transition-colors flex items-center gap-2"
                >
                  {importing ? (
                    <>
                      <span className="animate-spin">⏳</span> Importing...
                    </>
                  ) : (
                    <>Import {cleanRows.length} rows</>
                  )}
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
