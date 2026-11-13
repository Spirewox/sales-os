export function formatStockQuantity(quantity: number, unit?: string): string {
  const liters = /^(liters?|litres?|l)$/i.test(unit?.trim() ?? '');
  return new Intl.NumberFormat('en-NG', { useGrouping: false, maximumFractionDigits: liters ? 3 : 2 }).format(quantity);
}

/** Format carton stock as whole cartons + remaining kg (display only). */
export function formatCartonStock(
  currentStock: number,
  cartonWeight?: number | null,
): string {
  const stock = Number(currentStock) || 0;
  const weight = Number(cartonWeight) || 0;
  if (weight <= 0) {
    return `${formatStockQuantity(stock)} carton${stock === 1 ? '' : 's'}`;
  }

  const totalKg = stock * weight;
  const eps = 1e-9;
  let wholeCartons = Math.floor(totalKg / weight + eps);
  let remKg = totalKg - wholeCartons * weight;
  remKg = Math.round(remKg * 100) / 100;
  if (remKg < 0) remKg = 0;
  if (remKg >= weight - eps) {
    wholeCartons += 1;
    remKg = 0;
  }

  const cartonLabel = `${wholeCartons} carton${wholeCartons === 1 ? '' : 's'}`;
  if (remKg < eps) return cartonLabel;
  const kgLabel = formatStockQuantity(remKg);
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
  return `${formatStockQuantity(item.currentStock, uom)}${uom ? ` ${uom}` : ''}`.trim();
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
