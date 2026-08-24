'use client';

import { useState, useMemo } from 'react';
import { Sparkles, X } from 'lucide-react';
import { generateCardInsight, Point, ValueKind } from '@/lib/cardInsight';

export function InsightButton({ title, series, kind = 'number', time = false }: { title: string; series: Point[]; kind?: ValueKind; time?: boolean }) {
  const [open, setOpen] = useState(false);
  const insight = useMemo(() => (open ? generateCardInsight(title, series, { kind, time }) : null), [open, title, series, kind, time]);

  return (
    <div className="relative shrink-0">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}
        title="AI insight"
        className={`inline-flex items-center justify-center h-7 w-7 rounded-md border transition-colors ${open ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-primary hover:bg-primary/10'}`}
      >
        <Sparkles size={13} />
      </button>
      {open && insight && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1.5 z-50 w-72 rounded-xl border bg-card shadow-xl p-3 text-left animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-2">
              <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase text-primary"><Sparkles size={12} /> AI Insight</span>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X size={13} /></button>
            </div>
            <p className="text-xs font-semibold mb-1.5">{insight.title}</p>
            <ul className="space-y-1.5">
              {insight.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-muted-foreground leading-snug"><span className="mt-1 h-1 w-1 rounded-full bg-primary shrink-0" /><span>{b}</span></li>
              ))}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}
