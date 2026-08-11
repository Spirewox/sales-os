import {
  formatCartonStock,
  formatInventoryStockDisplay,
  formatStockLogReference,
} from './format-carton-stock';

describe('formatCartonStock', () => {
  it('formats 10 cartons after 1kg sale as 9 carton 99kg', () => {
    // 10 * 100kg - 1kg = 999kg → 9 cartons + 99kg
    const stock = 999 / 100;
    expect(formatCartonStock(stock, 100)).toBe('9 cartons 99kg');
  });

  it('omits rem kg when whole cartons', () => {
    expect(formatCartonStock(5, 20)).toBe('5 cartons');
  });

  it('singular carton label', () => {
    expect(formatCartonStock(1, 20)).toBe('1 carton');
  });
});

describe('formatInventoryStockDisplay', () => {
  it('uses carton format for Cartons UOM', () => {
    expect(
      formatInventoryStockDisplay({
        currentStock: 9.99,
        unitOfMeasure: 'Cartons',
        cartonWeight: 100,
      }),
    ).toBe('9 cartons 99kg');
  });

  it('falls back for non-carton UOM', () => {
    expect(
      formatInventoryStockDisplay({
        currentStock: 12,
        unitOfMeasure: 'Kg',
      }),
    ).toBe('12 Kg');
  });
});

describe('formatStockLogReference', () => {
  it('prefers notes over mongo id', () => {
    expect(
      formatStockLogReference({
        notes: 'Expense attach: Fish · 3 Kg · Ada',
        referenceId: '507f1f77bcf86cd799439011',
      }),
    ).toBe('Expense attach: Fish · 3 Kg · Ada');
  });

  it('hides bare mongo ids when notes missing', () => {
    expect(
      formatStockLogReference({
        referenceId: '507f1f77bcf86cd799439011',
      }),
    ).toBeNull();
  });
});
