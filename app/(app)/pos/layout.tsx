import type { Metadata } from 'next';
import { PosLive } from './pos-live';

export const metadata: Metadata = { title: 'POS' };

export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <PosLive>{children}</PosLive>;
}
