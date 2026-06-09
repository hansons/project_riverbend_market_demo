// Shown on data-backed sections when the Supabase env vars aren't set yet.
// Keeps a first-run `npm run dev` informative instead of just blank.
export function SetupNotice() {
  return (
    <div className="mx-auto max-w-2xl rounded-2xl border border-dashed border-brand-line bg-brand-card p-6 text-sm text-brand-muted">
      <p className="font-semibold text-brand-primary-dark">Connect Supabase to see live data</p>
      <ol className="mt-2 list-decimal space-y-1 pl-5">
        <li>
          Copy <code className="rounded bg-brand-paper px-1">.env.example</code> →{' '}
          <code className="rounded bg-brand-paper px-1">.env.local</code> and fill in your project URL
          + anon key.
        </li>
        <li>Run the migrations and <code className="rounded bg-brand-paper px-1">seed.sql</code>.</li>
        <li>
          Run <code className="rounded bg-brand-paper px-1">npm run seed:users</code>, then restart the
          dev server.
        </li>
      </ol>
      <p className="mt-2">See the README for the full runbook.</p>
    </div>
  );
}
