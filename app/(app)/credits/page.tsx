'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  useCreditSummary,
  useCreditMetrics,
} from '@/hooks/use-queries';
import { CreditCustomerSummary } from '@/types/credits';
import { CustomerCreditSheet } from '@/components/credits/customer-credit-sheet';
import { fmt, formatDate, daysUntil } from '@/components/credits/credit-utils';
import {
  Search,
  CreditCard,
  AlertTriangle,
  Users,
  Flag,
  Timer,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { PaginationControls } from '@/components/ui/pagination-controls';
import { CardSkeleton, TableSkeleton } from '@/components/ui/loading-skeletons';

type SortKey = 'outstanding' | 'overdue' | 'oldest';
const PAGE_SIZE = 20;

export default function CreditsPage() {
  const { data: summary = [], isLoading, isFetching } = useCreditSummary();
  const { data: metrics } = useCreditMetrics();

  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<SortKey>('outstanding');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<CreditCustomerSummary | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, sortBy, sortDir, overdueOnly]);

  const toggleSort = (field: 'overdue' | 'oldest') => {
    if (sortBy === field) {
      setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortBy(field);
      setSortDir(field === 'oldest' ? 'asc' : 'desc');
    }
  };

  const SortIcon = ({ field }: { field: 'overdue' | 'oldest' }) => {
    if (sortBy !== field) return <ArrowUpDown size={12} className="text-muted-foreground/50" />;
    return sortDir === 'asc'
      ? <ArrowUp size={12} className="text-primary" />
      : <ArrowDown size={12} className="text-primary" />;
  };

  const filtered = useMemo(() => {
    let rows = summary.filter((row) => {
      if (searchTerm && !row.customerName.toLowerCase().includes(searchTerm.toLowerCase())) {
        return false;
      }
      if (overdueOnly && row.overdueCount === 0) return false;
      return true;
    });

    const dir = sortDir === 'asc' ? 1 : -1;
    rows = [...rows].sort((a, b) => {
      if (sortBy === 'outstanding') {
        // Outstanding dropdown always prefers highest first; honor sortDir if flipped later
        return (a.totalOutstanding - b.totalOutstanding) * (sortDir === 'asc' ? 1 : -1);
      }
      if (sortBy === 'overdue') {
        return (a.overdueCount - b.overdueCount) * dir;
      }
      if (!a.oldestDueDate && !b.oldestDueDate) return 0;
      if (!a.oldestDueDate) return 1;
      if (!b.oldestDueDate) return -1;
      return a.oldestDueDate.localeCompare(b.oldestDueDate) * dir;
    });

    return rows;
  }, [summary, searchTerm, sortBy, sortDir, overdueOnly]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const paginatedRows = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const openCustomer = (row: CreditCustomerSummary) => {
    setSelectedCustomer(row);
    setSheetOpen(true);
  };

  const kpis = metrics ?? {
    totalOutstanding: 0,
    overdueItemCount: 0,
    customersWithCredit: 0,
    flaggedCount: 0,
    avgDaysOverdue: 0,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Credits</h1>
        <p className="text-muted-foreground">
          Outstanding balances grouped by customer. Drill into per-sale credit items, repayments, and extensions.
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isFetching ? (
          Array.from({ length: 4 }, (_, i) => <CardSkeleton key={i} />)
        ) : (
          <>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CreditCard size={14} className="text-red-500" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Total Outstanding</p>
          </div>
          <p className="text-2xl font-black text-red-600">{fmt(kpis.totalOutstanding)}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={14} className="text-orange-500" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Overdue Items</p>
          </div>
          <p className="text-2xl font-black text-orange-600">{kpis.overdueItemCount}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Users size={14} className="text-blue-500" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Customers w/ Credit</p>
          </div>
          <p className="text-2xl font-black text-blue-600">{kpis.customersWithCredit}</p>
        </div>
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Timer size={14} className="text-amber-500" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase">Avg Days Overdue</p>
          </div>
          <p className="text-2xl font-black text-amber-600">
            {kpis.avgDaysOverdue}
            <span className="text-sm font-medium text-muted-foreground ml-1">days</span>
          </p>
          {kpis.flaggedCount > 0 && (
            <p className="text-[10px] text-orange-600 font-medium mt-1 flex items-center gap-1">
              <Flag size={10} /> {kpis.flaggedCount} flagged item{kpis.flaggedCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
          </>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-card p-4 rounded-xl border">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 pl-9 text-sm"
          />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              overdueOnly ? 'bg-red-600 text-white' : 'border hover:bg-accent'
            }`}
          >
            Overdue only
          </button>
          <button
            type="button"
            onClick={() => {
              setSortBy('outstanding');
              setSortDir('desc');
            }}
            className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
              sortBy === 'outstanding' ? 'bg-primary text-primary-foreground' : 'border hover:bg-accent'
            }`}
          >
            Sort: Outstanding
          </button>
        </div>
      </div>

      {/* Customer table */}
      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40 text-left">
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground">Customer</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground text-right">Outstanding</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground text-center hidden sm:table-cell">Open</th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground text-center hidden sm:table-cell">
                  <button
                    type="button"
                    onClick={() => toggleSort('overdue')}
                    className="inline-flex items-center gap-1 mx-auto hover:text-foreground"
                  >
                    Overdue
                    <SortIcon field="overdue" />
                  </button>
                </th>
                <th className="px-4 py-3 font-semibold text-xs uppercase tracking-wide text-muted-foreground hidden md:table-cell">
                  <button
                    type="button"
                    onClick={() => toggleSort('oldest')}
                    className="inline-flex items-center gap-1 hover:text-foreground"
                  >
                    Oldest due
                    <SortIcon field="oldest" />
                  </button>
                </th>
                <th className="px-4 py-3 w-10" />
              </tr>
            </thead>
            <tbody>
              {isFetching && (
                <tr>
                  <td colSpan={6} className="p-0">
                    <TableSkeleton rows={6} cols={6} />
                  </td>
                </tr>
              )}
              {!isFetching && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <CreditCard size={36} className="mx-auto text-muted-foreground/30 mb-2" />
                    <p className="text-sm font-medium text-muted-foreground">No customers with open credit match your filters.</p>
                  </td>
                </tr>
              )}
              {!isFetching && paginatedRows.map((row) => {
                const dueDays = row.oldestDueDate ? daysUntil(row.oldestDueDate) : null;
                return (
                  <tr
                    key={row.customerId}
                    onClick={() => openCustomer(row)}
                    className="border-b last:border-0 cursor-pointer hover:bg-accent/40 transition-colors"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">{row.customerName}</p>
                        {row.flaggedCount > 0 && (
                          <Flag size={12} className="text-orange-500 shrink-0" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className={`font-black ${row.overdueCount > 0 ? 'text-red-600' : ''}`}>
                        {fmt(row.totalOutstanding)}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-xs font-bold">
                        {row.openCreditCount}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center hidden sm:table-cell">
                      {row.overdueCount > 0 ? (
                        <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-red-100 text-red-700 px-2 text-xs font-bold">
                          {row.overdueCount}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 hidden md:table-cell">
                      {row.oldestDueDate ? (
                        <div>
                          <p className="font-medium">{formatDate(row.oldestDueDate)}</p>
                          {dueDays !== null && dueDays < 0 && (
                            <p className="text-[10px] text-red-600 font-medium">{Math.abs(dueDays)}d overdue</p>
                          )}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <ChevronRight size={16} className="text-muted-foreground" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex flex-col gap-3 border-t px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            {filtered.length === 0
              ? 'No customers to show'
              : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filtered.length)} of ${filtered.length}`}
          </p>
          <PaginationControls
            page={currentPage}
            totalPages={totalPages}
            onPageChange={setPage}
            disabled={isLoading}
          />
        </div>
      </div>

      <p className="text-xs text-muted-foreground text-center">
        Credits are created automatically from sales — not manually on this page. Click a customer to manage per-sale items.
      </p>

      <CustomerCreditSheet
        customer={selectedCustomer}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) setSelectedCustomer(null);
        }}
      />
    </div>
  );
}
