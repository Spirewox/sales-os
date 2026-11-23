'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

export function StarRating({ value, size = 12 }: Readonly<{ value?: number; size?: number }>) {
  const v = value ?? 0;
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`${v} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={size} aria-hidden className={i <= v ? 'text-foreground' : 'text-muted-foreground/30'} fill={i <= v ? 'currentColor' : 'none'} />
      ))}
    </span>
  );
}

/** Five radio buttons; `labelledBy` points at the field's visible label. */
export function StarRatingInput({ value, onChange, size = 20, labelledBy }: Readonly<{ value?: number; onChange: (rating: number) => void; size?: number; labelledBy?: string }>) {
  const [hovered, setHovered] = useState(0);
  const selected = value ?? 0;
  const display = hovered || selected;

  return (
    <div className="inline-flex items-center gap-0.5" role="radiogroup" aria-labelledby={labelledBy} aria-label={labelledBy ? undefined : 'Rating'} onMouseLeave={() => setHovered(0)}>
      {[1, 2, 3, 4, 5].map((i) => {
        const active = i <= display;
        return (
          <button
            key={i}
            type="button"
            role="radio"
            aria-checked={selected === i}
            aria-label={`${i} star${i === 1 ? '' : 's'}`}
            onClick={() => onChange(i)}
            onMouseEnter={() => setHovered(i)}
            onFocus={() => setHovered(i)}
            onBlur={() => setHovered(0)}
            className="rounded-md p-0.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Star size={size} aria-hidden className={active ? 'text-foreground' : 'text-muted-foreground/30'} fill={active ? 'currentColor' : 'none'} />
          </button>
        );
      })}
    </div>
  );
}
