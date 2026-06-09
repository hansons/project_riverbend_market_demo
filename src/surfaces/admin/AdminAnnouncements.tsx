import { useState } from 'react';
import { createAnnouncement, fetchAllAnnouncements, setAnnouncementActive } from '@/lib/adminData';
import { useAsync } from '@/lib/useAsync';
import type { AnnouncementAudience } from '@/lib/types';

const AUDIENCES: { value: AnnouncementAudience; label: string }[] = [
  { value: 'public', label: 'Shoppers (public banner)' },
  { value: 'vendors', label: 'Vendors' },
  { value: 'all', label: 'Everyone' },
];

export function AdminAnnouncements() {
  const { data: list, loading, reload } = useAsync(fetchAllAnnouncements, [], []);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<AnnouncementAudience>('public');
  const [busy, setBusy] = useState(false);

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

  return (
    <div className="space-y-6">
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
