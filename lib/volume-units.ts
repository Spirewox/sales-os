export const ML_PER_LITER = 1000;

export type VolumeUnit = 'Liters' | 'ml';
export type SaleFormUnit = 'Carton' | 'Kg' | 'Liters' | 'ml' | '';

export function isLitersUom(uom?: string | null): boolean {
  const u = String(uom ?? '')
    .trim()
    .toLowerCase();
  return u === 'liter' || u === 'liters' || u === 'litre' || u === 'litres' || u === 'l';
}

export function isMlUom(uom?: string | null): boolean {
  const u = String(uom ?? '')
    .trim()
    .toLowerCase();
  return (
    u === 'ml' ||
    u === 'milliliter' ||
    u === 'milliliters' ||
    u === 'millilitre' ||
    u === 'millilitres'
  );
}

export function isVolumeUom(uom?: string | null): boolean {
  return isLitersUom(uom) || isMlUom(uom);
}

export function roundLiters(n: number): number {
  return Math.round(n * 1000) / 1000;
}

export function parseVolumeUnit(raw?: string | null): VolumeUnit | null {
  if (isMlUom(raw)) return 'ml';
  if (isLitersUom(raw)) return 'Liters';
  return null;
}

export function defaultVolumeUnit(catalogUom?: string | null): VolumeUnit | '' {
  if (isMlUom(catalogUom)) return 'ml';
  if (isLitersUom(catalogUom)) return 'Liters';
  return '';
}

export function volumeUnitOptions(catalogUom?: string | null): VolumeUnit[] {
  if (isMlUom(catalogUom)) return ['ml', 'Liters'];
  if (isLitersUom(catalogUom)) return ['Liters', 'ml'];
  return [];
}

export function volumeEnteredQtyToStock(
  catalogUom: string | undefined,
  quantity: number,
  entered: string,
): number {
  const qty = Number(quantity);
  if (!(qty > 0) || !catalogUom) return qty > 0 ? qty : 0;
  const enteredUnit = parseVolumeUnit(entered);
  if (!enteredUnit) return qty;
  if (isLitersUom(catalogUom)) {
    return enteredUnit === 'ml' ? roundLiters(qty / ML_PER_LITER) : roundLiters(qty);
  }
  if (isMlUom(catalogUom)) {
    return enteredUnit === 'Liters' ? Math.round(qty * ML_PER_LITER * 1000) / 1000 : qty;
  }
  return qty;
}

export function volumeUnitPrice(
  catalogUom: string | undefined,
  catalogPrice: number,
  entered: string,
): number {
  const price = Number(catalogPrice) || 0;
  const enteredUnit = parseVolumeUnit(entered);
  if (!enteredUnit || !catalogUom) return price;
  if (isLitersUom(catalogUom)) {
    return enteredUnit === 'ml' ? price / ML_PER_LITER : price;
  }
  if (isMlUom(catalogUom)) {
    return enteredUnit === 'Liters' ? price * ML_PER_LITER : price;
  }
  return price;
}

export function volumeConversionPreview(
  catalogUom: string | undefined,
  quantity: number,
  entered: string,
): string | null {
  if (!(quantity > 0) || !isVolumeUom(catalogUom)) return null;
  const enteredUnit = parseVolumeUnit(entered);
  if (!enteredUnit) return null;
  const catalogLabel = isMlUom(catalogUom) ? 'ml' : 'Liters';
  if (enteredUnit === catalogLabel) return null;
  const stock = volumeEnteredQtyToStock(catalogUom, quantity, entered);
  return `${quantity} ${enteredUnit} = ${stock} ${catalogLabel} (stock unit)`;
}
