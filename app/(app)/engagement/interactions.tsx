'use client';

import { useCallback, useMemo, useState } from 'react';
import { BarChart3, Plus } from 'lucide-react';
import { KpiStrip, OverflowMenu, SectionTabs, useSectionTab, type SectionTab } from '@/components/app';
import { useExport } from '@/hooks/use-export';
import { COMPENSATION_EXPORT_COLUMNS, ENQUIRY_EXPORT_COLUMNS, FEEDBACK_EXPORT_COLUMNS } from '@/lib/exports/engagement';
import { usePermissions } from '@/hooks/use-permissions';
import { useUrlState } from '@/hooks/use-url-state';
import { fetchInteractionPage, useCompensations, useCustomers, useEnquiries, useFeedback } from '@/hooks/use-queries';
import { formatCount, formatMoneyShort, plural } from '@/lib/format';
import { FeedbackType, type Compensation, type Enquiry, type Feedback } from '@/types';
import { CompensationDrawer } from './compensation-drawer';
import { CompensationForm } from './compensation-form';
import { CompensationTable } from './compensation-table';
import { EnquiryDrawer } from './enquiry-drawer';
import { EnquiryForm } from './enquiry-form';
import { EnquiryTable, type EnquiryStatusFilter } from './enquiry-table';
import { FeedbackDrawer, type FeedbackIntent } from './feedback-drawer';
import { FeedbackForm } from './feedback-form';
import { FeedbackTable, type FeedbackFilters } from './feedback-table';
import { InteractionInsights } from './interaction-insights';
import { calcResolutionDays, matchesText, useFeedbackDeepLink, type InteractionView } from './interaction-utils';

type Drawer =
  | { kind: 'feedback'; id: string; intent: FeedbackIntent }
  | { kind: 'enquiry'; id: string; focusClose: boolean }
  | { kind: 'compensation'; id: string };

const TOOL_BTN = 'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-md border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted aria-pressed:bg-muted';

