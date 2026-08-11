/** Format carton stock as whole cartons + remaining kg (display only). */
export function formatCartonStock(
  currentStock: number,
  cartonWeight?: number | null,
): string {
  const stock = Number(currentStock) || 0;
  const weight = Number(cartonWeight) || 0;
  if (weight <= 0) {
    return `${stock} carton${stock === 1 ? '' : 's'}`;
  }

  const totalKg = stock * weight;
  const eps = 1e-9;
  let wholeCartons = Math.floor(totalKg / weight + eps);
  let remKg = totalKg - wholeCartons * weight;
  // Float-safe rounding to nearest 1kg (or 0.01 if fractional kg matter)
  remKg = Math.round(remKg * 1000) / 1000;
  if (remKg < 0) remKg = 0;
  if (remKg >= weight - eps) {
    wholeCartons += 1;
    remKg = 0;
  }

  const cartonLabel = `${wholeCartons} carton${wholeCartons === 1 ? '' : 's'}`;
  if (remKg < eps) return cartonLabel;
  const kgLabel = Number.isInteger(remKg) ? String(remKg) : String(remKg);
  return `${cartonLabel} ${kgLabel}kg`;
}

export function formatInventoryStockDisplay(item: {
  currentStock: number;
  unitOfMeasure?: string;
  cartonWeight?: number | null;
}): string {
  if (
    (item.unitOfMeasure || '').trim().toLowerCase() === 'cartons' &&
    item.cartonWeight != null &&
    Number(item.cartonWeight) > 0
  ) {
    return formatCartonStock(item.currentStock, item.cartonWeight);
  }
  const uom = item.unitOfMeasure || '';
  return `${item.currentStock}${uom ? ` ${uom}` : ''}`.trim();
}

/** Prefer human notes over raw Mongo sale ids for stock log references. */
export function formatStockLogReference(opts: {
  notes?: string | null;
  referenceId?: string | null;
}): string | null {
  const notes = (opts.notes || '').trim();
  if (notes) return notes;
  const ref = (opts.referenceId || '').trim();
  if (!ref) return null;
  if (/^[a-f\d]{24}$/i.test(ref)) return null;
  return ref;
}
