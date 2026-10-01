import { useState } from "react";

/**
 * Zero-based page index for a server-paged table that snaps back to the first page whenever `filterKey`
 * changes. Reset during render (React's "adjust state when a prop changes" pattern) rather than in an effect,
 * so a filter change never fetches the old page first.
 */
export function usePageIndex(filterKey: string): [number, (pageIndex: number) => void] {
  const [state, setState] = useState({ key: filterKey, index: 0 });
  if (state.key !== filterKey) {
    setState({ key: filterKey, index: 0 });
  }
  const pageIndex = state.key === filterKey ? state.index : 0;
  return [pageIndex, (index) => setState({ key: filterKey, index })];
}
