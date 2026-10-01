'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { TableSkeleton } from '@/components/ui/loading-skeletons';
import { usePermissions } from '@/hooks/use-permissions';
import {
  useFeedback, useCreateFeedback, useResolveFeedback, useUpdateFeedbackPriority,
  useEnquiries, useCreateEnquiry, useResolveEnquiry,
  useCompensations, useCreateCompensation, useUpdateCompensationStatus,
  useCustomers,
} from '@/hooks/use-queries';
import {
  Feedback, FeedbackType, FeedbackPriority, Sentiment,
  Enquiry, EnquiryCategory,
  Compensation, CompensationCategory, Customer,
} from '@/types';
import { toast } from 'sonner';
import { SubmitButton } from '@/components/submit-button';
import { SearchableCustomerSelect } from '@/components/searchable-customer-select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  MessageSquare, Mail, RefreshCw, Plus, Search, X, Filter,
  CheckCircle2, Clock, AlertTriangle, SmilePlus,
  ThumbsUp, ThumbsDown, Minus, Gift, Tag, User,
  ChevronRight, Inbox, ShoppingBag, Ticket, Banknote,
  BarChart3, PieChart as PieIcon, TrendingUp,
  MoreHorizontal, ArrowUp, Eye, XCircle, BadgeCheck, Send,
  Flag, Phone, MailOpen,
} from 'lucide-react';

type MainTab = 'feedback' | 'enquiries' | 'compensations';

const COLORS = ['#22c55e', '#94a3b8', '#ef4444'];
const ENQUIRY_CATEGORIES: EnquiryCategory[] = ['Product Info', 'Pricing', 'Support', 'Delivery', 'Other'];

const PRIORITY_STYLES: Record<FeedbackPriority, string> = {
  [FeedbackPriority.LOW]: 'bg-green-100 text-green-800',
  [FeedbackPriority.MEDIUM]: 'bg-yellow-100 text-yellow-800',
  [FeedbackPriority.HIGH]: 'bg-orange-100 text-orange-800',
  [FeedbackPriority.URGENT]: 'bg-red-100 text-red-800',
};

const CATEGORY_COLORS: Record<EnquiryCategory, string> = {
  'Product Info': 'bg-purple-100 text-purple-800',
  'Pricing': 'bg-amber-100 text-amber-800',
  'Support': 'bg-red-100 text-red-800',
  'Delivery': 'bg-teal-100 text-teal-800',
  'Other': 'bg-slate-100 text-slate-800',
};

const HAS_API = Boolean(process.env.NEXT_PUBLIC_API_URL);

function calcResolutionDays(dateStr: string, resolvedStr: string): number {
  const d1 = new Date(dateStr);
  const d2 = new Date(resolvedStr);
  return Math.max(0, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)));
}

function findCustomerByName(name: string, customers: Customer[]): Customer | undefined {
  return customers.find((c) => c.name.toLowerCase() === name.trim().toLowerCase());
}

