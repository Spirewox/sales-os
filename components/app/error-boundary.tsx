'use client';

import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

type Props = {
  children: ReactNode;
  /** Names the section in the message, e.g. "Alerts". */
  label?: string;
  /** Reset the boundary when this changes (e.g. the active tab). */
  resetKey?: unknown;
};
type State = { error: Error | null; resetKey: unknown };

/**
 * Wrap each tab or page section so one bad response shows a contained message
 * instead of blanking the whole page.
 */
export class SectionErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    if (props.resetKey !== state.resetKey) return { error: null, resetKey: props.resetKey };
    return null;
  }

  componentDidCatch(error: Error) {
    console.error(`[${this.props.label ?? 'section'}]`, error);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div role="alert" className="flex flex-col items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-destructive">
          <AlertTriangle size={16} aria-hidden />
          {this.props.label ? `${this.props.label} couldn't load` : "This section couldn't load"}
        </div>
        <p className="text-sm text-muted-foreground">The rest of the page still works. Try again, or reload if it keeps happening.</p>
        <button
          type="button"
          onClick={() => this.setState({ error: null })}
          className="h-8 rounded-md border bg-background px-3 text-sm font-medium hover:bg-muted"
        >
          Try again
        </button>
      </div>
    );
  }
}
