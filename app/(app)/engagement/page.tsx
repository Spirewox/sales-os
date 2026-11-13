'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import Churn from './churn';
import Interactions from './interactions';

export default function EngagementPage() {
  return <Suspense fallback={<p role="status">Loading engagement…</p>}><Engagement /></Suspense>;
}

function Engagement() {
  const params = useSearchParams();
  const { can } = usePermissions();
  const churn = can('customers.view');
  const interactions = can('interactions.view');
  const active = interactions && (!churn || params.get('tab') === 'interactions')
    ? 'interactions' : 'churn';

  if (!churn && !interactions) {
    return <p className="text-muted-foreground">You don’t have access to Engagement.</p>;
  }

  const tabs = [
    ...(churn ? [{ id: 'churn', label: 'Churn', href: '/engagement' }] : []),
    ...(interactions ? [{ id: 'interactions', label: 'Interactions', href: '/engagement?tab=interactions' }] : []),
  ];
  return (
    <div className="space-y-6">
      <header className="space-y-3">
        <h1 className="text-2xl font-black tracking-tight">Engagement</h1>
        <nav aria-label="Engagement sections" className="flex flex-wrap gap-2 border-b">
          {tabs.map(tab => (
            <Link key={tab.id} href={tab.href} aria-current={active === tab.id ? 'page' : undefined}
              className="inline-flex min-h-11 items-center border-b-2 border-transparent px-3 text-sm font-semibold text-muted-foreground hover:text-foreground aria-[current=page]:border-primary aria-[current=page]:text-foreground">
              {tab.label}
            </Link>
          ))}
        </nav>
      </header>
      {active === 'interactions' ? <Interactions /> : <Churn />}
    </div>
  );
}
