// Override the JSX namespace so that React Email components (which
// return `JSX.Element | undefined` under React 19) are assignable to
// JSX element positions. The default React 19 JSX namespace types
// `Element` as `React.ReactElement<any, any>`, which can't be
// `undefined` — but `react-email` components can return `undefined`
// (e.g. when a prop is missing). This declaration widens the return
// type to `Element | null | undefined` to match the runtime.
//
// See: https://github.com/resend/react-email/issues/1432
import { type ReactElement, type ReactNode } from "react";

declare global {
  namespace JSX {
    // Allow JSX expressions to evaluate to `Element | null` (the React
    // 19 default) or to a `ReactNode` (which `react-email` components
    // may return). We widen `Element` to also accept `undefined` so
    // `react-email`'s optional-render paths typecheck.
    type Element = ReactElement<unknown, unknown> | null | undefined;
  }
}

export type { ReactNode };