export default function InteractionsPage() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { data: feedbacks = [], isFetching: feedbackFetching } = useFeedback();
  const { data: enquiries = [], isFetching: enquiriesFetching } = useEnquiries();
  const { data: compensations = [], isFetching: compensationsFetching } = useCompensations();
  const { data: customerList } = useCustomers();
  const customers = customerList?.items ?? [];
  const createFeedback = useCreateFeedback();
  const resolveFeedback = useResolveFeedback();
  const updateFeedbackPriority = useUpdateFeedbackPriority();
  const createEnquiry = useCreateEnquiry();
  const resolveEnquiry = useResolveEnquiry();
  const createCompensation = useCreateCompensation();
  const updateCompensationStatus = useUpdateCompensationStatus();

  // --- Shared state ---
  const [activeTab, setActiveTab] = useState<MainTab>('feedback');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(false);

  // --- Feedback state ---
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [fbFilterStatus, setFbFilterStatus] = useState<'All' | 'Open' | 'Resolved'>('All');
  const [fbFilterType, setFbFilterType] = useState<FeedbackType | 'All'>('All');
  const [fbFilterPriority, setFbFilterPriority] = useState<FeedbackPriority | 'All'>('All');
  const [newFbContent, setNewFbContent] = useState('');
  const [newFbType, setNewFbType] = useState<FeedbackType>(FeedbackType.COMPLAINT);
  const [newFbPriority, setNewFbPriority] = useState<FeedbackPriority>(FeedbackPriority.MEDIUM);
  const [newFbCustomer, setNewFbCustomer] = useState('');
  const [feedbackCustomerSearch, setFeedbackCustomerSearch] = useState('');
  const [debouncedFeedbackCustomerSearch, setDebouncedFeedbackCustomerSearch] = useState('');
  const [pinnedFeedbackCustomer, setPinnedFeedbackCustomer] = useState<Customer | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');

  const { data: feedbackCustomerList, isFetching: feedbackCustomersFetching } =
    useCustomers(
      {
        search: debouncedFeedbackCustomerSearch || undefined,
        limit: 50,
      },
      { enabled: showFeedbackModal },
    );

  const feedbackModalCustomers = useMemo(() => {
    const items = feedbackCustomerList?.items ?? [];
    if (
      pinnedFeedbackCustomer &&
      !items.some((customer) => customer.id === pinnedFeedbackCustomer.id)
    ) {
      return [pinnedFeedbackCustomer, ...items];
    }
    return items;
  }, [feedbackCustomerList, pinnedFeedbackCustomer]);

  useEffect(() => {
    const timer = setTimeout(
      () => setDebouncedFeedbackCustomerSearch(feedbackCustomerSearch.trim()),
      300,
    );
    return () => clearTimeout(timer);
  }, [feedbackCustomerSearch]);

  useEffect(() => {
    if (!newFbCustomer) {
      setPinnedFeedbackCustomer(null);
      return;
    }
    const selected = feedbackModalCustomers.find(
      (customer) => customer.id === newFbCustomer,
    );
    if (selected) setPinnedFeedbackCustomer(selected);
  }, [newFbCustomer, feedbackModalCustomers]);

  // --- Enquiry state ---
  const [showEnquiryModal, setShowEnquiryModal] = useState(false);
  const [selectedEnquiry, setSelectedEnquiry] = useState<Enquiry | null>(null);
  const [enqFilterStatus, setEnqFilterStatus] = useState<'All' | 'Open' | 'Closed'>('All');
  const [newEnquiry, setNewEnquiry] = useState<Partial<Enquiry>>({ date: new Date().toISOString().split('T')[0], category: 'Other' });
  const [enqResolution, setEnqResolution] = useState('');

  // --- Compensation state ---
  const [showCompModal, setShowCompModal] = useState(false);
  const [newComp, setNewComp] = useState<Partial<Compensation>>({ status: 'Pending', category: CompensationCategory.PRODUCT });

  // --- Compensation from feedback resolution ---
  const [showCompFromFeedback, setShowCompFromFeedback] = useState(false);
  const [compFromFbData, setCompFromFbData] = useState<Partial<Compensation>>({ status: 'Pending', category: CompensationCategory.PRODUCT });

  // --- Action menu state ---
  const [openActionId, setOpenActionId] = useState<string | null>(null);
  const [quickResolveId, setQuickResolveId] = useState<string | null>(null);
  const [quickResolveNote, setQuickResolveNote] = useState('');
  const [quickCloseId, setQuickCloseId] = useState<string | null>(null);
  const [quickCloseNote, setQuickCloseNote] = useState('');

  // ============ KPIs ============
  const kpis = useMemo(() => {
    const openFeedback = feedbacks.filter((f) => f.status === 'Open').length;
    const openEnquiries = enquiries.filter((e) => e.status === 'Open').length;
    const totalComps = compensations.reduce((a, c) => a + c.amount, 0);
    const openComplaints = feedbacks.filter((f) => f.status === 'Open' && f.type === FeedbackType.COMPLAINT).length;

    const resolved = feedbacks.filter((f) => f.status === 'Resolved' && f.resolvedDate);
    const totalDays = resolved.reduce((sum, f) => sum + calcResolutionDays(f.date, f.resolvedDate!), 0);
    const avgResolution = resolved.length > 0 ? (totalDays / resolved.length).toFixed(1) : '--';

    const appreciations = feedbacks.filter((f) => f.type === FeedbackType.APPRECIATION).length;
    const satisfactionRate = feedbacks.length > 0 ? Math.round((appreciations / feedbacks.length) * 100) : 0;

    return {
      totalInteractions: feedbacks.length + enquiries.length,
      openFeedback, openEnquiries, openComplaints,
      totalComps, avgResolution, satisfactionRate,
      pendingComps: compensations.filter((c) => c.status === 'Pending').length,
    };
  }, [feedbacks, enquiries, compensations]);

  // ============ Analytics data ============
  const sentimentData = useMemo(() => {
    const counts: Record<string, number> = { Positive: 0, Neutral: 0, Negative: 0 };
    feedbacks.forEach((f) => { counts[f.sentiment || 'Neutral']++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [feedbacks]);

  const complaintsBySegmentData = useMemo(() => {
    const segCounts: Record<string, number> = {};
    feedbacks.filter((f) => f.type === FeedbackType.COMPLAINT).forEach((f) => {
      const customer = customers.find((c) => c.id === f.customerId || c.name === f.customerName);
      if (customer?.segments?.length) customer.segments.forEach((seg) => { segCounts[seg] = (segCounts[seg] || 0) + 1; });
      else segCounts['Unassigned'] = (segCounts['Unassigned'] || 0) + 1;
    });
    return Object.entries(segCounts).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
  }, [feedbacks, customers]);

  // ============ Feedback Handlers ============
  const closeFeedbackModal = () => {
    setShowFeedbackModal(false);
    setNewFbCustomer('');
    setFeedbackCustomerSearch('');
    setDebouncedFeedbackCustomerSearch('');
    setPinnedFeedbackCustomer(null);
  };

  const handleSubmitFeedback = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    if (!newFbContent || !newFbCustomer) { toast.error('Customer and content are required.'); return; }
    const cust =
      feedbackModalCustomers.find((customer) => customer.id === newFbCustomer) ??
      pinnedFeedbackCustomer;
    if (!cust) { toast.error('Select a customer from the list (must exist in CRM).'); return; }
    try {
      await createFeedback.mutateAsync({
        customerId: cust.id,
        customerName: cust.name,
        type: newFbType,
        content: newFbContent,
        priority: newFbPriority,
      });
      setNewFbContent('');
      setNewFbPriority(FeedbackPriority.MEDIUM);
      closeFeedbackModal();
      toast.success('Feedback recorded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record feedback.');
    }
  };

  const handleResolveFeedback = async () => {
    if (!selectedFeedback || !resolutionNote) return;
    try {
      await resolveFeedback.mutateAsync({ id: selectedFeedback.id, resolution: resolutionNote });
      setSelectedFeedback(null); setResolutionNote('');
      toast.success('Feedback resolved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve feedback.');
    }
  };

  const getSentimentIcon = (sentiment?: Sentiment) => {
    if (sentiment === Sentiment.POSITIVE) return <ThumbsUp size={14} className="text-green-500" />;
    if (sentiment === Sentiment.NEGATIVE) return <ThumbsDown size={14} className="text-red-500" />;
    return <Minus size={14} className="text-muted-foreground" />;
  };

  const filteredFeedbacks = useMemo(() => feedbacks.filter((f) => {
    const matchStatus = fbFilterStatus === 'All' || f.status === fbFilterStatus;
    const matchType = fbFilterType === 'All' || f.type === fbFilterType;
    const matchPriority = fbFilterPriority === 'All' || f.priority === fbFilterPriority;
    const matchSearch = f.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || f.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchType && matchPriority && matchSearch;
  }), [feedbacks, fbFilterStatus, fbFilterType, fbFilterPriority, searchTerm]);

  // ============ Enquiry Handlers ============
  const handleSaveEnquiry = async () => {
    if (!newEnquiry.customerName || !newEnquiry.message) { toast.error('Customer name and message are required.'); return; }
    try {
      await createEnquiry.mutateAsync({
        customerName: newEnquiry.customerName!,
        email: newEnquiry.email,
        subject: newEnquiry.subject,
        message: newEnquiry.message!,
        date: newEnquiry.date,
        category: (newEnquiry.category as EnquiryCategory) || 'Other',
      });
      setShowEnquiryModal(false); setNewEnquiry({ date: new Date().toISOString().split('T')[0], category: 'Other' });
      toast.success('Enquiry recorded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record enquiry.');
    }
  };

  const handleResolveEnquiry = async () => {
    if (!selectedEnquiry || !enqResolution) return;
    try {
      await resolveEnquiry.mutateAsync({ id: selectedEnquiry.id, resolution: enqResolution });
      setSelectedEnquiry(null); setEnqResolution('');
      toast.success('Enquiry closed.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to close enquiry.');
    }
  };

  const filteredEnquiries = useMemo(() => enquiries.filter((enq) => {
    const matchStatus = enqFilterStatus === 'All' || enq.status === enqFilterStatus;
    const matchSearch = enq.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enq.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      enq.message.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  }), [enquiries, enqFilterStatus, searchTerm]);

  // ============ Compensation Handlers ============
  const handleSaveComp = async () => {
    if (!newComp.customerName || !newComp.amount) { toast.error('Customer name and amount are required.'); return; }
    const cust = findCustomerByName(newComp.customerName!, customers);
    if (HAS_API && !cust) { toast.error('Select a customer from the list (must exist in CRM).'); return; }
    try {
      await createCompensation.mutateAsync({
        customerId: cust?.id || '0',
        customerName: cust?.name || newComp.customerName!,
        reason: newComp.reason || '',
        amount: Number(newComp.amount),
        status: (newComp.status as Compensation['status']) || 'Pending',
        category: (newComp.category as CompensationCategory) || CompensationCategory.PRODUCT,
        recordedByAgentId: user?.id,
        recordedByAgentName: user?.name,
      });
      setShowCompModal(false); setNewComp({ status: 'Pending', category: CompensationCategory.PRODUCT });
      toast.success('Compensation recorded.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to record compensation.');
    }
  };

  const handleSaveCompFromFeedback = async () => {
    if (!compFromFbData.amount || !compFromFbData.customerName) return;
    const cust = findCustomerByName(compFromFbData.customerName!, customers)
      ?? (compFromFbData.customerId ? customers.find((c) => c.id === compFromFbData.customerId) : undefined);
    if (HAS_API && !cust) { toast.error('Customer not found in CRM.'); return; }
    try {
      const item = await createCompensation.mutateAsync({
        customerId: cust?.id || compFromFbData.customerId || '0',
        customerName: cust?.name || compFromFbData.customerName!,
        reason: compFromFbData.reason || '',
        amount: Number(compFromFbData.amount),
        status: (compFromFbData.status as Compensation['status']) || 'Pending',
        category: (compFromFbData.category as CompensationCategory) || CompensationCategory.PRODUCT,
        recordedByAgentId: user?.id,
        recordedByAgentName: user?.name,
      });
      setShowCompFromFeedback(false);
      setResolutionNote((prev) => prev ? `${prev}\n[Compensation] \u20A6${item.amount.toLocaleString()} (${item.category}) issued.` : `[Compensation] \u20A6${item.amount.toLocaleString()} (${item.category}) issued.`);
      toast.success('Compensation issued.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to issue compensation.');
    }
  };

  const filteredCompensations = useMemo(() => compensations.filter((c) => {
    return c.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.reason.toLowerCase().includes(searchTerm.toLowerCase());
  }), [compensations, searchTerm]);

  const getCategoryIcon = (cat: CompensationCategory) => {
    const map = { [CompensationCategory.PRODUCT]: <ShoppingBag size={12} />, [CompensationCategory.MERCH]: <Gift size={12} />, [CompensationCategory.VOUCHER]: <Ticket size={12} />, [CompensationCategory.REFUND]: <Banknote size={12} /> };
    return map[cat] || <Tag size={12} />;
  };

  // ============ Quick Action Handlers ============
  const handleEscalatePriority = async (fbId: string) => {
    const priorityOrder: FeedbackPriority[] = [FeedbackPriority.LOW, FeedbackPriority.MEDIUM, FeedbackPriority.HIGH, FeedbackPriority.URGENT];
    const fb = feedbacks.find((f) => f.id === fbId);
    if (!fb) return;
    const currentIdx = priorityOrder.indexOf(fb.priority || FeedbackPriority.MEDIUM);
    const nextPriority = currentIdx < priorityOrder.length - 1 ? priorityOrder[currentIdx + 1] : fb.priority;
    if (nextPriority === fb.priority) {
      toast.info('Already at highest priority.');
      setOpenActionId(null);
      return;
    }
    try {
      await updateFeedbackPriority.mutateAsync({ id: fbId, priority: nextPriority! });
      setOpenActionId(null);
      toast.success('Priority escalated.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to escalate priority.');
    }
  };

  const handleQuickResolve = async (fbId: string) => {
    if (!quickResolveNote.trim()) { toast.error('Resolution note is required.'); return; }
    try {
      await resolveFeedback.mutateAsync({ id: fbId, resolution: quickResolveNote });
      setQuickResolveId(null); setQuickResolveNote('');
      toast.success('Feedback resolved.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve feedback.');
    }
  };

  const handleQuickClose = async (enqId: string) => {
    if (!quickCloseNote.trim()) { toast.error('Resolution note is required.'); return; }
    try {
      await resolveEnquiry.mutateAsync({ id: enqId, resolution: quickCloseNote });
      setQuickCloseId(null); setQuickCloseNote('');
      toast.success('Enquiry closed.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to close enquiry.');
    }
  };

  const handleCompStatusChange = async (compId: string, newStatus: Compensation['status']) => {
    try {
      await updateCompensationStatus.mutateAsync({ id: compId, status: newStatus });
      setOpenActionId(null);
      toast.success(`Compensation marked as ${newStatus}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update compensation.');
    }
  };

  // ============ Add button handler ============
  const handleAddNew = () => {
    if (activeTab === 'feedback') {
      setNewFbCustomer('');
      setFeedbackCustomerSearch('');
      setDebouncedFeedbackCustomerSearch('');
      setPinnedFeedbackCustomer(null);
      setShowFeedbackModal(true);
    }
    else if (activeTab === 'enquiries') setShowEnquiryModal(true);
    else setShowCompModal(true);
  };

  const addLabel = activeTab === 'feedback' ? 'Record Feedback' : activeTab === 'enquiries' ? 'Record Enquiry' : 'Record Compensation';

  // ============ RENDER ============
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customer Interactions</h1>
          <p className="text-muted-foreground text-sm">Feedback, enquiries, and compensations in one place.</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowAnalytics(!showAnalytics)} className={`inline-flex items-center rounded-md text-sm font-medium border h-10 px-4 py-2 ${showAnalytics ? 'bg-secondary text-secondary-foreground' : 'bg-background hover:bg-accent border-input'}`}>
            <BarChart3 size={16} className="mr-2" /> Insights
          </button>
          {can('interactions.create') && (
            <button onClick={handleAddNew} className="inline-flex items-center rounded-md text-sm font-medium bg-primary text-primary-foreground shadow hover:bg-primary/90 h-10 px-4 py-2">
              <Plus size={16} className="mr-2" /> {addLabel}
            </button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingUp size={14} className="text-muted-foreground" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Total</span></div>
          <p className="text-2xl font-black">{kpis.totalInteractions}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><AlertTriangle size={14} className="text-red-500" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Open Complaints</span></div>
          <p className="text-2xl font-black">{kpis.openComplaints}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><Mail size={14} className="text-blue-500" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Open Enquiries</span></div>
          <p className="text-2xl font-black">{kpis.openEnquiries}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><Clock size={14} className="text-orange-500" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Avg Resolution</span></div>
          <p className="text-2xl font-black">{kpis.avgResolution === '--' ? '--' : `${kpis.avgResolution}d`}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><SmilePlus size={14} className="text-green-500" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Satisfaction</span></div>
          <p className="text-2xl font-black">{kpis.satisfactionRate}%</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1"><RefreshCw size={14} className="text-purple-500" /><span className="text-[10px] font-bold uppercase text-muted-foreground">Comp. Value</span></div>
          <p className="text-lg font-black">&#8358;{kpis.totalComps.toLocaleString()}</p>
        </div>
      </div>

      {/* Analytics Toggle */}
      {showAnalytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in duration-300">
          <div className="rounded-xl border bg-card h-72 flex flex-col">
            <div className="p-4 border-b"><h4 className="font-semibold text-sm">Sentiment Breakdown</h4></div>
            <div className="flex-1 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={sentimentData} cx="50%" cy="50%" innerRadius={40} outerRadius={80} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                    {sentimentData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-xl border bg-card h-72 flex flex-col">
            <div className="p-4 border-b"><h4 className="font-semibold text-sm">Complaints by Segment</h4></div>
            <div className="flex-1 p-4">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={complaintsBySegmentData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis />
                  <RechartsTooltip />
                  <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex items-center gap-1 border-b">
        {([
          { key: 'feedback' as MainTab, label: 'Feedback', icon: MessageSquare, count: kpis.openFeedback },
          { key: 'enquiries' as MainTab, label: 'Enquiries', icon: Mail, count: kpis.openEnquiries },
          { key: 'compensations' as MainTab, label: 'Compensations', icon: RefreshCw, count: kpis.pendingComps },
        ]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground hover:border-muted-foreground/30'
            }`}
          >
            <tab.icon size={15} /> {tab.label}
            {tab.count > 0 && (
              <span className="ml-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white">
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ================== FEEDBACK TAB ================== */}
      {activeTab === 'feedback' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Search feedback..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex flex-wrap gap-2">
              <select value={fbFilterStatus} onChange={(e) => setFbFilterStatus(e.target.value as typeof fbFilterStatus)} className="h-10 rounded-md border px-3 text-sm bg-background"><option value="All">All Status</option><option>Open</option><option>Resolved</option></select>
              <select value={fbFilterType} onChange={(e) => setFbFilterType(e.target.value as FeedbackType | 'All')} className="h-10 rounded-md border px-3 text-sm bg-background"><option value="All">All Types</option>{Object.values(FeedbackType).map((t) => <option key={t} value={t}>{t}</option>)}</select>
              <select value={fbFilterPriority} onChange={(e) => setFbFilterPriority(e.target.value as FeedbackPriority | 'All')} className="h-10 rounded-md border px-3 text-sm bg-background"><option value="All">All Priorities</option>{Object.values(FeedbackPriority).map((p) => <option key={p} value={p}>{p}</option>)}</select>
            </div>
            <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">{filteredFeedbacks.length} result{filteredFeedbacks.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Table */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Date</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Customer</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Type</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Priority</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Sentiment</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Content</th>
                    <th className="h-12 px-4 text-center font-medium text-muted-foreground">Status</th>
                    <th className="h-12 px-4 text-center font-medium text-muted-foreground">Resolution</th>
                    <th className="h-12 px-4 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {!feedbackFetching && filteredFeedbacks.map((f) => (
                    <tr key={f.id} className="hover:bg-muted/50 group">
                      <td className="p-4 text-muted-foreground whitespace-nowrap text-xs">{f.date}</td>
                      <td className="p-4 font-medium">{f.customerName}</td>
                      <td className="p-4"><span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${f.type === FeedbackType.COMPLAINT ? 'bg-red-100 text-red-800' : f.type === FeedbackType.APPRECIATION ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>{f.type}</span></td>
                      <td className="p-4">{f.priority ? <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[f.priority]}`}>{f.priority}</span> : <span className="text-xs text-muted-foreground">--</span>}</td>
                      <td className="p-4">{getSentimentIcon(f.sentiment)}</td>
                      <td className="p-4 text-muted-foreground text-xs max-w-[250px] truncate">{f.content}</td>
                      <td className="p-4 text-center"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${f.status === 'Resolved' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>{f.status === 'Resolved' ? <CheckCircle2 size={12} /> : null}{f.status}</span></td>
                      <td className="p-4 text-center text-xs text-muted-foreground">{f.status === 'Resolved' && f.resolvedDate ? `${calcResolutionDays(f.date, f.resolvedDate)}d` : '--'}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedFeedback(f); setResolutionNote(f.resolutionNote || ''); }} title="View Details" className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                            <Eye size={15} />
                          </button>
                          {f.status === 'Open' && can('interactions.resolve') && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); setQuickResolveId(f.id); setQuickResolveNote(''); }} title="Quick Resolve" className="inline-flex items-center justify-center rounded-md h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors">
                                <CheckCircle2 size={15} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); handleEscalatePriority(f.id); }} title="Escalate Priority" className="inline-flex items-center justify-center rounded-md h-8 w-8 text-orange-500 hover:text-orange-600 hover:bg-orange-50 transition-colors">
                                <ArrowUp size={15} />
                              </button>
                              <button onClick={(e) => { e.stopPropagation(); setCompFromFbData({ customerName: f.customerName, customerId: f.customerId, reason: `Ref: ${f.type}`, amount: 0, status: 'Pending', category: CompensationCategory.PRODUCT }); setShowCompFromFeedback(true); }} title="Issue Compensation" className="inline-flex items-center justify-center rounded-md h-8 w-8 text-purple-500 hover:text-purple-600 hover:bg-purple-50 transition-colors">
                                <Gift size={15} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!feedbackFetching && filteredFeedbacks.length === 0 && <tr><td colSpan={9} className="p-8 text-center text-muted-foreground">No feedback found.</td></tr>}
                  {feedbackFetching && (
                    <tr><td colSpan={9} className="p-0"><TableSkeleton rows={6} cols={8} /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================== ENQUIRIES TAB ================== */}
      {activeTab === 'enquiries' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Search enquiries..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <div className="flex items-center gap-2">
              {(['All', 'Open', 'Closed'] as const).map((s) => (
                <button key={s} onClick={() => setEnqFilterStatus(s)} className={`inline-flex items-center rounded-md text-sm font-medium h-9 px-3 py-1 border transition-colors ${enqFilterStatus === s ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-input hover:bg-accent text-foreground'}`}>{s}</button>
              ))}
            </div>
            <span className="text-xs text-muted-foreground ml-auto whitespace-nowrap">{filteredEnquiries.length} result{filteredEnquiries.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Table */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Date</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Customer</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Subject / Message</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Category</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Status</th>
                    <th className="h-12 px-4 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {!enquiriesFetching && filteredEnquiries.map((enq) => (
                    <tr key={enq.id} className="hover:bg-muted/50 group">
                      <td className="p-4 text-muted-foreground text-xs whitespace-nowrap">{enq.date}</td>
                      <td className="p-4 font-medium"><div className="flex flex-col"><span>{enq.customerName}</span>{enq.email && <span className="text-xs text-muted-foreground">{enq.email}</span>}</div></td>
                      <td className="p-4 max-w-[300px]"><div className="flex flex-col"><span className="font-medium text-xs mb-0.5">{enq.subject}</span><span className="truncate text-muted-foreground text-xs">{enq.message}</span></div></td>
                      <td className="p-4">
                        {enq.category ? <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[enq.category] || CATEGORY_COLORS['Other']}`}><Tag size={10} />{enq.category}</span> : <span className="text-xs text-muted-foreground">--</span>}
                      </td>
                      <td className="p-4"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${enq.status === 'Closed' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>{enq.status === 'Closed' ? <CheckCircle2 size={12} /> : <Clock size={12} />}{enq.status}</span></td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); setSelectedEnquiry(enq); setEnqResolution(enq.resolution || ''); }} title="View Details" className="inline-flex items-center justify-center rounded-md h-8 w-8 text-muted-foreground hover:text-foreground hover:bg-accent transition-colors">
                            <Eye size={15} />
                          </button>
                          {enq.status === 'Open' && can('interactions.resolve') && (
                            <>
                              <button onClick={(e) => { e.stopPropagation(); setQuickCloseId(enq.id); setQuickCloseNote(''); }} title="Quick Close" className="inline-flex items-center justify-center rounded-md h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors">
                                <CheckCircle2 size={15} />
                              </button>
                              {enq.email && (
                                <button onClick={(e) => { e.stopPropagation(); window.open(`mailto:${enq.email}?subject=Re: ${encodeURIComponent(enq.subject)}`); }} title="Reply via Email" className="inline-flex items-center justify-center rounded-md h-8 w-8 text-blue-500 hover:text-blue-600 hover:bg-blue-50 transition-colors">
                                  <MailOpen size={15} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!enquiriesFetching && filteredEnquiries.length === 0 && (
                    <tr><td colSpan={6} className="p-12 text-center">
                      <div className="flex flex-col items-center gap-3"><div className="rounded-full bg-muted p-4"><Inbox size={32} className="text-muted-foreground" /></div><p className="font-medium">No enquiries found</p><p className="text-sm text-muted-foreground">Try adjusting your search or filters.</p></div>
                    </td></tr>
                  )}
                  {enquiriesFetching && (
                    <tr><td colSpan={6} className="p-0"><TableSkeleton rows={6} cols={6} /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================== COMPENSATIONS TAB ================== */}
      {activeTab === 'compensations' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Search */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <input type="text" placeholder="Search compensations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
            <span className="text-xs text-muted-foreground ml-auto">{filteredCompensations.length} record{filteredCompensations.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Table */}
          <div className="rounded-md border bg-card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 border-b">
                  <tr>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Date</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Customer</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Category</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Reason</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Value</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Status</th>
                    <th className="h-12 px-4 text-left font-medium text-muted-foreground">Agent</th>
                    <th className="h-12 px-4 text-right font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {!compensationsFetching && filteredCompensations.map((comp) => (
                    <tr key={comp.id} className="hover:bg-muted/50 group">
                      <td className="p-4 text-muted-foreground text-xs whitespace-nowrap">{comp.date}</td>
                      <td className="p-4 font-medium">{comp.customerName}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          comp.category === CompensationCategory.VOUCHER ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          comp.category === CompensationCategory.MERCH ? 'bg-pink-50 text-pink-700 border-pink-200' :
                          comp.category === CompensationCategory.REFUND ? 'bg-gray-50 text-gray-700 border-gray-200' :
                          'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>{getCategoryIcon(comp.category)}{comp.category}</span>
                      </td>
                      <td className="p-4 text-muted-foreground text-xs">{comp.reason || '--'}</td>
                      <td className="p-4 font-medium text-destructive">&#8358;{comp.amount.toLocaleString()}</td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          comp.status === 'Paid' ? 'bg-green-100 text-green-800' :
                          comp.status === 'Approved' ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {comp.status === 'Paid' ? <CheckCircle2 size={12} /> : comp.status === 'Approved' ? <RefreshCw size={12} /> : <Clock size={12} />}
                          {comp.status}
                        </span>
                      </td>
                      <td className="p-4 text-xs text-muted-foreground">{comp.recordedByAgentName || '--'}</td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {comp.status === 'Pending' && can('interactions.resolve') && (
                            <button onClick={() => handleCompStatusChange(comp.id, 'Approved')} title="Approve" className="inline-flex items-center gap-1 rounded-md h-7 px-2.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors">
                              <BadgeCheck size={13} /> Approve
                            </button>
                          )}
                          {comp.status === 'Approved' && can('interactions.resolve') && (
                            <button onClick={() => handleCompStatusChange(comp.id, 'Paid')} title="Mark as Paid" className="inline-flex items-center gap-1 rounded-md h-7 px-2.5 text-xs font-medium text-green-600 hover:text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 transition-colors">
                              <CheckCircle2 size={13} /> Mark Paid
                            </button>
                          )}
                          {comp.status === 'Paid' && (
                            <span className="text-xs text-muted-foreground italic">Completed</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {!compensationsFetching && filteredCompensations.length === 0 && <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">No compensations recorded.</td></tr>}
                  {compensationsFetching && (
                    <tr><td colSpan={8} className="p-0"><TableSkeleton rows={6} cols={7} /></td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Total bar */}
          {compensations.length > 0 && (
            <div className="p-3 rounded-lg border-2 border-dashed bg-muted/10 flex justify-between items-center">
              <span className="text-sm font-medium text-muted-foreground">Total compensation value ({compensations.length} records)</span>
              <span className="text-lg font-black text-destructive">&#8358;{compensations.reduce((a, c) => a + c.amount, 0).toLocaleString()}</span>
            </div>
          )}
        </div>
      )}

      {/* ================== QUICK ACTION MODALS ================== */}

      {/* Quick Resolve Feedback */}
      {quickResolveId && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border bg-card p-5 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center"><CheckCircle2 size={16} className="text-green-600" /></div>
              <div>
                <h3 className="text-sm font-bold">Quick Resolve</h3>
                <p className="text-xs text-muted-foreground">{feedbacks.find((f) => f.id === quickResolveId)?.customerName}</p>
              </div>
              <button onClick={() => setQuickResolveId(null)} className="ml-auto text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <textarea
              value={quickResolveNote}
              onChange={(e) => setQuickResolveNote(e.target.value)}
              placeholder="How was this resolved?"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring mb-3"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setQuickResolveId(null)} className="inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-8 px-3 py-1">Cancel</button>
              <button onClick={() => handleQuickResolve(quickResolveId)} disabled={!quickResolveNote.trim()} className="inline-flex items-center gap-1 rounded-md text-sm font-medium bg-green-600 text-white hover:bg-green-700 h-8 px-3 py-1 disabled:opacity-50">
                <CheckCircle2 size={14} /> Resolve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Close Enquiry */}
      {quickCloseId && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border bg-card p-5 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center"><CheckCircle2 size={16} className="text-blue-600" /></div>
              <div>
                <h3 className="text-sm font-bold">Close Enquiry</h3>
                <p className="text-xs text-muted-foreground">{enquiries.find((e) => e.id === quickCloseId)?.customerName} &mdash; {enquiries.find((e) => e.id === quickCloseId)?.subject}</p>
              </div>
              <button onClick={() => setQuickCloseId(null)} className="ml-auto text-muted-foreground hover:text-foreground"><X size={18} /></button>
            </div>
            <textarea
              value={quickCloseNote}
              onChange={(e) => setQuickCloseNote(e.target.value)}
              placeholder="Enter resolution details..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring mb-3"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setQuickCloseId(null)} className="inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-8 px-3 py-1">Cancel</button>
              <button onClick={() => handleQuickClose(quickCloseId)} disabled={!quickCloseNote.trim()} className="inline-flex items-center gap-1 rounded-md text-sm font-medium bg-blue-600 text-white hover:bg-blue-700 h-8 px-3 py-1 disabled:opacity-50">
                <CheckCircle2 size={14} /> Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ================== MODALS ================== */}

      {/* Add Feedback Modal */}
      {showFeedbackModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Record Feedback</h2><button onClick={closeFeedbackModal} className="text-muted-foreground hover:text-foreground"><X size={20} /></button></div>
            <form onSubmit={handleSubmitFeedback} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="feedback-customer" className="text-sm font-medium">Customer *</label>
                <SearchableCustomerSelect
                  id="feedback-customer"
                  customers={feedbackModalCustomers}
                  value={newFbCustomer}
                  serverSearch
                  onSearchChange={setFeedbackCustomerSearch}
                  onChange={(customerId) => {
                    setNewFbCustomer(customerId);
                    const selected = feedbackModalCustomers.find(
                      (customer) => customer.id === customerId,
                    );
                    if (selected) setPinnedFeedbackCustomer(selected);
                  }}
                  placeholder="Type to search by name, email, or company..."
                />
                {feedbackCustomersFetching && (
                  <p className="text-xs text-muted-foreground">Searching customers…</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium">Type</label><select value={newFbType} onChange={(e) => setNewFbType(e.target.value as FeedbackType)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{Object.values(FeedbackType).map((t) => <option key={t} value={t}>{t}</option>)}</select></div>
                <div className="space-y-2"><label className="text-sm font-medium">Priority</label><select value={newFbPriority} onChange={(e) => setNewFbPriority(e.target.value as FeedbackPriority)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{Object.values(FeedbackPriority).map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">Content *</label><textarea value={newFbContent} onChange={(e) => setNewFbContent(e.target.value)} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" /></div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowFeedbackModal(false)} className="inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 py-2">Cancel</button>
                <SubmitButton type="submit" loading={createFeedback.isPending}>Save</SubmitButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Feedback Detail / Resolve Modal */}
      {selectedFeedback && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-start bg-muted/20">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${selectedFeedback.status === 'Resolved' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>{selectedFeedback.status}</span>
                  {selectedFeedback.priority && <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${PRIORITY_STYLES[selectedFeedback.priority]}`}>{selectedFeedback.priority}</span>}
                </div>
                <h2 className="text-xl font-bold">{selectedFeedback.type} from {selectedFeedback.customerName}</h2>
                <p className="text-sm text-muted-foreground">{selectedFeedback.date}{selectedFeedback.status === 'Resolved' && selectedFeedback.resolvedDate ? ` \u2014 Resolved in ${calcResolutionDays(selectedFeedback.date, selectedFeedback.resolvedDate)} day(s)` : ''}</p>
              </div>
              <button onClick={() => setSelectedFeedback(null)} className="text-muted-foreground hover:text-foreground"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="p-4 bg-muted/30 rounded-md border text-sm">{selectedFeedback.content}</div>
              {selectedFeedback.status === 'Open' && can('interactions.resolve') ? (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-muted-foreground">How was this handled?</p>
                    <button onClick={() => {
                      setCompFromFbData({ customerName: selectedFeedback.customerName, customerId: selectedFeedback.customerId, reason: `Ref: ${selectedFeedback.type}`, amount: 0, status: 'Pending', category: CompensationCategory.PRODUCT });
                      setShowCompFromFeedback(true);
                    }} className="inline-flex items-center text-xs border rounded-md px-3 py-1.5 hover:bg-accent"><Gift size={12} className="mr-1" /> Issue Compensation</button>
                  </div>
                  <textarea value={resolutionNote} onChange={(e) => setResolutionNote(e.target.value)} placeholder="Enter resolution details..." className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setSelectedFeedback(null)} className="inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 py-2">Cancel</button>
                    <SubmitButton onClick={handleResolveFeedback} disabled={!resolutionNote} loading={resolveFeedback.isPending} className="gap-2"><CheckCircle2 size={16} /> Mark Resolved</SubmitButton>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/30 border rounded-lg p-4 space-y-2">
                  <p className="text-sm font-bold">Resolution</p>
                  <p className="text-sm text-muted-foreground">{selectedFeedback.resolutionNote || 'No details recorded.'}</p>
                  {selectedFeedback.resolvedByAgentName && <p className="text-xs text-muted-foreground">Resolved by {selectedFeedback.resolvedByAgentName} on {selectedFeedback.resolvedDate}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Enquiry Modal */}
      {showEnquiryModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg rounded-xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Record New Enquiry</h2><button onClick={() => setShowEnquiryModal(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button></div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium">Customer Name *</label><input type="text" value={newEnquiry.customerName || ''} onChange={(e) => setNewEnquiry({ ...newEnquiry, customerName: e.target.value })} list="enq-customers" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                  <datalist id="enq-customers">{customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
                </div>
                <div className="space-y-2"><label className="text-sm font-medium">Date</label><input type="date" value={newEnquiry.date || ''} onChange={(e) => setNewEnquiry({ ...newEnquiry, date: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">Email (Optional)</label><input type="text" value={newEnquiry.email || ''} onChange={(e) => setNewEnquiry({ ...newEnquiry, email: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium">Subject</label><input type="text" value={newEnquiry.subject || ''} onChange={(e) => setNewEnquiry({ ...newEnquiry, subject: e.target.value })} placeholder="e.g. Bulk Order Pricing" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Category</label><select value={newEnquiry.category || 'Other'} onChange={(e) => setNewEnquiry({ ...newEnquiry, category: e.target.value as EnquiryCategory })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{ENQUIRY_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">Message *</label><textarea value={newEnquiry.message || ''} onChange={(e) => setNewEnquiry({ ...newEnquiry, message: e.target.value })} className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" /></div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowEnquiryModal(false)} className="inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 py-2">Cancel</button>
              <SubmitButton onClick={handleSaveEnquiry} loading={createEnquiry.isPending}>Save</SubmitButton>
            </div>
          </div>
        </div>
      )}

      {/* Enquiry Detail / Resolve Modal */}
      {selectedEnquiry && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-2xl rounded-xl border bg-card shadow-xl animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex justify-between items-start bg-muted/20">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${selectedEnquiry.status === 'Closed' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>{selectedEnquiry.status}</span>
                  {selectedEnquiry.category && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${CATEGORY_COLORS[selectedEnquiry.category] || CATEGORY_COLORS['Other']}`}><Tag size={10} />{selectedEnquiry.category}</span>}
                </div>
                <h2 className="text-xl font-bold">{selectedEnquiry.subject}</h2>
                <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground"><User size={14} /> {selectedEnquiry.customerName} {selectedEnquiry.email && <span className="text-xs">({selectedEnquiry.email})</span>}</div>
              </div>
              <button onClick={() => setSelectedEnquiry(null)} className="text-muted-foreground hover:text-foreground"><X size={24} /></button>
            </div>
            <div className="p-6 space-y-6">
              <div className="p-4 bg-muted/30 rounded-md border text-sm">{selectedEnquiry.message}</div>
              {selectedEnquiry.status === 'Open' && can('interactions.resolve') ? (
                <div className="space-y-4">
                  <textarea value={enqResolution} onChange={(e) => setEnqResolution(e.target.value)} placeholder="Enter resolution details..." className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none" />
                  <div className="flex justify-end gap-3">
                    <button onClick={() => setSelectedEnquiry(null)} className="inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 py-2">Cancel</button>
                    <SubmitButton onClick={handleResolveEnquiry} disabled={!enqResolution} loading={resolveEnquiry.isPending} className="gap-2"><CheckCircle2 size={16} /> Mark as Closed</SubmitButton>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/30 border rounded-lg p-4 space-y-2">
                  <p className="text-sm font-bold">Resolution</p>
                  <p className="text-sm text-muted-foreground">{selectedEnquiry.resolution || 'No resolution details.'}</p>
                  {selectedEnquiry.managedByAgentName && <p className="text-xs text-muted-foreground">Managed by {selectedEnquiry.managedByAgentName}</p>}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add Compensation Modal */}
      {showCompModal && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md rounded-xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4"><h2 className="text-lg font-bold">Record Compensation</h2><button onClick={() => setShowCompModal(false)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button></div>
            <div className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium">Customer Name *</label><input type="text" value={newComp.customerName || ''} onChange={(e) => setNewComp({ ...newComp, customerName: e.target.value })} list="comp-customers" className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" />
                <datalist id="comp-customers">{customers.map((c) => <option key={c.id} value={c.name} />)}</datalist>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <div className="grid grid-cols-2 gap-2">{Object.values(CompensationCategory).map((cat) => <button key={cat} type="button" onClick={() => setNewComp({ ...newComp, category: cat })} className={`inline-flex items-center justify-center rounded-md text-xs font-medium px-3 py-2 border transition-colors ${newComp.category === cat ? 'bg-primary text-primary-foreground border-primary' : 'bg-background hover:bg-accent border-input'}`}>{cat}</button>)}</div>
              </div>
              <div className="space-y-2"><label className="text-sm font-medium">Reason</label><input type="text" value={newComp.reason || ''} onChange={(e) => setNewComp({ ...newComp, reason: e.target.value })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2"><label className="text-sm font-medium">Value (&#8358;)</label><input type="number" value={newComp.amount || ''} onChange={(e) => setNewComp({ ...newComp, amount: parseInt(e.target.value) || 0 })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
                <div className="space-y-2"><label className="text-sm font-medium">Status</label><select value={newComp.status} onChange={(e) => setNewComp({ ...newComp, status: e.target.value as Compensation['status'] })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option>Pending</option><option>Approved</option><option>Paid</option></select></div>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button onClick={() => setShowCompModal(false)} className="inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 py-2">Cancel</button>
              <SubmitButton onClick={handleSaveComp} loading={createCompensation.isPending}>Save</SubmitButton>
            </div>
          </div>
        </div>
      )}

      {/* Compensation from Feedback Sub-Modal */}
      {showCompFromFeedback && (
        <div className="fixed inset-0 z-[60] bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm rounded-xl border bg-card p-6 shadow-xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-lg font-bold mb-4">Issue Compensation</h3>
            <div className="space-y-4">
              <div className="space-y-2"><label className="text-sm font-medium">Category</label><select value={compFromFbData.category} onChange={(e) => setCompFromFbData({ ...compFromFbData, category: e.target.value as CompensationCategory })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">{Object.values(CompensationCategory).map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
              <div className="space-y-2"><label className="text-sm font-medium">Value (&#8358;)</label><input type="number" value={compFromFbData.amount || ''} onChange={(e) => setCompFromFbData({ ...compFromFbData, amount: parseInt(e.target.value) || 0 })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" /></div>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button onClick={() => setShowCompFromFeedback(false)} className="inline-flex items-center rounded-md text-sm font-medium border border-input bg-background hover:bg-accent h-9 px-4 py-2">Cancel</button>
              <SubmitButton onClick={handleSaveCompFromFeedback} loading={createCompensation.isPending}>Issue</SubmitButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
