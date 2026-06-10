import { useState } from 'react';
import {
  addEventsBulk,
  createEvent,
  deleteEvent,
  fetchAllEvents,
  updateEvent,
  type EventInput,
} from '@/lib/adminData';
import { fetchMarkets } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';
import { downloadCSV, parseCSVObjects, toCSV } from '@/lib/csv';
import { CsvToolbar } from '@/components/CsvToolbar';
import { eventCategoryEmoji, formatDate } from '@/lib/format';
import type { Market, MarketEvent } from '@/lib/types';

const CATEGORIES = ['Gardening', 'Kids', 'Education', 'Food', 'Music', 'Health', 'Community', 'Art'];

const CSV_HEADER = ['title', 'date', 'market', 'category', 'featured', 'description'];
const CSV_SAMPLE: string[][] = [
  CSV_HEADER,
  ['Master Gardeners — Let’s Talk Plants', '2026-06-13', 'Saturday Market', 'Gardening', 'true', 'On-the-spot gardening advice.'],
  ['Live Music — The Cedar Sisters', '2026-07-04', 'Saturday Market', 'Music', 'false', 'Tunes on the main stage, 10am–noon.'],
];
const TRUTHY = new Set(['true', '1', 'yes', 'y', 'on']);

interface EVals {
  title: string;
  description: string;
  date: string;
  market_id: string;
  category: string;
  featured: boolean;
}
function todayISO(): string {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
}
const toInput = (v: EVals): EventInput => ({
  title: v.title.trim(),
  description: v.description.trim() || null,
  date: v.date,
  market_id: v.market_id || null,
  category: v.category || null,
  featured: v.featured,
});

export function AdminEvents() {
  const { data: events, loading, reload } = useAsync(fetchAllEvents, [], []);
  const { data: markets } = useAsync(fetchMarkets, [], []);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<EventInput[] | null>(null);

  async function add(v: EVals) {
    setBusy(true);
    await createEvent(toInput(v));
    setBusy(false);
    setAdding(false);
    reload();
  }

  function exportEvents() {
    const rows = [
      CSV_HEADER,
      ...events.map((e) => [
        e.title,
        e.date,
        e.markets?.name ?? '',
        e.category ?? '',
        e.featured ? 'true' : 'false',
        e.description ?? '',
      ]),
    ];
    downloadCSV('riverbend-events.csv', toCSV(rows));
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const rows: EventInput[] = [];
    for (const r of parseCSVObjects(await file.text())) {
      const title = (r.title ?? '').trim();
      const date = (r.date ?? '').trim();
      if (!title || !date) continue;
      const marketName = (r.market ?? '').trim().toLowerCase();
      const market = marketName ? markets.find((m) => m.name.toLowerCase() === marketName) : undefined;
      rows.push({
        title,
        date,
        market_id: market?.id ?? null,
        category: (r.category ?? '').trim() || null,
        featured: TRUTHY.has((r.featured ?? '').trim().toLowerCase()),
        description: (r.description ?? '').trim() || null,
      });
    }
    if (!rows.length) {
      setError('No rows with a title + date found. Header: title, date, market, category, featured, description.');
      return;
    }
    setPreview(rows);
  }

  async function applyImport() {
    if (!preview) return;
    setBusy(true);
    const err = await addEventsBulk(preview);
    setBusy(false);
    if (err) setError(err);
    else {
      setPreview(null);
      reload();
    }
  }

  const empty: EVals = { title: '', description: '', date: todayISO(), market_id: markets[0]?.id ?? '', category: CATEGORIES[0], featured: false };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl">Events</h2>
          <p className="mt-1 text-sm text-brand-muted">
            Community happenings on the public Events page — demos, workshops, kids’ activities, partners.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CsvToolbar
            onSample={() => downloadCSV('events-sample.csv', toCSV(CSV_SAMPLE))}
            onExport={exportEvents}
            onImport={onFile}
            exportDisabled={!events.length}
          />
          {!adding && (
            <button className="btn-outline px-3 py-1.5 text-sm" onClick={() => setAdding(true)}>+ Add event</button>
          )}
        </div>
      </div>

      {error && <p className="text-sm text-status-alert">{error}</p>}

      {preview && (
        <div className="card border-brand-accent p-5">
          <p className="font-semibold text-brand-primary-dark">
            Add {preview.length} event{preview.length === 1 ? '' : 's'}?
          </p>
          <ul className="mt-2 space-y-1 text-sm">
            {preview.slice(0, 12).map((ev, i) => (
              <li key={i} className="text-brand-ink">
                <span className="text-brand-muted">{formatDate(ev.date)}:</span> {ev.title}
                {ev.category && <span className="ml-1 text-xs text-brand-accent">{ev.category}</span>}
              </li>
            ))}
            {preview.length > 12 && <li className="text-xs text-brand-muted">…and {preview.length - 12} more</li>}
          </ul>
          <div className="mt-3 flex gap-2">
            <button className="btn-primary" onClick={applyImport} disabled={busy}>
              {busy ? 'Adding…' : 'Add events'}
            </button>
            <button className="btn-ghost" onClick={() => setPreview(null)} disabled={busy}>Cancel</button>
          </div>
        </div>
      )}

      {adding && <EventEditor initial={empty} submitLabel="Add event" busy={busy} markets={markets} onSubmit={add} onCancel={() => setAdding(false)} />}

      {loading ? (
        <div className="h-64 animate-pulse rounded-2xl bg-brand-card" />
      ) : events.length === 0 ? (
        <p className="text-sm text-brand-muted">No events yet — add one above.</p>
      ) : (
        <div className="space-y-2">
          {events.map((e) => (
            <EventRow key={e.id} event={e} markets={markets} onChanged={reload} />
          ))}
        </div>
      )}
    </div>
  );
}