export default function Interactions({ openFeedbackSignal = 0 }: Readonly<{
  /** Bumped by the page header's "Log feedback" button to open the form. */
  openFeedbackSignal?: number;
}>) {
  const { can } = usePermissions();
  const { set } = useUrlState();
  const { data: feedbacks = [], isFetching: feedbackFetching } = useFeedback();
  const { data: enquiries = [], isFetching: enquiriesFetching } = useEnquiries();
  const { data: compensations = [], isFetching: compensationsFetching } = useCompensations();
  const { data: customerList } = useCustomers();
  const customers = useMemo(() => customerList?.items ?? [], [customerList]);

  const [search, setSearch] = useState('');
  const [showInsights, setShowInsights] = useState(false);
  const [fbFilters, setFbFilters] = useState<FeedbackFilters>({ status: 'Open', type: 'All', priority: 'All' });
  const [enqStatus, setEnqStatus] = useState<EnquiryStatusFilter>('Open');
  const [drawer, setDrawer] = useState<Drawer | null>(null);
  const [form, setForm] = useState<{ kind: 'feedback'; customerId: string | null } | { kind: 'enquiry' } | { kind: 'compensation' } | null>(null);

  // /engagement?tab=interactions&new=feedback[&customer=<id>]
  useFeedbackDeepLink((customerId) => setForm({ kind: 'feedback', customerId }));
  const [seenFeedbackSignal, setSeenFeedbackSignal] = useState(openFeedbackSignal);
  if (openFeedbackSignal !== seenFeedbackSignal) {
    setSeenFeedbackSignal(openFeedbackSignal);
    setForm({ kind: 'feedback', customerId: null });
  }

  const counts = useMemo(() => {
    const resolved = feedbacks.filter((f) => f.status === 'Resolved' && f.resolvedDate);
    const totalDays = resolved.reduce((sum, f) => sum + calcResolutionDays(f.date, f.resolvedDate!), 0);
    return {
      openFeedback: feedbacks.filter((f) => f.status === 'Open').length,
      openComplaints: feedbacks.filter((f) => f.status === 'Open' && f.type === FeedbackType.COMPLAINT).length,
      openEnquiries: enquiries.filter((e) => e.status === 'Open').length,
      pendingComps: compensations.filter((c) => c.status === 'Pending').length,
      compValue: compensations.reduce((a, c) => a + c.amount, 0),
      avgResolution: resolved.length > 0 ? totalDays / resolved.length : null,
      resolvedCount: resolved.length,
      // Same as the old KPI: feedback plus enquiries (compensations are counted by value).
      total: feedbacks.length + enquiries.length,
      satisfaction: feedbacks.length > 0 ? Math.round((feedbacks.filter((f) => f.type === FeedbackType.APPRECIATION).length / feedbacks.length) * 100) : 0,
    };
  }, [feedbacks, enquiries, compensations]);

  const views: SectionTab<InteractionView>[] = [
    { id: 'feedback', label: 'Feedback', count: counts.openFeedback, countTone: 'warning' },
    { id: 'enquiries', label: 'Enquiries', count: counts.openEnquiries, countTone: 'warning' },
    { id: 'compensations', label: 'Compensations', count: counts.pendingComps },
  ];
  const view = useSectionTab(views, 'feedback', 'view');
  const showView = (v: InteractionView) => set({ view: v === 'feedback' ? null : v });

  // One filter per view for the table and its export, so both hold the same rows.
  const selectFeedback = useCallback((all: Feedback[]) => all.filter((f) =>
    (fbFilters.status === 'All' || f.status === fbFilters.status)
    && (fbFilters.type === 'All' || f.type === fbFilters.type)
    && (fbFilters.priority === 'All' || f.priority === fbFilters.priority)
    && matchesText(search, f.customerName, f.content)), [fbFilters, search]);
  const selectEnquiries = useCallback((all: Enquiry[]) => all.filter((e) =>
    (enqStatus === 'All' || e.status === enqStatus) && matchesText(search, e.customerName, e.subject, e.message)), [enqStatus, search]);
  const selectComps = useCallback((all: Compensation[]) => all.filter((c) => matchesText(search, c.customerName, c.reason)), [search]);
  const filteredFeedback = useMemo(() => selectFeedback(feedbacks), [feedbacks, selectFeedback]);
  const filteredEnquiries = useMemo(() => selectEnquiries(enquiries), [enquiries, selectEnquiries]);
  const filteredComps = useMemo(() => selectComps(compensations), [compensations, selectComps]);

  const kpisLoading = (feedbackFetching && feedbacks.length === 0)
    || (enquiriesFetching && enquiries.length === 0)
    || (compensationsFetching && compensations.length === 0);
  const complaintsActive = view === 'feedback' && fbFilters.status === 'Open' && fbFilters.type === FeedbackType.COMPLAINT;

  const canCreate = can('interactions.create');
  // Each view exports every row its filters match, paging through the API (100 a page, the backend cap).
  const exportFeedback = useExport({
    module: 'feedback', noun: { one: 'feedback item', many: 'feedback items' }, columns: FEEDBACK_EXPORT_COLUMNS,
    fetchPage: (p, l) => fetchInteractionPage('feedback', p, l), select: selectFeedback, pageSize: 100, disabled: filteredFeedback.length === 0,
  });
  const exportEnquiries = useExport({
    module: 'enquiries', noun: { one: 'enquiry', many: 'enquiries' }, columns: ENQUIRY_EXPORT_COLUMNS,
    fetchPage: (p, l) => fetchInteractionPage('enquiries', p, l), select: selectEnquiries, pageSize: 100, disabled: filteredEnquiries.length === 0,
  });
  const exportComps = useExport({
    module: 'compensations', noun: { one: 'compensation', many: 'compensations' }, columns: COMPENSATION_EXPORT_COLUMNS,
    fetchPage: (p, l) => fetchInteractionPage('compensations', p, l), select: selectComps, pageSize: 100, disabled: filteredComps.length === 0,
  });
  const viewExport = view === 'enquiries'
    ? { label: 'More enquiry actions', item: exportEnquiries.item }
    : view === 'compensations'
      ? { label: 'More compensation actions', item: exportComps.item }
      : { label: 'More feedback actions', item: exportFeedback.item };

  const trailing = (
    <>
      <button type="button" aria-pressed={showInsights} onClick={() => setShowInsights((s) => !s)} className={TOOL_BTN}>
        <BarChart3 size={16} aria-hidden /> Insights
      </button>
      {canCreate && view === 'enquiries' && (
        <button type="button" onClick={() => setForm({ kind: 'enquiry' })} className={TOOL_BTN}><Plus size={16} aria-hidden /> Record enquiry</button>
      )}
      {canCreate && view === 'compensations' && (
        <button type="button" onClick={() => setForm({ kind: 'compensation' })} className={TOOL_BTN}><Plus size={16} aria-hidden /> Record compensation</button>
      )}
      <OverflowMenu label={viewExport.label} items={[viewExport.item]} />
    </>
  );

  const openFeedback = drawer?.kind === 'feedback' ? feedbacks.find((f) => f.id === drawer.id) : undefined;
  const openEnquiry = drawer?.kind === 'enquiry' ? enquiries.find((e) => e.id === drawer.id) : undefined;
  const openComp = drawer?.kind === 'compensation' ? compensations.find((c) => c.id === drawer.id) : undefined;

  return (
    <div className="space-y-4">
      <KpiStrip
        loading={kpisLoading}
        label="Interaction figures"
        cells={[
          {
            label: 'Open complaints',
            value: formatCount(counts.openComplaints),
            tone: counts.openComplaints > 0 ? 'danger' : 'default',
            detail: `${plural(counts.openFeedback, 'open feedback item')} in all`,
            active: complaintsActive,
            onClick: () => {
              showView('feedback');
              setFbFilters(complaintsActive ? { status: 'Open', type: 'All', priority: 'All' } : { status: 'Open', type: FeedbackType.COMPLAINT, priority: 'All' });
            },
          },
          {
            label: 'Open enquiries',
            value: formatCount(counts.openEnquiries),
            tone: counts.openEnquiries > 0 ? 'warning' : 'default',
            detail: 'Waiting for an answer',
            active: view === 'enquiries' && enqStatus === 'Open',
            onClick: () => { showView('enquiries'); setEnqStatus('Open'); },
          },
          {
            label: 'Average resolution',
            value: counts.avgResolution === null ? '-' : `${counts.avgResolution.toFixed(1)}d`,
            detail: counts.resolvedCount ? `Across ${plural(counts.resolvedCount, 'resolved item')}` : 'Nothing resolved yet',
          },
          {
            label: 'Compensation value',
            value: formatMoneyShort(counts.compValue),
            detail: counts.pendingComps ? `${formatCount(counts.pendingComps)} pending approval` : 'None pending',
            active: view === 'compensations',
            onClick: () => showView('compensations'),
          },
        ]}
      />

      <KpiStrip
        loading={kpisLoading}
        label="Interaction volume"
        cells={[
          {
            label: 'Total interactions',
            value: formatCount(counts.total),
            detail: `${plural(feedbacks.length, 'feedback item')}, ${plural(enquiries.length, 'enquiry', 'enquiries')}`,
          },
          {
            label: 'Satisfaction',
            value: `${counts.satisfaction}%`,
            detail: feedbacks.length ? 'Share of feedback that is appreciation' : 'No feedback yet',
          },
        ]}
      />

      {showInsights && <InteractionInsights feedbacks={feedbacks} customers={customers} />}

      <SectionTabs label="Interaction types" tabs={views} param="view" defaultTab="feedback" />

      {view === 'feedback' && (
        <FeedbackTable
          rows={filteredFeedback}
          loading={feedbackFetching && feedbacks.length === 0}
          search={search}
          onSearch={setSearch}
          filters={fbFilters}
          onFilters={(p) => setFbFilters((f) => ({ ...f, ...p }))}
          onOpen={(f, intent) => setDrawer({ kind: 'feedback', id: f.id, intent })}
          trailing={trailing}
        />
      )}
      {view === 'enquiries' && (
        <EnquiryTable
          rows={filteredEnquiries}
          loading={enquiriesFetching && enquiries.length === 0}
          search={search}
          onSearch={setSearch}
          status={enqStatus}
          onStatus={setEnqStatus}
          onOpen={(e, focusClose) => setDrawer({ kind: 'enquiry', id: e.id, focusClose })}
          trailing={trailing}
        />
      )}
      {view === 'compensations' && (
        <CompensationTable
          rows={filteredComps}
          total={{ count: compensations.length, value: counts.compValue }}
          loading={compensationsFetching && compensations.length === 0}
          search={search}
          onSearch={setSearch}
          onOpen={(c) => setDrawer({ kind: 'compensation', id: c.id })}
          trailing={trailing}
        />
      )}

      {openFeedback && drawer?.kind === 'feedback' && (
        <FeedbackDrawer key={`${openFeedback.id}-${drawer.intent}`} feedback={openFeedback} intent={drawer.intent} customers={customers} onClose={() => setDrawer(null)} />
      )}
      {openEnquiry && drawer?.kind === 'enquiry' && (
        <EnquiryDrawer key={openEnquiry.id} enquiry={openEnquiry} focusClose={drawer.focusClose} onClose={() => setDrawer(null)} />
      )}
      {openComp && <CompensationDrawer compensation={openComp} onClose={() => setDrawer(null)} />}

      {form?.kind === 'feedback' && <FeedbackForm initialCustomerId={form.customerId} onClose={() => setForm(null)} />}
      {form?.kind === 'enquiry' && <EnquiryForm customers={customers} onClose={() => setForm(null)} />}
      {form?.kind === 'compensation' && <CompensationForm customers={customers} onClose={() => setForm(null)} />}
    </div>
  );
}
