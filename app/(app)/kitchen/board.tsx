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
  // Moves shown before the server confirms (id -> from/to). An entry only applies while the server
  // still reports `from`, so a refetch that lands early can't snap the card back, and stale entries are harmless.
  const [pending, setPending] = useState<Map<string, { from: KitchenStage; to: KitchenStage }>>(() => new Map());
  const [landed, setLanded] = useState<string | null>(null);
  // Pointer drag: the card lifts into a floating copy that follows the pointer.
  const [drag, setDrag] = useState<{ job: KitchenJob; to: KitchenStage; rect: DOMRect } | null>(null);
  const [over, setOver] = useState<KitchenStage | null>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const suppressClick = useRef(false);
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

  // Server jobs with any not-yet-confirmed moves applied.
  const { all, byStage, counts } = useMemo(() => {
    const c: Record<string, number> = { ...(jobs.data?.counts ?? {}) };
    const list: KitchenJob[] = [];
    for (const j of jobs.data?.data ?? []) {
      const p = pending.get(j._id);
      if (p && p.from === j.stage) {
        c[p.from] = Math.max(0, (c[p.from] ?? 1) - 1);
        const k = p.to === 'completed' ? 'completed_today' : p.to;
        c[k] = (c[k] ?? 0) + 1;
        if (BOARD_STAGES.includes(p.to)) list.push({ ...j, stage: p.to });
      } else list.push(j);
    }
    const m = new Map<KitchenStage, KitchenJob[]>(BOARD_STAGES.map((s) => [s, []]));
    for (const j of list) m.get(j.stage)?.push(j);
    return { all: list, byStage: m, counts: c as Partial<Record<string, number>> };
  }, [jobs.data, pending]);

  const dueSoon = all.filter((j) => dueState(j, dueSoonMinutes, now)?.tone === 'soon').length;
  const overdue = all.filter((j) => dueState(j, dueSoonMinutes, now)?.tone === 'overdue').length;

  /** Moves the card at once, then tells the server; puts it back if the server refuses. */
  const move = (job: KitchenJob) => {
    const from = job.stage;
    const to = nextStage(from) ?? 'completed';
    setPending((m) => new Map(m).set(job._id, { from, to }));
    setLanded(job._id);
    advance.mutate(
      { id: job._id, action: 'advance' },
      {
        onSuccess: (j) => to === 'completed' && toast.success(`${j.code} completed`),
        onError: (e) => {
          setPending((m) => {
            const n = new Map(m);
            n.delete(job._id);
            return n;
          });
          toast.error(e.message);
        },
      },
    );
  };

  const startDrag = (job: KitchenJob, e: React.PointerEvent<HTMLElement>) => {
    const to = nextStage(job.stage);
    if (!to || e.button !== 0 || e.pointerType === 'touch' || (e.target as HTMLElement).closest('[data-no-drag]')) return;
    const el = e.currentTarget;
    const sx = e.clientX;
    const sy = e.clientY;
    let rect: DOMRect | null = null;
    let target: KitchenStage | null = null;
    let frame = 0;

    const onMove = (ev: PointerEvent) => {
      if (!rect) {
        if (Math.hypot(ev.clientX - sx, ev.clientY - sy) < 5) return;
        rect = el.getBoundingClientRect();
        setDrag({ job, to, rect });
        document.body.style.userSelect = 'none';
        document.body.style.cursor = 'grabbing';
      }
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const r = rect!;
        if (ghost.current) ghost.current.style.transform = `translate3d(${ev.clientX - sx + r.left}px, ${ev.clientY - sy + r.top}px, 0) rotate(2deg) scale(1.03)`;
        const hit = document.elementFromPoint(ev.clientX, ev.clientY)?.closest<HTMLElement>('[data-stage]')?.dataset.stage;
        const next = hit === to ? to : null;
        if (next !== target) setOver((target = next));
      });
    };
    const end = (ev: Event) => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', end);
      window.removeEventListener('pointercancel', end);
      window.removeEventListener('keydown', onKey);
      cancelAnimationFrame(frame);
      if (!rect) return;
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      // The click that follows a drag must not open the job.
      suppressClick.current = true;
      setTimeout(() => (suppressClick.current = false), 0);
      setOver(null);
      if (ev.type === 'pointerup' && target === to) {
        setDrag(null);
        move(job);
        return;
      }
      // Not dropped on the next column: glide back to where it came from.
      const g = ghost.current;
      if (g) {
        g.style.transition = 'transform 180ms cubic-bezier(0.2, 0, 0, 1)';
        g.style.transform = `translate3d(${rect.left}px, ${rect.top}px, 0)`;
      }
      setTimeout(() => setDrag(null), 180);
    };
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && end(ev);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
    window.addEventListener('keydown', onKey);
  };

  const card = (job: KitchenJob, opts: { lifted?: boolean } = {}) => (
    <JobCard
      key={job._id}
      job={job}
      summary={dishSummary(job, recipeMap)}
      due={dueState(job, dueSoonMinutes, now)}
      waiting={waitingMinutes(job, now)}
      ackMinutes={ackMinutes}
      large={displayMode}
      onOpen={() => !suppressClick.current && onOpenJob(job._id)}
      onAdvance={canManage && !opts.lifted ? () => move(job) : undefined}
      advancing={pending.has(job._id) && advance.isPending && advance.variables?.id === job._id}
      onPointerDown={canManage && !opts.lifted && nextStage(job.stage) ? (e) => startDrag(job, e) : undefined}
      placeholder={!opts.lifted && drag?.job._id === job._id}
      lifted={opts.lifted}
      landed={!opts.lifted && landed === job._id}
    />
  );

  const floating = drag && (
    <div
      ref={ghost}
      aria-hidden
      className="pointer-events-none fixed left-0 top-0 z-[60] will-change-transform"
      style={{ width: drag.rect.width, transform: `translate3d(${drag.rect.left}px, ${drag.rect.top}px, 0) rotate(2deg) scale(1.03)` }}
    >
      {card(drag.job, { lifted: true })}
    </div>
  );

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
    const canDrop = drag?.to === stage;
    const isOver = canDrop && over === stage;
    return (
      <section
        key={stage}
        data-stage={stage}
        aria-labelledby={`col-${stage}`}
        className={cn(
          'flex min-w-0 flex-col rounded-md border bg-muted/20 transition-[background-color,border-color,box-shadow,opacity] duration-150',
          displayMode && 'bg-card',
          canDrop && 'border-dashed border-primary/60',
          isOver && 'bg-primary/10 ring-2 ring-primary/40',
          drag && !canDrop && drag.job.stage !== stage && 'opacity-50',
        )}
      >
        <h2 id={`col-${stage}`} className={cn('flex items-center justify-between border-b px-3 py-2 font-semibold', displayMode ? 'text-lg' : 'text-sm')}>
          {STAGE_LABELS[stage]}
          <span className="rounded-full bg-muted px-2 text-xs tabular-nums">{list.length}</span>
        </h2>
        <div className="flex-1 space-y-2 overflow-y-auto p-2">
          {list.map((job) => card(job))}
          {canDrop && (
            <p className={cn('rounded-md border border-dashed border-primary/50 px-2 text-center text-xs font-medium text-primary transition-all duration-150', isOver ? 'py-8' : 'py-4')}>
              Drop to {ADVANCE_LABELS[drag.job.stage]?.toLowerCase()}
            </p>
          )}
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
        {floating}
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
      {floating}

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
  onPointerDown,
  placeholder,
  lifted,
  landed,
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
  /** Set when the card can be dragged to the next column. */
  onPointerDown?: (e: React.PointerEvent<HTMLElement>) => void;
  /** The slot a dragged card leaves behind. */
  placeholder?: boolean;
  /** The floating copy that follows the pointer. */
  lifted?: boolean;
  /** Just moved: animate in. */
  landed?: boolean;
}) {
  const late = job.stage === 'new' && waiting >= ackMinutes;
  return (
    <article
      onPointerDown={onPointerDown}
      className={cn(
        'rounded-md border bg-card p-3 shadow-sm transition-[opacity,box-shadow,border-color] duration-150',
        onPointerDown && 'cursor-grab',
        due?.tone === 'overdue' && 'border-destructive/60',
        late && 'ring-2 ring-destructive/40',
        placeholder && 'border-dashed opacity-30 shadow-none',
        lifted && 'cursor-grabbing shadow-2xl ring-2 ring-primary/40',
        landed && 'animate-in fade-in-0 zoom-in-95 duration-200',
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
          data-no-drag
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
