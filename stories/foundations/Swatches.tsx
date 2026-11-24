import type { TokenRow } from './token-data';

/** Swatch table: the live variable in the light scope and inside a .dark scope, with the source values. */
export function SwatchTable({ rows }: { rows: TokenRow[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="bg-muted text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Token</th>
            <th className="px-3 py-2 font-medium">Light</th>
            <th className="px-3 py-2 font-medium">Dark</th>
            <th className="px-3 py-2 font-medium">Role</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t align-top">
              <td className="px-3 py-2 font-mono text-xs">--{r.name}<div className="text-muted-foreground">bg-{r.name}</div></td>
              <td className="px-3 py-2"><Chip value={r.light} /></td>
              <td className="px-3 py-2"><Chip value={r.dark} /></td>
              <td className="px-3 py-2 text-muted-foreground">{r.role}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Chip({ value }: { value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="size-8 shrink-0 rounded-md border" style={{ background: value }} />
      <span className="font-mono text-xs tabular-nums">{value}</span>
    </div>
  );
}

export function Section({ title, children, note }: { title: string; note?: string; children: React.ReactNode }) {
  return (
    <section className="mb-8 space-y-3">
      <div>
        <h2 className="text-base font-semibold">{title}</h2>
        {note && <p className="text-sm text-muted-foreground">{note}</p>}
      </div>
      {children}
    </section>
  );
}
