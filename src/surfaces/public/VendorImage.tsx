import { useState } from 'react';
import { categoryEmoji } from '@/lib/format';
import type { Vendor } from '@/lib/types';

// Renders a vendor's photo, falling back to the category emoji tile if there's
// no image_url or the image fails to load (the seed uses many external photos).
export function VendorImage({
  vendor,
  className,
  emojiClass = 'text-4xl',
}: {
  vendor: Pick<Vendor, 'image_url' | 'category' | 'name'>;
  className?: string;
  emojiClass?: string;
}) {
  const [failed, setFailed] = useState(false);

  if (!vendor.image_url || failed) {
    return (
      <div className={`grid h-full w-full place-items-center bg-brand-paper ${emojiClass}`}>
        {categoryEmoji(vendor.category)}
      </div>
    );
  }

  return (
    <img
      src={vendor.image_url}
      alt={vendor.name}
      loading="lazy"
      onError={() => setFailed(true)}
      className={className}
    />
  );
}
