import type { StorybookConfig } from '@storybook/nextjs';

// Storybook for Sales OS. Framework @storybook/nextjs (webpack) because the app's dev script runs
// `next dev --webpack`; it reuses next.config.ts, postcss.config.mjs (Tailwind v4) and the @/ alias.
const config: StorybookConfig = {
  stories: ['../stories/**/*.mdx', '../stories/**/*.stories.@(ts|tsx)', '../components/**/*.stories.@(ts|tsx)'],
  addons: ['@storybook/addon-docs', '@storybook/addon-themes'],
  framework: { name: '@storybook/nextjs', options: {} },
  staticDirs: ['../public'],
};

export default config;