function EventRow({ event, markets, onChanged }: { event: MarketEvent; markets: Market[]; onChanged: () => void }) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  async function save(v: EVals) {
    setBusy(true);
    await updateEvent(event.id, toInput(v));
    setBusy(false);
    setEditing(false);
    onChanged();
  }
  async function remove() {
    if (!window.confirm(`Delete "${event.title}"?`)) return;
    setBusy(true);
    await deleteEvent(event.id);
    setBusy(false);
    onChanged();
  }

  if (editing) {
    return (
      <EventEditor
        initial={{
          title: event.title,
          description: event.description ?? '',
          date: event.date,
          market_id: event.market_id ?? '',
          category: event.category ?? '',
          featured: event.featured,
        }}
        submitLabel="Save"
        busy={busy}
        markets={markets}
        onSubmit={save}
        onCancel={() => setEditing(false)}
      />
    );
  }

  return (
    <div className={`card p-4 ${event.featured ? 'ring-1 ring-brand-accent' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-xs text-brand-muted">
            <span className="font-semibold text-brand-accent">{formatDate(event.date)}</span>
            <span className="chip">{eventCategoryEmoji(event.category)} {event.category ?? 'Event'}</span>
            <span>{event.markets?.name}</span>
            {event.featured && <span className="text-brand-berry">★ featured</span>}
          </div>
          <p className="mt-1 font-semibold text-brand-primary-dark">{event.title}</p>
          {event.description && <p className="mt-0.5 text-sm text-brand-muted">{event.description}</p>}
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button onClick={() => setEditing(true)} className="text-xs font-semibold text-brand-primary hover:underline">Edit</button>
          <button onClick={remove} disabled={busy} className="text-xs font-semibold text-status-alert hover:underline">Delete</button>
        </div>
      </div>
    </div>
  );
}

function EventEditor({
  initial,
  submitLabel,
  busy,
  markets,
  onSubmit,
  onCancel,
}: {
  initial: EVals;
  submitLabel: string;
  busy: boolean;
  markets: Market[];
  onSubmit: (v: EVals) => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [date, setDate] = useState(initial.date);
  const [marketId, setMarketId] = useState(initial.market_id);
  const [category, setCategory] = useState(initial.category);
  const [featured, setFeatured] = useState(initial.featured);

  return (
    <div className="rounded-xl border border-brand-accent bg-brand-paper p-4">
      <label className="block">
        <span className="field-label">Title</span>
        <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Master Gardeners — Let's Talk Plants" />
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="field-label">Date</span>
          <input type="date" className="field-input" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label className="block">
          <span className="field-label">Market</span>
          <select className="field-input" value={marketId} onChange={(e) => setMarketId(e.target.value)}>
            <option value="">— any —</option>
            {markets.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="field-label">Category</span>
          <select className="field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="">— none —</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-3 block">
        <span className="field-label">Description</span>
        <textarea className="field-input min-h-[80px]" value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      <button
        type="button"
        onClick={() => setFeatured((f) => !f)}
        className={[
          'mt-3 rounded-lg border px-3 py-1.5 text-sm font-medium transition',
          featured ? 'border-brand-accent bg-brand-accent/15 text-brand-ink' : 'border-brand-line text-brand-muted',
        ].join(' ')}
      >
        {featured ? '★ Featured' : '☆ Feature this event'}
      </button>
      <div className="mt-3 flex gap-2">
        <button className="btn-primary" disabled={busy || !title.trim()} onClick={() => onSubmit({ title, description, date, market_id: marketId, category, featured })}>
          {busy ? 'Saving…' : submitLabel}
        </button>
        <button className="btn-ghost" disabled={busy} onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}
