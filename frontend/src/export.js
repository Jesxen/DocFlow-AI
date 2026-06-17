// Export helpers: flatten extraction result to CSV and download as CSV or JSON.

function triggerDownload(filename, content, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadJson(docType, data) {
  const payload = JSON.stringify({ docType, result: data }, null, 2);
  triggerDownload(`docflow-${docType}-${Date.now()}.json`, payload, 'application/json');
}

// Escape a value for CSV (RFC 4180 style).
function csvCell(value) {
  const s = value === null || value === undefined ? '' : String(value);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

// Flatten the result object into rows of [field, value]. Arrays of objects are
// expanded into multiple rows; scalars and arrays of strings are joined.
function flattenToRows(obj, prefix = '') {
  const rows = [];
  for (const [key, value] of Object.entries(obj || {})) {
    const label = prefix ? `${prefix}.${key}` : key;
    if (Array.isArray(value)) {
      if (value.length === 0) {
        rows.push([label, '']);
      } else if (typeof value[0] === 'object' && value[0] !== null) {
        value.forEach((item, idx) => {
          rows.push(...flattenToRows(item, `${label}[${idx + 1}]`));
        });
      } else {
        rows.push([label, value.join('; ')]);
      }
    } else if (value && typeof value === 'object') {
      rows.push(...flattenToRows(value, label));
    } else {
      rows.push([label, value]);
    }
  }
  return rows;
}

export function downloadCsv(docType, data) {
  const rows = flattenToRows(data);
  const lines = ['Field,Value'];
  for (const [field, value] of rows) {
    lines.push(`${csvCell(field)},${csvCell(value)}`);
  }
  triggerDownload(`docflow-${docType}-${Date.now()}.csv`, lines.join('\r\n'), 'text/csv');
}

// --- Batch exports ---
// `results` is an array of { filename, data } (only successful extractions).

export function downloadBatchJson(docType, results) {
  const payload = JSON.stringify(
    results.map((r) => ({ filename: r.filename, docType, result: r.data })),
    null,
    2,
  );
  triggerDownload(`docflow-batch-${docType}-${Date.now()}.json`, payload, 'application/json');
}

// Flatten a result object into a single flat { key: value } map.
function flattenToObject(data) {
  const obj = {};
  for (const [key, value] of flattenToRows(data)) obj[key] = value;
  return obj;
}

function rowsToCsv(headers, rows) {
  const lines = [headers.map(csvCell).join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => csvCell(row[h])).join(','));
  }
  return lines.join('\r\n');
}

// Invoices: one row per line item (doc-level fields repeated). Other types:
// one row per document with the union of all flattened fields as columns.
export function downloadBatchCsv(docType, results) {
  let csv;

  if (docType === 'invoice') {
    const headers = [
      'filename', 'vendor', 'date', 'description', 'qty', 'unitPrice', 'amount',
      'subtotal', 'tax', 'total',
    ];
    const rows = [];
    for (const r of results) {
      const d = r.data || {};
      const base = {
        filename: r.filename, vendor: d.vendor, date: d.date,
        subtotal: d.subtotal, tax: d.tax, total: d.total,
      };
      const items = Array.isArray(d.items) ? d.items : [];
      if (items.length === 0) {
        rows.push(base);
      } else {
        for (const it of items) {
          rows.push({
            ...base,
            description: it.description, qty: it.qty,
            unitPrice: it.unitPrice, amount: it.amount,
          });
        }
      }
    }
    csv = rowsToCsv(headers, rows);
  } else {
    const rows = results.map((r) => ({ filename: r.filename, ...flattenToObject(r.data) }));
    const keys = new Set(['filename']);
    rows.forEach((row) => Object.keys(row).forEach((k) => keys.add(k)));
    csv = rowsToCsv([...keys], rows);
  }

  triggerDownload(`docflow-batch-${docType}-${Date.now()}.csv`, csv, 'text/csv');
}
