import { useEffect, useState } from 'react';

// Minimal hash router — no dependency, and hash URLs work on Cloudflare Pages
// without any redirect rules. Paths look like "#/vendors" or "#/vendor/slug".

export function currentPath(): string {
  const h = window.location.hash.replace(/^#/, '');
  return h.startsWith('/') ? h : '/' + h;
}

export function navigate(to: string) {
  const path = to.startsWith('/') ? to : '/' + to;
  if (currentPath() !== path) window.location.hash = path;
}

export function useHashRoute(): [string, (to: string) => void] {
  const [path, setPath] = useState(currentPath());
  useEffect(() => {
    const onChange = () => {
      setPath(currentPath());
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return [path, navigate];
}
