'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { AlarmClock, ArrowRight, Bell, BellOff, CheckCircle2, Clock, Flame, Inbox, Minimize2, RefreshCw, User } from 'lucide-react';
import { useKitchenJobAction, useKitchenJobs, useKitchenRecipes } from '@/hooks/use-kitchen';
import { cn } from '@/lib/utils';
import {
  ADVANCE_LABELS,
  BOARD_STAGES,
  dueState,
  MODE_LABELS,
  naira,
  STAGE_LABELS,
  waitingMinutes,
  type KitchenJob,
  type KitchenRecipe,
  type KitchenStage,
} from '@/lib/kitchen-types';
import { btnGhost, btnPrimary, btnSecondary, ErrorPanel, KpiCard, KpiRow, PaymentBadge } from './kitchen-ui';

const SOUND_KEY = 'kitchen-display-sound';

function readSoundPref(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== 'off';
  } catch {
    return true;
  }
}

/** Two-tone chime from WebAudio, so no audio file is needed. */
function chime() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    [880, 660].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      const start = ctx.currentTime + i * 0.22;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.3, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.2);
      osc.connect(gain).connect(ctx.destination);
      osc.start(start);
      osc.stop(start + 0.22);
    });
    setTimeout(() => void ctx.close(), 800);
  } catch {
    /* sound is optional */
  }
}

export function dishSummary(job: KitchenJob, recipes: Map<string, KitchenRecipe>): string {
  if (job.custom_bill && job.bill_lines.length) {
    return job.bill_lines.map((b) => `${b.qty} × ${b.desc}`).join(', ');
  }
  const names = job.menu.map((m) => recipes.get(String(m.recipe))?.name).filter(Boolean);
  const unit = MODE_LABELS[job.mode].unit.toLowerCase();
  const head = job.count ? `${job.count} ${job.title?.trim() || unit}` : job.title || MODE_LABELS[job.mode].label;
  return names.length ? `${head}: ${names.join(', ')}` : head;
}

