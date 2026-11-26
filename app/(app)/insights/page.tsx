import { redirect } from 'next/navigation';

/**
 * Insights now lives in Analytics: Ask is a view of the Reports tab, the chart builder is Reports'
 * New report, and Compare is Analytics' Compare tab. What if was removed. Old links keep working:
 *   /insights?ask=…                       -> /analytics?tab=reports&mode=ask&ask=…
 *   /insights?mode=explore                -> /analytics?tab=reports&report=new
 *   /insights?mode=simulate               -> /analytics?tab=reports (What if was removed)
 *   /insights?mode=compare&kind=&a=&b=    -> /analytics?tab=compare&kind=&a=&b=
 */
export default async function InsightsRedirect({ searchParams }: Readonly<{ searchParams: Promise<Record<string, string | string[] | undefined>> }>) {
  const sp = await searchParams;
  const one = (k: string) => (Array.isArray(sp[k]) ? sp[k][0] : sp[k]);
  const next = new URLSearchParams();
  const mode = one('mode');

  if (mode === 'compare') {
    next.set('tab', 'compare');
    for (const k of ['kind', 'a', 'b']) {
      const v = one(k);
      if (v) next.set(k, v);
    }
  } else {
    next.set('tab', 'reports');
    if (mode === 'explore') next.set('report', 'new');
    else if (mode !== 'simulate') next.set('mode', 'ask');
    const ask = one('ask');
    if (ask) next.set('ask', ask);
  }
  for (const k of ['period', 'from', 'to']) {
    const v = one(k);
    if (v) next.set(k, v);
  }
  redirect(`/analytics?${next.toString()}`);
}
