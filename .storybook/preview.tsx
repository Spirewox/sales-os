import type { Preview } from '@storybook/nextjs';
import { withThemeByClassName } from '@storybook/addon-themes';
import { Geist, Geist_Mono } from 'next/font/google';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import '../app/globals.css';

// Same font setup as app/layout.tsx: the CSS variables feed --font-sans / --font-mono in globals.css.
const geist = Geist({ subsets: ['latin'], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ['latin'], variable: '--font-geist-mono' });

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: Infinity, refetchOnWindowFocus: false } },
});

if (typeof document !== 'undefined') {
  document.documentElement.classList.add(geist.variable, geistMono.variable);
}

const preview: Preview = {
  parameters: {
    layout: 'padded',
    // next/navigation mocks (useRouter, usePathname, useSearchParams) for the kit's URL state.
    nextjs: { appDirectory: true, navigation: { pathname: '/audit', query: {} } },
    controls: { expanded: true },
    backgrounds: { disable: true },
    viewport: {
      options: {
        phone: { name: 'Phone 390', styles: { width: '390px', height: '844px' }, type: 'mobile' },
        tablet: { name: 'Tablet 768', styles: { width: '768px', height: '1024px' }, type: 'tablet' },
        desktop: { name: 'Desktop 1280', styles: { width: '1280px', height: '800px' }, type: 'desktop' },
      },
    },
    options: {
      storySort: { order: ['Foundations', ['Overview', 'Colour', 'Status', 'Charts', 'Type', 'Radius', 'Spacing'], 'App kit', 'Primitives'] },
    },
  },
  decorators: [
    // next-themes runs with attribute="class", so dark mode is the .dark class on <html>.
    withThemeByClassName({ themes: { light: '', dark: 'dark' }, defaultTheme: 'light' }),
    (Story) => (
      <QueryClientProvider client={queryClient}>
        <div className={`${geist.variable} ${geistMono.variable} bg-background font-sans text-foreground antialiased`}>
          <Story />
        </div>
        <Toaster position="bottom-right" />
      </QueryClientProvider>
    ),
  ],
};

export default preview;
