import { useState } from 'react';
import { addDocument, deleteDocument, fetchDocumentTypes, fetchMyDocuments, signedDocUrl } from '@/lib/documents';
import { useAsync } from '@/lib/useAsync';
import { docStatusStyle, formatDate, relativeDays } from '@/lib/format';
import { DocumentUploader } from './DocumentUploader';
import type { Vendor } from '@/lib/types';

export function VendorDocuments({ vendor }: { vendor: Vendor }) {
  const { data: types } = useAsync(fetchDocumentTypes, [], []);
  const { data: docs, loading, reload } = useAsync(() => fetchMyDocuments(vendor.id), [vendor.id], []);

  const [docType, setDocType] = useState('');
  const [issued, setIssued] = useState('');
  const [expires, setExpires] = useState('');
  const [notes, setNotes] = useState('');
  const [path, setPath] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<'ok' | string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  const selectedType = docType || types[0]?.code || '';

  async function save() {
    if (!selectedType) return;
    setSaving(true);
    setResult(null);
    const err = await addDocument(vendor.id, {
      doc_type: selectedType,
      file_url: path,
      issued_date: issued || null,
      expires_date: expires || null,
      notes: notes.trim() || null,
    });
    setSaving(false);
    setResult(err ?? 'ok');
    if (!err) {
      setIssued('');
      setExpires('');
      setNotes('');
      setPath(null);
      setDocType('');
      reload();
    }
  }

  async function view(p: string | null) {
    if (!p) return;
    const url = await signedDocUrl(p);
    if (url) window.open(url, '_blank', 'noopener');
  }

  async function remove(id: string) {
    setBusy(id);
    await deleteDocument(id);
    setBusy(null);
    reload();
  }

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-xl">Compliance documents</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Upload your insurance certificate and licenses and keep their expiry dates current. Market
          staff are alerted before anything lapses.
        </p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Document type</span>
            <select
              className="field-input"
              value={selectedType}
              onChange={(e) => {
                setDocType(e.target.value);
                setResult(null);
              }}
            >
              {types.map((t) => (
                <option key={t.code} value={t.code}>
                  {t.label}
                  {t.required ? ' (required)' : ''}
                </option>
              ))}
            </select>
          </label>
          <div className="block">
            <span className="field-label">File</span>
            <div className="mt-1">
              <DocumentUploader
                vendorId={vendor.id}
                uploaded={!!path}
                onUploaded={(p) => {
                  setPath(p);
                  setResult(null);
                }}
              />
            </div>
          </div>
          <label className="block">
            <span className="field-label">Issued</span>
            <input type="date" className="field-input" value={issued} onChange={(e) => { setIssued(e.target.value); setResult(null); }} />
          </label>
          <label className="block">
            <span className="field-label">Expires</span>
            <input type="date" className="field-input" value={expires} onChange={(e) => { setExpires(e.target.value); setResult(null); }} />
          </label>
          <label className="block sm:col-span-2">
            <span className="field-label">Notes</span>
            <input className="field-input" value={notes} onChange={(e) => { setNotes(e.target.value); setResult(null); }} placeholder="Policy number, carrier, etc." />
          </label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button className="btn-primary" onClick={save} disabled={saving || !selectedType}>
            {saving ? 'Saving…' : 'Add document'}
          </button>
          {result === 'ok' && <span className="text-sm text-status-ok">✓ Added</span>}
          {result && result !== 'ok' && <span className="text-sm text-status-alert">{result}</span>}
        </div>
      </div>

      <div className="card p-6">
        <h3 className="text-lg">On file</h3>
        {loading ? (
          <div className="mt-4 h-32 animate-pulse rounded-xl bg-brand-paper" />
        ) : docs.length === 0 ? (
          <p className="mt-3 text-sm text-brand-muted">No documents yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-brand-line">
            {docs.map((d) => {
              const pill = docStatusStyle(d.status);
              return (
                <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium text-brand-ink">{d.doc_label}</p>
                    <p className="text-sm text-brand-muted">
                      {d.expires_date ? `Expires ${formatDate(d.expires_date)} · ${relativeDays(d.expires_date)}` : 'No expiry date'}
                      {d.verified_at ? ' · ✓ Verified by staff' : ' · Awaiting review'}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${pill.className}`}>{pill.label}</span>
                    {d.file_url && (
                      <button onClick={() => view(d.file_url)} className="rounded-lg border border-brand-line px-3 py-1 text-sm font-semibold hover:bg-brand-paper">
                        View
                      </button>
                    )}
                    <button onClick={() => remove(d.id)} disabled={busy === d.id} className="rounded-lg border border-brand-line px-3 py-1 text-sm font-semibold text-status-alert hover:bg-brand-paper">
                      Remove
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
