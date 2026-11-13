import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  formatCartonStock,
  formatInventoryStockDisplay,
  formatStockLogReference,
} from './format-carton-stock';

describe('formatCartonStock', () => {
  it('formats 10 cartons after 1kg sale as 9 carton 99kg', () => {
    // 10 * 100kg - 1kg = 999kg → 9 cartons + 99kg
    const stock = 999 / 100;
    assert.equal(formatCartonStock(stock, 100), '9 cartons 99kg');
  });

  it('omits rem kg when whole cartons', () => {
    assert.equal(formatCartonStock(5, 20), '5 cartons');
  });

  it('singular carton label', () => {
    assert.equal(formatCartonStock(1, 20), '1 carton');
  });
});

describe('formatInventoryStockDisplay', () => {
  it('uses carton format for Cartons UOM', () => {
    assert.equal(formatInventoryStockDisplay({
        currentStock: 9.99,
        unitOfMeasure: 'Cartons',
        cartonWeight: 100,
      }), '9 cartons 99kg');
  });

  it('hides floating-point tails while preserving liters precision', () => {
    assert.equal(formatInventoryStockDisplay({ currentStock: 18.049999999999997, unitOfMeasure: 'Kg' }), '18.05 Kg');
    assert.equal(formatInventoryStockDisplay({ currentStock: 0.125000000000001, unitOfMeasure: 'Litres' }), '0.125 Litres');
  });

  it('falls back for non-carton UOM', () => {
    assert.equal(formatInventoryStockDisplay({
        currentStock: 12,
        unitOfMeasure: 'Kg',
      }), '12 Kg');
  });
});

describe('formatStockLogReference', () => {
  it('prefers notes over mongo id', () => {
    assert.equal(formatStockLogReference({
        notes: 'Expense attach: Fish · 3 Kg · Ada',
        referenceId: '507f1f77bcf86cd799439011',
      }), 'Expense attach: Fish · 3 Kg · Ada');
  });

  it('hides bare mongo ids when notes missing', () => {
    assert.equal(formatStockLogReference({
        referenceId: '507f1f77bcf86cd799439011',
      }), null);
  });
});
