'use client';

import { createContext, createElement, useContext, type AnchorHTMLAttributes, type ComponentType, type ReactNode, type Ref } from 'react';

/**
 * Package-only stand-in for `next/link`. The kit renders internal links through this, so the
 * library works in any React app. By default it draws a plain <a>; wrap the app in
 * <UILinkProvider link={NextLink}> (or a React Router adapter) for client-side navigation.
 */
export type LinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & { href: string; ref?: Ref<HTMLAnchorElement> };
export type LinkComponent = ComponentType<LinkProps>;

const LinkContext = createContext<LinkComponent | null>(null);

export function UILinkProvider({ link, children }: Readonly<{ link: LinkComponent; children: ReactNode }>) {
  return <LinkContext.Provider value={link}>{children}</LinkContext.Provider>;
}

export default function Link(props: LinkProps) {
  // The provider's component, set once at the app root, or a plain anchor.
  return createElement(useContext(LinkContext) ?? 'a', props);
}