export function KitchenBoard({
  hubId,
  dueSoonMinutes,
  ackMinutes,
  canManage,
  onOpenJob,
  displayMode = false,
  onExitDisplay,
}: {
  hubId?: string;
  dueSoonMinutes: number;
  ackMinutes: number;
  canManage: boolean;
  onOpenJob: (id: string) => void;
  displayMode?: boolean;
  onExitDisplay?: () => void;
}) {
  const jobs = useKitchenJobs({ stage: 'board', hub_id: hubId, limit: 200 }, { live: true });
  const recipes = useKitchenRecipes();
  const recipeMap = useMemo(() => new Map((recipes.data ?? []).map((r) => [String(r._id), r])), [recipes.data]);
  const advance = useKitchenJobAction();
  const [now, setNow] = useState(() => Date.now());
  const [phoneStage, setPhoneStage] = useState<KitchenStage>('new');
  const [sound, setSound] = useState(readSoundPref);
  // Drag a card one column to the right to move it on (same as its button).
  const [dragging, setDragging] = useState<KitchenJob | null>(null);
  const [dropStage, setDropStage] = useState<KitchenStage | null>(null);
  const nextStage = (s: KitchenStage) => BOARD_STAGES[BOARD_STAGES.indexOf(s) + 1] as KitchenStage | undefined;

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Chime when a new job reaches the board (display mode only; the bell covers the rest of the app).
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    const rows = jobs.data?.data;
    if (!rows) return;
    const ids = new Set(rows.filter((j) => j.stage === 'new').map((j) => j._id));
    if (seen.current && displayMode && sound && [...ids].some((id) => !seen.current!.has(id))) chime();
    seen.current = ids;
  }, [jobs.data, displayMode, sound]);

  const byStage = useMemo(() => {
    const m = new Map<KitchenStage, KitchenJob[]>(BOARD_STAGES.map((s) => [s, []]));
    for (const j of jobs.data?.data ?? []) m.get(j.stage)?.push(j);
    return m;
  }, [jobs.data]);

  const all = jobs.data?.data ?? [];
  const dueSoon = all.filter((j) => dueState(j, dueSoonMinutes, now)?.tone === 'soon').length;
  const overdue = all.filter((j) => dueState(j, dueSoonMinutes, now)?.tone === 'overdue').length;
  const counts = jobs.data?.counts ?? {};

  const move = (job: KitchenJob) => {
    advance.mutate(
      { id: job._id, action: 'advance' },
      {
        onSuccess: (j) => toast.success(`${j.code} moved to ${STAGE_LABELS[j.stage]}`),
        onError: (e) => toast.error(e.message),
      },
    );
  };

  const toggleSound = () => {
    const next = !sound;
    setSound(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? 'on' : 'off');
    } catch {
      /* per-device preference only */
    }
    if (next) chime();
  };

  const column = (stage: KitchenStage) => {
    const list = byStage.get(stage) ?? [];
    const canDrop = !!dragging && nextStage(dragging.stage) === stage;
    return (
      <section
        key={stage}
        aria-labelledby={`col-${stage}`}
        onDragOver={(e) => {
          if (!canDrop) return;
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          if (dropStage !== stage) setDropStage(stage);
        }}
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDropStage((s) => (s === stage ? null : s));
        }}
        onDrop={(e) => {
          e.preventDefault();
          if (canDrop && dragging) move(dragging);
          setDragging(null);
          setDropStage(null);
        }}
        className={cn(
          'flex min-w-0 flex-col rounded-md border bg-muted/20 transition-colors',
          displayMode && 'bg-card',
          canDrop && 'border-dashed border-primary/60',
          dropStage === stage && canDrop && 'bg-primary/10 ring-2 ring-primary/40',
          dragging && !canDrop && dragging.stage !== stage && 'opacity-50',
        )}
      >
        <h2 id={`col-${stage}`} className={cn('flex items-center justify-between border-b px-3 py-2 font-semibold', displayMode ? 'text-lg' : 'text-sm')}>
          {STAGE_LABELS[stage]}
          <span className="rounded-full bg-muted px-2 text-xs tabular-nums">{list.length}</span>
        </h2>
        <div className="flex-1 space-y-2 overflow-y-auto p-2">
          {list.map((job) => (
            <JobCard
              key={job._id}
              job={job}
              summary={dishSummary(job, recipeMap)}
              due={dueState(job, dueSoonMinutes, now)}
              waiting={waitingMinutes(job, now)}
              ackMinutes={ackMinutes}
              large={displayMode}
              onOpen={() => onOpenJob(job._id)}
              onAdvance={canManage ? () => move(job) : undefined}
              advancing={advance.isPending && advance.variables?.id === job._id}
              dragging={dragging?._id === job._id}
              onDragChange={canManage && nextStage(job.stage) ? (on) => {
                setDragging(on ? job : null);
                if (!on) setDropStage(null);
              } : undefined}
            />
          ))}
          {canDrop && <p className="rounded-md border border-dashed border-primary/50 px-2 py-4 text-center text-xs font-medium text-primary">Drop to {ADVANCE_LABELS[dragging!.stage]?.toLowerCase()}</p>}
          {!list.length && !canDrop && <p className="px-2 py-6 text-center text-sm italic text-muted-foreground">Nothing here</p>}
        </div>
      </section>
    );
  };

  if (displayMode) {
    return (
      <div className="fixed inset-0 z-40 flex flex-col gap-3 bg-background p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-bold">Kitchen board</h1>
          <div className="flex flex-wrap items-center gap-3 text-base">
            <span className="font-semibold">{counts.new ?? 0} waiting</span>
            {overdue > 0 && <span className="font-semibold text-destructive">{overdue} overdue</span>}
            {dueSoon > 0 && <span className="font-semibold text-amber-600">{dueSoon} due soon</span>}
            <span role="status" className="text-sm text-muted-foreground">{jobs.isFetching ? 'Refreshing…' : `Updated ${new Date(jobs.dataUpdatedAt || now).toLocaleTimeString('en-NG', { timeZone: 'Africa/Lagos', hour: 'numeric', minute: '2-digit', hour12: true })}`}</span>
            <button type="button" className={btnSecondary} onClick={toggleSound} aria-pressed={sound}>
              {sound ? <Bell size={14} /> : <BellOff size={14} />} {sound ? 'Chime on' : 'Chime off'}
            </button>
            <button type="button" className={btnSecondary} onClick={onExitDisplay}>
              <Minimize2 size={14} /> Exit display
            </button>
          </div>
        </div>
        {jobs.isError && <ErrorPanel message={jobs.error.message} onRetry={() => void jobs.refetch()} />}
        <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">{BOARD_STAGES.map(column)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <KpiRow loading={jobs.isPending} count={5}>
        <KpiCard label="Waiting to accept" value={counts.new ?? 0} icon={<Inbox size={14} />} tone="text-red-600" />
        <KpiCard label="In progress" value={(counts.accepted ?? 0) + (counts.cooking ?? 0)} icon={<Flame size={14} />} tone="text-orange-600" />
        <KpiCard label="Due soon" value={dueSoon} icon={<AlarmClock size={14} />} tone="text-amber-600" hint={overdue ? `${overdue} overdue` : undefined} />
        <KpiCard label="Ready" value={counts.ready ?? 0} icon={<CheckCircle2 size={14} />} tone="text-green-600" />
        <KpiCard label="Completed today" value={counts.completed_today ?? 0} icon={<Clock size={14} />} tone="text-emerald-700" />
      </KpiRow>

      {jobs.isError && <ErrorPanel message={jobs.error.message} onRetry={() => void jobs.refetch()} />}

      {/* Phones: one stage at a time */}
      <div className="md:hidden">
        <div role="tablist" aria-label="Board stage" className="mb-3 grid grid-cols-4 gap-1 rounded-lg border bg-muted/30 p-1">
          {BOARD_STAGES.map((s) => (
            <button
              key={s}
              type="button"
              role="tab"
              aria-selected={phoneStage === s}
              onClick={() => setPhoneStage(s)}
              className={cn('rounded-md px-1 py-1.5 text-[11px] font-semibold', phoneStage === s ? 'bg-background text-primary shadow-sm' : 'text-muted-foreground')}
            >
              {STAGE_LABELS[s]} <span className="tabular-nums">({byStage.get(s)?.length ?? 0})</span>
            </button>
          ))}
        </div>
        {column(phoneStage)}
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-2 xl:grid-cols-4">{BOARD_STAGES.map(column)}</div>

      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <RefreshCw size={11} className={jobs.isFetching ? 'animate-spin' : ''} /> The board refreshes every 15 seconds and when a job changes. Completed and cancelled jobs move to Jobs.
      </p>
    </div>
  );
}

