'use client';

import Link from 'next/link';
import { Suspense, useState } from 'react';
import { Plus } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';
import { useEnquiries, useFeedback } from '@/hooks/use-queries';
import { PageHeader, SectionErrorBoundary, SectionTabs, useSectionTab, type SectionTab } from '@/components/app';
import Churn from './churn';
import Interactions from './interactions';
import { logFeedbackHref } from './interaction-utils';

const PRIMARY_BTN = 'inline-flex h-9 items-center gap-1.5 rounded-md bg-primary px-3.5 text-sm font-medium text-primary-foreground shadow-sm transition-colors hover:bg-primary/90';

type EngagementTab = 'churn' | 'interactions';

export default function EngagementPage() {
  return <Suspense fallback={<p role="status">Loading engagement…</p>}><Engagement /></Suspense>;
}

function Engagement() {
  const { can } = usePermissions();
  const churn = can('customers.view');
  const interactions = can('interactions.view');
  const canLogFeedback = interactions && can('interactions.create');
  const [feedbackSignal, setFeedbackSignal] = useState(0);

  // Same queries (and cache keys) as the Interactions tab and the sidebar badge.
  const { data: feedback } = useFeedback(undefined, { enabled: interactions });
  const { data: enquiries } = useEnquiries(undefined, { enabled: interactions });
  const openTickets = (feedback?.filter((f) => f.status === 'Open').length ?? 0)
    + (enquiries?.filter((e) => e.status === 'Open').length ?? 0);

  const tabs: SectionTab<EngagementTab>[] = [
    { id: 'churn', label: 'Churn', hidden: !churn },
    { id: 'interactions', label: 'Interactions', count: openTickets, countTone: 'warning', hidden: !interactions },
  ];
  const defaultTab: EngagementTab = churn ? 'churn' : 'interactions';
  const active = useSectionTab(tabs, defaultTab);

  if (!churn && !interactions) {
    return <p className="text-muted-foreground">You don’t have access to Engagement.</p>;
  }

  const action = canLogFeedback && (active === 'interactions' ? (
    <button type="button" onClick={() => setFeedbackSignal((n) => n + 1)} className={PRIMARY_BTN}>
      <Plus size={16} aria-hidden /> Log feedback
    </button>
  ) : (
    <Link href={logFeedbackHref()} className={PRIMARY_BTN}>
      <Plus size={16} aria-hidden /> Log feedback
    </Link>
  ));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Engagement"
        description={active === 'churn'
          ? 'Customers buying less often than usual, to win back this week.'
          : 'Feedback, enquiries and compensations to log and resolve.'}
        actions={action || undefined}
        tabs={<SectionTabs label="Engagement sections" tabs={tabs} defaultTab={defaultTab} inlineOnMobile />}
      />
      <SectionErrorBoundary label={active === 'churn' ? 'Churn' : 'Interactions'} resetKey={active}>
        {active === 'interactions' ? <Interactions openFeedbackSignal={feedbackSignal} /> : <Churn />}
      </SectionErrorBoundary>
    </div>
  );
}
