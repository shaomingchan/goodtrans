// .source folder will be generated when you run `next dev`
import { createElement } from 'react';
import { docs, logs, pages, posts } from '@/.source';
import type { I18nConfig } from 'fumadocs-core/i18n';
import { loader } from 'fumadocs-core/source';
import { icons } from 'lucide-react';

export const i18n: I18nConfig = {
  defaultLanguage: 'en',
  languages: ['en', 'zh'],
};

const iconHelper = (icon: string | undefined) => {
  if (!icon) {
    // You may set a default icon
    return;
  }
  if (icon in icons) return createElement(icons[icon as keyof typeof icons]);
};

// Compat shim: fumadocs-mdx@11.10.1 returns { files: () => [...] }
// but fumadocs-core@15.8.5 loader expects { files: [...] }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function resolveSource(src: any): any {
  const { files, ...rest } = src;
  return {
    ...rest,
    files: typeof files === 'function' ? files() : files,
  };
}

// Docs source
export const docsSource = loader({
  baseUrl: '/docs',
  source: resolveSource(docs.toFumadocsSource()),
  i18n,
  icon: iconHelper,
});

// Pages source (using root path)
export const pagesSource = loader({
  baseUrl: '/',
  source: resolveSource(pages.toFumadocsSource()),
  i18n,
  icon: iconHelper,
});

// Posts source
export const postsSource = loader({
  baseUrl: '/blog',
  source: resolveSource(posts.toFumadocsSource()),
  i18n,
  icon: iconHelper,
});

// Logs source
export const logsSource = loader({
  baseUrl: '/logs',
  source: resolveSource(logs.toFumadocsSource()),
  i18n,
  icon: iconHelper,
});

// Keep backward compatibility
export const source = docsSource;
