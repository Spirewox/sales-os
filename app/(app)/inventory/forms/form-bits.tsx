'use client';

import type { InventoryItem } from '@/types';
import { FilterSelect } from '@/components/filter-select';
import { SkuPhoto } from '@/components/product-image-editor';
import { formatInventoryStockDisplay } from '@/lib/format-carton-stock';
import { FormField } from '@/components/app';

/** Native-select-free dropdown sized like `fieldClass`. */
export const selectClass = 'h-9 data-[size=default]:h-9';

/** "Product" section body: a picker when the form was opened without a product, else a summary line. */
export function ProductField({ id, items, product, locked, onChange }: Readonly<{
  id: string;
  items: InventoryItem[];
  product: InventoryItem | null;
  locked?: boolean;
  onChange?: (item: InventoryItem | null) => void;
}>) {
  return (
    <div className="space-y-3">
      {!locked && (
        <FormField label="Product" htmlFor={id} required>
          <FilterSelect
            id={id}
            value={product?.id ?? 'none'}
            onChange={(v) => onChange?.(items.find((i) => i.id === v) ?? null)}
            className={selectClass}
            options={[
              { value: 'none', label: 'Choose a product' },
              ...items.map((i) => ({ value: i.id, label: `${i.name} (${i.sku})` })),
            ]}
          />
        </FormField>
      )}
      {product && <ProductSummary item={product} />}
    </div>
  );
}

export function ProductSummary({ item }: Readonly<{ item: InventoryItem }>) {
  return (
    <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2.5">
      <SkuPhoto url={item.imageUrl} className="h-9 w-9" />
      <div className="min-w-0 text-sm">
        <p className="truncate font-medium">{item.name} <span className="font-mono text-xs text-muted-foreground">{item.sku}</span></p>
        <p className="text-xs text-muted-foreground">
          On hand <span className="font-medium text-foreground tabular-nums">{formatInventoryStockDisplay(item)}</span> in {item.location}
        </p>
      </div>
    </div>
  );
}

/** Small read-only line under a field. */
export function Hint({ children }: Readonly<{ children: React.ReactNode }>) {
  return <p className="text-xs text-muted-foreground">{children}</p>;
}
