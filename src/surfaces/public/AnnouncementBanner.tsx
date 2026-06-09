import { fetchActiveAnnouncements } from '@/lib/data';
import { useAsync } from '@/lib/useAsync';

// Shows the latest live public announcement — posted by staff from the admin
// portal — as a banner across the shopper site.
export function AnnouncementBanner() {
  const { data } = useAsync(() => fetchActiveAnnouncements(['public', 'all']), [], []);
  if (!data.length) return null;
  const a = data[0];
  return (
    <div className="border-b border-brand-accent/30 bg-brand-accent/15">
      <div className="mx-auto max-w-content px-4 py-2 text-sm text-brand-ink">
        <span className="font-semibold">{a.title}</span>
        <span className="text-brand-ink/80"> — {a.body}</span>
      </div>
    </div>
  );
}
