// Minimal, dependency-free CSV (RFC-4180-ish) for the vendor portal import/export.

/** Serialize a grid (first row = header) to a CSV string. */
export function toCSV(rows: string[][]): string {
  return rows
    .map((r) =>
      r
        .map((cell) => {
          const s = cell ?? '';
          return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        })
        .join(','),
    )
    .join('\r\n');
}

/** Parse a CSV string into a grid of cells (handles quotes, commas, CRLF/LF). */
export function parseCSV(text: string): string[][] {
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1); // strip BOM
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  let i = 0;

  const endField = () => {
    row.push(field);
    field = '';
  };
  const endRow = () => {
    endField();
    rows.push(row);
    row = [];
  };

  while (i < text.length) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      field += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
    } else if (c === ',') {
      endField();
      i++;
    } else if (c === '\n') {
      endRow();
      i++;
    } else if (c === '\r') {
      i++;
    } else {
      field += c;
      i++;
    }
  }
  if (field.length > 0 || row.length > 0) endRow();
  return rows.filter((r) => r.some((c) => c.trim() !== ''));
}

/** Parse CSV into objects keyed by the (lower-cased) header row. */
export function parseCSVObjects(text: string): Record<string, string>[] {
  const grid = parseCSV(text);
  if (grid.length < 1) return [];
  const header = grid[0].map((h) => h.trim().toLowerCase());
  return grid.slice(1).map((r) => {
    const o: Record<string, string> = {};
    header.forEach((h, idx) => (o[h] = (r[idx] ?? '').trim()));
    return o;
  });
}

/** Trigger a browser download of a CSV file. */
export function downloadCSV(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
