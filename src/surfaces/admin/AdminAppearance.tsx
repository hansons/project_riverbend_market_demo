import { ThemePicker } from '@/components/ThemePicker';

export function AdminAppearance() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl">Appearance</h2>
        <p className="mt-1 text-sm text-brand-muted">
          Pick a look for your market. Applying a palette updates your public site and the portals for
          everyone — switch it up seasonally or whenever you want a refresh. (“Harvest” is the original.)
        </p>
      </div>
      <ThemePicker />
    </div>
  );
}
