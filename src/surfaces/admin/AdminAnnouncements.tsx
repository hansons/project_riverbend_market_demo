import { useRef, useState } from 'react';
import {
  addAnnouncementsBulk,
  createAnnouncement,
  fetchAllAnnouncements,
  setAnnouncementActive,
} from '@/lib/adminData';
import { useAsync } from '@/lib/useAsync';
import { downloadCSV, parseCSVObjects, toCSV } from '@/lib/csv';
import type { AnnouncementAudience } from '@/lib/types';

const AUDIENCES: { value: AnnouncementAudience; label: string }[] = [
  { value: 'public', label: 'Shoppers (public banner)' },
  { value: 'vendors', label: 'Vendors' },
  { value: 'all', label: 'Everyone' },
];

const CSV_HEADER = ['title', 'body', 'audience', 'active'];
const CSV_SAMPLE: string[][] = [
  CSV_HEADER,
  ['🎶 Live music this Saturday', 'The Cedar Sisters play the main stage 10am–noon.', 'public', 'true'],
  ['Load-in moves to 7:30am', 'Vendor load-in opens at 7:30am starting June 20.', 'vendors', 'true'],
];
const VALID_AUDIENCE = new Set<AnnouncementAudience>(['public', 'vendors', 'all']);
const TRUTHY = new Set(['true', '1', 'yes', 'y', 'live', 'on']);

interface ImportRow {
  title: string;
  body: string;
  audience: AnnouncementAudience;
  active: boolean;
}

export function AdminAnnouncements() {
  const { data: list, loading, reload } = useAsync(fetchAllAnnouncements, [], []);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('public');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ImportRow[] | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function post() {
    if (!title.trim() || !body.trim()) return;
    setBusy(true);
    await createAnnouncement({ title: title.trim(), body: body.trim(), audience });
    setBusy(false);
    setTitle('');
    setBody('');
    reload();
  }

  async function toggle(id: string, active: boolean) {
    await setAnnouncementActive(id, active);
    reload();
  }

  function exportAll() {
    const rows = [CSV_HEADER, ...list.map((a) => [a.title, a.body, a.audience, a.active ? 'true' : 'false'])];
    downloadCSV('riverbend-announcements.csv', toCSV(rows));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    setError(null);
    const rows: ImportRow[] = parseCSVObjects(await file.text())
      .map((r) => {
        const aud = (r.audience ?? '').trim() as AnnouncementAudience;
        const act = (r.active ?? '').trim().toLowerCase();
        return {
          title: (r.title ?? '').trim(),
          body: (r.body ?? '').trim(),
          audience: VALID_AUDIENCE.has(aud) ? aud : 'public',
          active: act === '' ? true : TRUTHY.has(act),
        };
      })
      .filter((r) => r.title || r.body);
    if (!rows.length) {
      setError('No rows found. Header should be: title, body, audience, active.');
      return;
    }
    setPreview(rows);
  }

  async function applyImport() {
    if (!preview) return;
    setBusy(true);
    const err = await addAnnouncementsBulk(preview);
    setBusy(false);
    if (err) setError(err);
    else {
      setPreview(null);
      reload();
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="card p-6">
        <h2 className="text-xl">Post an announcement</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Public announcements show as a banner on the shopper site immediately.
        </p>
        <div className="mt-4 space-y-3">
          <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title" />
          <textarea className="field-input min-h-[80px]" value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" />
          <div className="flex flex-wrap items-center gap-3">
            <select className="field-input sm:w-64" value={audience} onChange={(e) => setAudience(e.target.value as AnnouncementAudience)}>
              {AUDIENCES.map((a) => (
                <option key={a.value} value={a.value}>{a.label}</option>
              ))}
            </select>
            <button className="btn-primary" onClick={post} disabled={busy}>
              {busy ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      </div>

      <div className="card p-6 order-last">
        <h3 className="text-lg">Bulk import / export</h3>
        <p className="mt-1 text-sm text-brand-muted">
          Draft a batch of announcements in a spreadsheet, then import them. Columns:{' '}
          <code className="rounded bg-brand-paper px-1">title, body, audience, active</code> (audience =
          public / vendors / all; active = true / false). Imported rows are <strong>added</strong>.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <button className="btn-outline" onClick={() => downloadCSV('announcements-sample.csv', toCSV(CSV_SAMPLE))}>
            ⬇ Sample CSV
          </button>
          <button className="btn-outline" onClick={exportAll} disabled={!list.length}>⬇ Export current</button>
          <button className="btn-primary" onClick={() => fileRef.current?.click()}>⬆ Import CSV</button>
          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={onFile} className="hidden" />
        </div>
        {error && <p className="mt-2 text-sm text-status-alert">{error}</p>}

        {preview && (
          <div className="mt-4 rounded-xl border border-brand-accent bg-brand-paper p-4">
            <p className="font-semibold text-brand-primary-dark">
              Add {preview.length} announcement{preview.length === 1 ? '' : 's'}?
            </p>
            <ul className="mt-2 space-y-1 text-sm">
              {preview.map((a, i) => (
                <li key={i} className="text-brand-ink">
                  <span className="text-[11px] uppercase tracking-wide text-brand-accent">{a.audience}</span>
                  {!a.active && <span className="ml-1 text-xs text-brand-muted">(off)</span>} —{' '}
                  {a.title || '(no title)'}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex gap-2">
              <button className="btn-primary" onClick={applyImport} disabled={busy}>
                {busy ? 'Adding…' : 'Add announcements'}
              </button>
              <button className="btn-ghost" onClick={() => setPreview(null)} disabled={busy}>Cancel</button>
            </div>
          </div>
        )}
      </div>

      <div>
        <h3 className="text-lg">All announcements</h3>
        {loading ? (
          <div className="mt-3 h-24 animate-pulse rounded-2xl bg-brand-card" />
        ) : list.length === 0 ? (
          <p className="mt-2 text-sm text-brand-muted">None yet.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {list.map((a) => (
              <div key={a.id} className="card flex items-center justify-between gap-3 p-4">
                <div className="min-w-0">
                  <p className="font-semibold text-brand-ink">{a.title}</p>
                  <p className="truncate text-sm text-brand-muted">{a.body}</p>
                  <span className="mt-1 inline-block text-[11px] uppercase tracking-wide text-brand-accent">{a.audience}</span>
                </div>
                <button
                  onClick={() => toggle(a.id, !a.active)}
                  className={[
                    'shrink-0 rounded-full px-3 py-1 text-xs font-semibold',
                    a.active ? 'bg-status-ok/10 text-status-ok' : 'bg-brand-paper text-brand-muted',
                  ].join(' ')}
                >
                  {a.active ? '● Live' : '○ Off'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
