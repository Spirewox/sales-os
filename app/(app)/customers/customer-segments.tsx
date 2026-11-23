// Segments are categories, not state: every group renders as the same neutral chip.
const SEGMENT_CHIP = 'bg-muted text-muted-foreground';

/** Put the segments the user is filtering by first. */
export function prioritizeCustomerSegments(segments: string[], priorityNames: string[]) {
  if (!priorityNames.length) return segments;
  const priority = new Set(priorityNames);
  return [...segments.filter((s) => priority.has(s)), ...segments.filter((s) => !priority.has(s))];
}

/** Segment chips are neutral regardless of group. */
export function segmentBadgeClass() {
  return SEGMENT_CHIP;
}

export function SegmentChips({ segments, max }: Readonly<{ segments: string[]; max?: number }>) {
  const shown = max ? segments.slice(0, max) : segments;
  return (
    <div className="flex flex-wrap gap-1.5">
      {shown.map((seg) => (
        <span key={seg} className={`inline-flex h-5 items-center rounded-full px-2 text-xs ${SEGMENT_CHIP}`}>{seg}</span>
      ))}
      {max && segments.length > max && <span className="text-xs text-muted-foreground tabular-nums">+{segments.length - max}</span>}
    </div>
  );
}
