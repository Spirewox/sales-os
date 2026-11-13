import { redirect } from 'next/navigation';

export default async function InteractionsRedirect({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(await searchParams)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      query.append(key, item);
    }
  }
  query.set('tab', 'interactions');
  redirect('/engagement?' + query.toString());
}
