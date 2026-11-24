import type { ReactNode } from 'react';
import { Boxes, ChefHat, HandCoins } from 'lucide-react';
import { BrandLogo, BrandMark } from '@/components/brand';
import { cn } from '@/lib/utils';

const HIGHLIGHTS = [
  { icon: HandCoins, title: 'Sales and credit', text: 'Record a sale in seconds and see who owes what, by location.' },
  { icon: Boxes, title: 'Stock and suppliers', text: 'Batches, expiry and reorders across every hub and RSP.' },
  { icon: ChefHat, title: 'Kitchen and POS', text: 'Jobs costed from real prices, tills reconciled the same day.' },
] as const;

/** Highlights arrive one after another, after the headline. */
const HIGHLIGHT_DELAY = ['delay-300', 'delay-500', 'delay-700'] as const;

/**
 * Shared frame for the signed-out screens: a brand panel on wide screens and the form column.
 * The panel is decoration plus three lines of copy; phones get the form with the logo above it.
 */
export function AuthShell({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-2">
      <aside
        aria-label="Fudfarmer Sales OS"
        className="relative hidden overflow-hidden bg-primary text-primary-foreground lg:flex lg:flex-col lg:justify-between lg:p-12 dark:bg-card dark:text-foreground"
      >
        {/* Oversized flower mark as quiet texture, cropped by the panel edge. */}
        {/* Motion lives in globals.css (auth-*): fade up, a very slow turn, a petal bloom and a sway. */}
        <span aria-hidden className="auth-mark-in pointer-events-none absolute -right-48 -bottom-48">
          <BrandMark
            variant="current"
            title=""
            size={640}
            className="auth-turn-slow opacity-10 dark:text-primary dark:opacity-15"
          />
        </span>
        <span aria-hidden className="auth-sway pointer-events-none absolute top-20 -right-10">
          <BrandMark
            variant="current"
            title=""
            size={150}
            className="auth-bloom auth-turn text-brand-yellow opacity-90 dark:opacity-70"
          />
        </span>

        <div className="relative">
          <BrandLogo variant="white" width={156} priority className="dark:hidden" />
          <BrandLogo variant="white" width={156} className="hidden dark:block" />
        </div>

        <div className="relative max-w-md space-y-8">
          <div className="animate-in fade-in slide-in-from-bottom-2 fill-mode-both duration-700 ease-out delay-150 motion-reduce:animate-none">
            <h2 className="text-4xl leading-tight font-semibold tracking-tight text-balance">
              Every sale, credit and kilo, in one place.
            </h2>
          </div>
          <ul className="space-y-5">
            {HIGHLIGHTS.map(({ icon: Icon, title, text }, i) => (
              <li
                key={title}
                className={cn(
                  'flex gap-4 animate-in fade-in slide-in-from-left-2 fill-mode-both duration-500 ease-out motion-reduce:animate-none',
                  HIGHLIGHT_DELAY[i],
                )}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary-foreground/10 ring-1 ring-primary-foreground/20 dark:bg-primary/10 dark:ring-primary/30">
                  <Icon size={18} aria-hidden className="dark:text-primary" />
                </span>
                <span className="space-y-0.5">
                  <span className="block text-sm font-semibold">{title}</span>
                  <span className="block text-sm leading-relaxed opacity-80">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-xs opacity-70">© {new Date().getFullYear()} Fudfarmer</p>
      </aside>

      <main className="relative flex items-center justify-center px-4 py-12 sm:px-8">
        {/* Soft green wash behind the form column. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-radial from-primary/10 via-transparent to-transparent" />
        <div className="relative w-full max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500 motion-reduce:animate-none">{children}</div>
      </main>
    </div>
  );
}
