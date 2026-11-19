import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Quote', robots: { index: false, follow: false } };

export default function KitchenQuoteLayout({ children }: { children: React.ReactNode }) {
  return children;
}
