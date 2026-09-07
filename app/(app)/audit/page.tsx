'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAuditLogs, useAgents } from '@/hooks/use-queries';
import { History, Search, Filter, Box, Banknote, User, Shield, Clock, CalendarDays, Upload, X } from 'lucide-react';
import type { AuditLog } from '@/types';
import { TableSkeleton } from '@/components/ui/loading-skeletons';

type DatePreset = 'today' | '7days' | '30days' | 'all';
type AuditTab = 'all' | 'bulk' | 'sales' | 'inventory' | 'customers';

function getPresetRange(preset: DatePreset): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  if (preset === 'all') return { from: '', to: '' };
  if (preset === 'today') return { from: to, to };
  const d = new Date(now);
  d.setDate(d.getDate() - (preset === '7days' ? 7 : 30));
  return { from: d.toISOString().split('T')[0], to };
}

const ENTITY_MAP: Record<string, string | undefined> = {
  All: undefined,
  Inventory: 'Inventory',
  Sale: 'Sale',
  Customer: 'Customer',
  System: 'System',
};

export default function AuditTrailPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEntity, setFilterEntity] = useState('All');
  const [filterModule, setFilterModule] = useState<'All' | 'sales' | 'inventory' | 'customers' | 'system'>('All');
  const [filterAgent, setFilterAgent] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [activePreset, setActivePreset] = useState<DatePreset | null>('all');
  const [activeTab, setActiveTab] = useState<AuditTab>('all');
  const [page, setPage] = useState(1);
  const [selectedBulkLog, setSelectedBulkLog] = useState<AuditLog | null>(null);

  const { data: agents = [] } = useAgents();

  const apiFilters = useMemo(() => {
    const entityType = ENTITY_MAP[filterEntity];
    const tabFilters =
      activeTab === 'bulk'
        ? { category: 'bulk_upload' as const }
        : activeTab === 'all'
          ? {}
          : { module: activeTab as 'sales' | 'inventory' | 'customers' };

    return {
      ...(searchTerm.trim() ? { search: searchTerm.trim() } : {}),
      ...(entityType ? { entity_type: entityType } : {}),
      ...(filterModule !== 'All' ? { module: filterModule } : {}),
      ...(filterAgent !== 'All' ? { user_id: filterAgent } : {}),
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
      ...tabFilters,
      page,
      limit: 25,
    };
  }, [searchTerm, filterEntity, filterModule, filterAgent, dateFrom, dateTo, activeTab, page]);

  const { data: auditList, isLoading, isFetching } = useAuditLogs(apiFilters);
  const logs = auditList?.items ?? [];
  const meta = auditList?.meta ?? { page: 1, limit: 25, total: 0, totalPages: 1 };
  const summary = auditList?.summary ?? { total: 0, bulk: 0, sales: 0, inventory: 0, customers: 0 };

  useEffect(() => {
    setPage(1);
  }, [searchTerm, filterEntity, filterModule, filterAgent, dateFrom, dateTo, activeTab]);

  const applyPreset = (preset: DatePreset) => {
    setActivePreset(preset);
    const range = getPresetRange(preset);
    setDateFrom(range.from);
    setDateTo(range.to);
  };

  const handleDateChange = (field: 'from' | 'to', value: string) => {
    setActivePreset(null);
    if (field === 'from') setDateFrom(value);
    else setDateTo(value);
  };

  const getEntityIcon = (type: string) => {
    const map: Record<string, React.ReactNode> = {
      Inventory: <Box size={16} className="text-blue-500" />,
      Sale: <Banknote size={16} className="text-green-500" />,
      Customer: <User size={16} className="text-purple-500" />,
      BulkUpload: <Upload size={16} className="text-indigo-500" />,
    };
    return map[type] || <Shield size={16} className="text-slate-500" />;
  };

  const presetLabels: Record<DatePreset, string> = {
    today: 'Today',
    '7days': 'Last 7 Days',
    '30days': 'Last 30 Days',
    all: 'All',
  };

  const tabs: { key: AuditTab; label: string; count: number }[] = [
    { key: 'all', label: 'All Logs', count: summary.total },
    { key: 'bulk', label: 'Bulk Uploads', count: summary.bulk },
    { key: 'sales', label: 'Sales', count: summary.sales },
    { key: 'inventory', label: 'Inventory', count: summary.inventory },
    { key: 'customers', label: 'Customers', count: summary.customers },
  ];

  const summaryNumber = (log: AuditLog, key: string) => {
    const value = log.bulkUpload?.summary?.[key];
    return typeof value === 'number' || typeof value === 'string' ? value : '—';
  };

  const renderBulkTable = () => (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/50 border-b text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            <tr>
              <th className="h-12 px-4 text-left">Time</th>
              <th className="h-12 px-4 text-left">User</th>
              <th className="h-12 px-4 text-left">Domain</th>
              <th className="h-12 px-4 text-left">Type</th>
              <th className="h-12 px-4 text-left">File</th>
              <th className="h-12 px-4 text-left">Rows</th>
              <th className="h-12 px-4 text-left">Processed</th>
              <th className="h-12 px-4 text-left">Status</th>
              <th className="h-12 px-4 text-left">Details</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-muted/30">
                <td className="p-4 whitespace-nowrap">
                  <span className="font-semibold">{new Date(log.timestamp).toLocaleDateString()}</span>
                  <span className="block text-[10px] text-muted-foreground">{new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </td>
                <td className="p-4">{log.userName}</td>
                <td className="p-4 capitalize">{log.bulkUpload?.domain ?? '—'}</td>
                <td className="p-4">{log.bulkUpload?.importType ?? '—'}</td>
                <td className="p-4 max-w-[180px] truncate" title={log.bulkUpload?.fileName}>{log.bulkUpload?.fileName ?? '—'}</td>
                <td className="p-4">
                  {summaryNumber(log, 'total')} total
                  <span className="block text-[10px] text-muted-foreground">
                    {summaryNumber(log, 'valid')} valid / {summaryNumber(log, 'invalid')} invalid
                  </span>
                </td>
                <td className="p-4">
                  {summaryNumber(log, 'processed')} processed
                  <span className="block text-[10px] text-muted-foreground">
                    {summaryNumber(log, 'imported')} imported / {summaryNumber(log, 'failed')} failed
                  </span>
                </td>
                <td className="p-4"><span className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-bold uppercase border">{log.bulkUpload?.stage ?? log.action}</span></td>
                <td className="p-4"><button type="button" onClick={() => setSelectedBulkLog(log)} className="text-primary text-xs font-semibold hover:underline">View rows</button></td>
              </tr>
            ))}
            {logs.length === 0 && !isLoading && <tr><td colSpan={9} className="p-12 text-center text-muted-foreground italic">No bulk upload logs found.</td></tr>}
            {isLoading && logs.length === 0 && (
              <tr>
                <td colSpan={9} className="p-0">
                  <TableSkeleton rows={6} cols={9} />
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div><h1 className="text-2xl font-semibold tracking-tight flex items-center gap-3"><History className="text-primary" /> System Audit Trail</h1><p className="text-muted-foreground">Traceability of all major operations and stock movements.</p></div>

      <div className="flex flex-col gap-4 bg-card p-4 rounded-lg border">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="relative w-full sm:w-80"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input type="text" placeholder="Search by agent or action..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-10 text-sm focus:outline-none focus:ring-1 focus:ring-ring" /></div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 bg-background"><Filter size={14} className="text-muted-foreground" /><select value={filterEntity} onChange={(e) => setFilterEntity(e.target.value)} className="bg-transparent border-none text-sm font-medium focus:outline-none"><option value="All">All Entities</option><option>Inventory</option><option>Sale</option><option>Customer</option><option>System</option></select></div>
            <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 bg-background"><Box size={14} className="text-muted-foreground" /><select value={filterModule} onChange={(e) => setFilterModule(e.target.value as 'All' | 'sales' | 'inventory' | 'customers' | 'system')} className="bg-transparent border-none text-sm font-medium focus:outline-none"><option value="All">All Modules</option><option value="sales">Sales</option><option value="inventory">Inventory</option><option value="customers">Customers</option><option value="system">System</option></select></div>
            <div className="flex items-center gap-2 border rounded-md px-3 py-1.5 bg-background"><User size={14} className="text-muted-foreground" /><select value={filterAgent} onChange={(e) => setFilterAgent(e.target.value)} className="bg-transparent border-none text-sm font-medium focus:outline-none"><option value="All">All Agents</option>{agents.map((agent) => <option key={agent.id} value={agent.id}>{agent.name}</option>)}</select></div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="flex items-center gap-2">
            <CalendarDays size={14} className="text-muted-foreground" />
            <input type="date" value={dateFrom} onChange={(e) => handleDateChange('from', e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
            <span className="text-muted-foreground text-sm">to</span>
            <input type="date" value={dateTo} onChange={(e) => handleDateChange('to', e.target.value)} className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-1 focus:ring-ring" />
          </div>
          <div className="flex items-center gap-1.5">
            {(['today', '7days', '30days', 'all'] as DatePreset[]).map((preset) => (
              <button
                key={preset}
                onClick={() => applyPreset(preset)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  activePreset === preset
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50 border'
                }`}
              >
                {presetLabels[preset]}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${activeTab === tab.key ? 'bg-primary text-primary-foreground' : 'bg-background text-muted-foreground hover:text-foreground'}`}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        Showing{' '}
        <span className="font-semibold text-foreground">
          {meta.total === 0 ? 0 : (meta.page - 1) * meta.limit + 1}–{Math.min(meta.page * meta.limit, meta.total)}
        </span>{' '}
        of <span className="font-semibold text-foreground">{meta.total}</span> entries
      </p>

      {activeTab === 'bulk' ? (
        renderBulkTable()
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 border-b text-[10px] uppercase font-bold text-muted-foreground tracking-wider"><tr><th className="h-12 px-6 text-left">Timestamp</th><th className="h-12 px-6 text-left">Agent</th><th className="h-12 px-6 text-left">Entity</th><th className="h-12 px-6 text-left">Action</th><th className="h-12 px-6 text-left">Details</th></tr></thead>
              <tbody className="divide-y">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="p-6 whitespace-nowrap"><div className="flex flex-col"><span className="font-bold">{new Date(log.timestamp).toLocaleDateString()}</span><span className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock size={10} /> {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span></div></td>
                    <td className="p-6"><div className="flex items-center gap-2"><div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary border">{log.userName.charAt(0)}</div><div className="flex flex-col"><span className="font-medium">{log.userName}</span><span className="text-[10px] text-muted-foreground uppercase">{log.location}</span></div></div></td>
                    <td className="p-6"><div className="flex items-center gap-2 font-semibold">{getEntityIcon(log.entityType)}{log.entityType}</div></td>
                    <td className="p-6"><span className="px-2.5 py-1 rounded-md bg-secondary text-secondary-foreground text-xs font-bold uppercase border border-border/50">{log.action}</span></td>
                    <td className="p-6 text-muted-foreground italic text-xs max-w-xs truncate" title={log.details}>{log.details}</td>
                  </tr>
                ))}
                {logs.length === 0 && !isLoading && <tr><td colSpan={5} className="p-12 text-center text-muted-foreground italic">No activity logs found.</td></tr>}
                {isLoading && logs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="p-0">
                      <TableSkeleton rows={6} cols={5} />
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">Page {meta.page} of {meta.totalPages}</p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={meta.page <= 1 || isLoading || isFetching}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-muted-foreground px-2">
            Page {meta.page} of {meta.totalPages}
          </span>
          <button
            type="button"
            disabled={meta.page >= meta.totalPages || isLoading || isFetching}
            onClick={() => setPage((p) => p + 1)}
            className="inline-flex h-9 items-center rounded-md border border-input bg-background px-3 text-sm font-medium hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {selectedBulkLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-5xl max-h-[85vh] overflow-y-auto rounded-lg border bg-card p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h2 className="text-lg font-bold">Bulk Upload Details</h2>
                <p className="text-sm text-muted-foreground">{selectedBulkLog.details}</p>
              </div>
              <button type="button" onClick={() => setSelectedBulkLog(null)} className="text-muted-foreground hover:text-foreground"><X size={20} /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 text-sm">
              <div className="rounded-md border p-3"><span className="text-xs text-muted-foreground">Domain</span><p className="font-semibold capitalize">{selectedBulkLog.bulkUpload?.domain ?? '—'}</p></div>
              <div className="rounded-md border p-3"><span className="text-xs text-muted-foreground">Type</span><p className="font-semibold">{selectedBulkLog.bulkUpload?.importType ?? '—'}</p></div>
              <div className="rounded-md border p-3"><span className="text-xs text-muted-foreground">File</span><p className="font-semibold truncate">{selectedBulkLog.bulkUpload?.fileName ?? '—'}</p></div>
              <div className="rounded-md border p-3"><span className="text-xs text-muted-foreground">Stage</span><p className="font-semibold">{selectedBulkLog.bulkUpload?.stage ?? selectedBulkLog.action}</p></div>
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-semibold mb-2">Uploaded / validated rows</h3>
                <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(selectedBulkLog.bulkUpload?.rows ?? [], null, 2)}</pre>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Results</h3>
                <pre className="max-h-80 overflow-auto rounded-md bg-muted p-3 text-xs">{JSON.stringify(selectedBulkLog.bulkUpload?.results ?? selectedBulkLog.bulkUpload?.summary ?? {}, null, 2)}</pre>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