function JobCard({
  job,
  summary,
  due,
  waiting,
  ackMinutes,
  large,
  onOpen,
  onAdvance,
  advancing,
  dragging,
  onDragChange,
}: {
  job: KitchenJob;
  summary: string;
  due: ReturnType<typeof dueState>;
  waiting: number;
  ackMinutes: number;
  large: boolean;
  onOpen: () => void;
  onAdvance?: () => void;
  advancing: boolean;
  dragging?: boolean;
  /** Set when the card can be dragged to the next column. */
  onDragChange?: (dragging: boolean) => void;
}) {
  const late = job.stage === 'new' && waiting >= ackMinutes;
  return (
    <article
      draggable={!!onDragChange && !advancing}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', job._id);
        onDragChange?.(true);
      }}
      onDragEnd={() => onDragChange?.(false)}
      title={onDragChange ? 'Drag to the next column, or use the button' : undefined}
      className={cn(
        'rounded-md border bg-card p-3 shadow-sm transition-colors',
        onDragChange && 'cursor-grab active:cursor-grabbing',
        dragging && 'opacity-40',
        due?.tone === 'overdue' && 'border-destructive/60',
        late && 'ring-2 ring-destructive/40',
      )}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left" aria-label={`Open ${job.code}, ${job.customer_name || 'walk-in'}`}>
        <div className="flex items-start justify-between gap-2">
          <span className={cn('font-mono font-semibold text-muted-foreground', large ? 'text-sm' : 'text-xs')}>{job.code}</span>
          {due && (
            <span
              className={cn(
                'shrink-0 rounded px-1.5 py-0.5 font-semibold',
                large ? 'text-sm' : 'text-[11px]',
                due.tone === 'overdue' && 'bg-destructive/10 text-destructive',
                due.tone === 'soon' && 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400',
                due.tone === 'normal' && 'text-muted-foreground',
              )}
            >
              {due.label}
            </span>
          )}
        </div>
        <p className={cn('mt-1 truncate font-semibold', large ? 'text-lg' : 'text-sm')}>{job.customer_name || 'Walk-in customer'}</p>
        <p className={cn('mt-0.5 line-clamp-2 text-muted-foreground', large ? 'text-base' : 'text-xs')}>{summary}</p>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-semibold tabular-nums">{naira(job.total)}</span>
          <PaymentBadge job={job} />
          {job.fulfilment === 'delivery' && <span className="rounded bg-muted px-1.5 py-0.5">Delivery</span>}
        </div>
        <p className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground">
          <User size={11} /> {job.created_by_name || 'Someone'}
          {job.stage === 'new' && waiting >= 1 && (
            <span className={cn('ml-auto', late && 'font-semibold text-destructive')}>Waiting {Math.floor(waiting)} min</span>
          )}
        </p>
      </button>
      {onAdvance && ADVANCE_LABELS[job.stage] && (
        <button
          type="button"
          onClick={onAdvance}
          disabled={advancing}
          className={cn(job.stage === 'new' ? btnPrimary : btnGhost, 'mt-2 w-full', job.stage !== 'new' && 'border', large && 'h-11 text-base')}
        >
          {advancing ? 'Moving…' : ADVANCE_LABELS[job.stage]} <ArrowRight size={14} />
        </button>
      )}
    </article>
  );
}
