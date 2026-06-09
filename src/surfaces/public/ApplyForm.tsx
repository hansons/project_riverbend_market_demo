import { useState } from 'react';
import { submitApplication } from '@/lib/data';
import { navigate } from '@/lib/router';

const CATEGORIES = [
  'Produce', 'Bakery', 'Flowers', 'Meat & Eggs', 'Cheese & Dairy', 'Mushrooms',
  'Orchard & Fruit', 'Prepared Foods', 'Honey & Preserves', 'Coffee & Tea',
  'Herbs & Plants', 'Seafood', 'Body & Home', 'Nuts & Grains',
];
const MARKET_DAYS = ['Saturday', 'Wednesday'];

export function ApplyForm() {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [town, setTown] = useState('');
  const [email, setEmail] = useState('');
  const [tagline, setTagline] = useState('');
  const [story, setStory] = useState('');
  const [practices, setPractices] = useState('');
  const [days, setDays] = useState<string[]>(['Saturday']);
  const [state, setState] = useState<'idle' | 'sending' | 'done' | string>('idle');

  function toggleDay(d: string) {
    setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d]));
  }

  async function submit() {
    if (!name.trim()) {
      setState('Please enter your farm or business name.');
      return;
    }
    setState('sending');
    const err = await submitApplication({
      name: name.trim(),
      category,
      town: town.trim(),
      email: email.trim(),
      tagline: tagline.trim(),
      story: story.trim(),
      practices: practices.split(',').map((p) => p.trim()).filter(Boolean),
      market_days: days,
    });
    setState(err ?? 'done');
  }

  if (state === 'done') {
    return (
      <div className="mx-auto max-w-content px-4 py-16 text-center">
        <div className="card mx-auto max-w-lg p-8">
          <div className="text-4xl">🎉</div>
          <h1 className="mt-3 text-2xl">Application received!</h1>
          <p className="mt-2 text-brand-muted">
            Thanks, {name.split(' ')[0] || 'friend'}. Our market staff will review it and reach out.
            (In this demo, switch to the <strong>Market Admin</strong> persona to see it land in the
            application queue.)
          </p>
          <button onClick={() => navigate('/')} className="btn-primary mt-5">Back to the market</button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <p className="eyebrow">Join the market</p>
      <h1 className="text-3xl">Sell with us</h1>
      <p className="mt-1 text-brand-muted">
        Tell us about your farm or business. Applications go straight to the market office.
      </p>

      <div className="card mt-6 space-y-4 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="field-label">Farm / business name *</span>
            <input className="field-input" value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">Category</span>
            <select className="field-input" value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="field-label">Town</span>
            <input className="field-input" value={town} onChange={(e) => setTown(e.target.value)} />
          </label>
          <label className="block">
            <span className="field-label">Email</span>
            <input className="field-input" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
        </div>
        <label className="block">
          <span className="field-label">Tagline</span>
          <input className="field-input" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="What you're known for" />
        </label>
        <label className="block">
          <span className="field-label">Tell us about your farm</span>
          <textarea className="field-input min-h-[110px]" value={story} onChange={(e) => setStory(e.target.value)} />
        </label>
        <label className="block">
          <span className="field-label">Practices (comma-separated)</span>
          <input className="field-input" value={practices} onChange={(e) => setPractices(e.target.value)} placeholder="Certified Organic, No-spray" />
        </label>
        <div>
          <span className="field-label">Which markets?</span>
          <div className="mt-2 flex gap-2">
            {MARKET_DAYS.map((d) => (
              <button key={d} type="button" onClick={() => toggleDay(d)} className={['rounded-full border px-3 py-1 text-sm font-medium transition', days.includes(d) ? 'border-brand-primary bg-brand-primary text-white' : 'border-brand-line bg-brand-card text-brand-ink/70'].join(' ')}>
                {d}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button className="btn-primary" onClick={submit} disabled={state === 'sending'}>
            {state === 'sending' ? 'Submitting…' : 'Submit application'}
          </button>
          {typeof state === 'string' && state !== 'idle' && state !== 'sending' && (
            <span className="text-sm text-status-alert">{state}</span>
          )}
        </div>
      </div>
    </div>
  );
}
