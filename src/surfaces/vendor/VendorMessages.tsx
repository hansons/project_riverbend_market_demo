import { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { fetchMessages, sendMessage } from '@/lib/vendorData';
import { useAsync } from '@/lib/useAsync';
import type { Vendor } from '@/lib/types';

export function VendorMessages({ vendor }: { vendor: Vendor }) {
  const { profile } = useAuth();
  const { data: messages, loading, reload } = useAsync(() => fetchMessages(vendor.id), [vendor.id], []);
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);

  async function send() {
    const text = body.trim();
    if (!text) return;
    setSending(true);
    await sendMessage(vendor.id, 'vendor', profile?.full_name ?? vendor.name, text);
    setSending(false);
    setBody('');
    reload();
  }

  return (
    <div className="card flex h-[560px] flex-col p-6">
      <h2 className="text-xl">Messages with market staff</h2>
      <p className="mt-1 text-sm text-brand-muted">Your private thread with the market office.</p>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {loading ? (
          <div className="h-24 animate-pulse rounded-xl bg-brand-paper" />
        ) : messages.length === 0 ? (
          <p className="text-sm text-brand-muted">No messages yet. Say hello below.</p>
        ) : (
          messages.map((m) => {
            const mine = m.sender === 'vendor';
            return (
              <div key={m.id} className={mine ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={[
                    'max-w-[78%] rounded-2xl px-3.5 py-2 text-sm',
                    mine ? 'bg-brand-primary text-white' : 'bg-brand-paper text-brand-ink',
                  ].join(' ')}
                >
                  <p className={`mb-0.5 text-[11px] font-semibold ${mine ? 'text-white/80' : 'text-brand-muted'}`}>
                    {m.author_name}
                  </p>
                  {m.body}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="mt-3 flex gap-2">
        <input
          className="field-input mt-0 flex-1"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Write a message…"
        />
        <button className="btn-primary" onClick={send} disabled={sending || !body.trim()}>
          Send
        </button>
      </div>
    </div>
  );
}
