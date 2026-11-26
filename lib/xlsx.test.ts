import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { crc32 } from 'node:zlib';
import { buildXlsx, columnName, sheetName } from './xlsx';

/** Read a stored (uncompressed) zip: name → bytes, checking each CRC against Node's own. */
function unzip(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const files = new Map<string, string>();
  let at = 0;
  while (view.getUint32(at, true) === 0x04034b50) {
    const method = view.getUint16(at + 8, true);
    const crc = view.getUint32(at + 14, true);
    const size = view.getUint32(at + 18, true);
    const nameLen = view.getUint16(at + 26, true);
    const extraLen = view.getUint16(at + 28, true);
    const name = new TextDecoder().decode(bytes.subarray(at + 30, at + 30 + nameLen));
    const data = bytes.subarray(at + 30 + nameLen + extraLen, at + 30 + nameLen + extraLen + size);
    assert.equal(method, 0, `${name} is stored`);
    assert.equal(crc, crc32(data), `${name} CRC`);
    files.set(name, new TextDecoder().decode(data));
    at += 30 + nameLen + extraLen + size;
  }
  const eocd = bytes.length - 22;
  assert.equal(view.getUint32(eocd, true), 0x06054b50, 'end of central directory');
  assert.equal(view.getUint16(eocd + 10, true), files.size, 'entry count');
  return files;
}

describe('buildXlsx', () => {
  const bytes = buildXlsx('Suppliers', ['Name', 'Spend', 'Note'], [['Ada & Sons <Ltd>', 1250000.5, '=SUM(A1)'], ['Obi', -20, null]]);
  const files = unzip(bytes);

  it('holds the parts Excel needs', () => {
    assert.deepEqual([...files.keys()].sort(), [
      '[Content_Types].xml', '_rels/.rels', 'docProps/app.xml', 'xl/_rels/workbook.xml.rels', 'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml',
    ]);
  });

  it('names the sheet', () => {
    assert.match(files.get('xl/workbook.xml')!, /<sheet name="Suppliers" sheetId="1" r:id="rId1"\/>/);
  });

  it('writes numbers as numbers and text as escaped inline strings', () => {
    const sheet = files.get('xl/worksheets/sheet1.xml')!;
    assert.match(sheet, /<c r="B2"><v>1250000.5<\/v><\/c>/);
    assert.match(sheet, /<c r="B3"><v>-20<\/v><\/c>/);
    assert.match(sheet, /<c r="A2" t="inlineStr"><is><t xml:space="preserve">Ada &amp; Sons &lt;Ltd&gt;<\/t><\/is><\/c>/);
  });

  it('keeps a formula-looking value as text', () => {
    const sheet = files.get('xl/worksheets/sheet1.xml')!;
    assert.match(sheet, /<c r="C2" t="inlineStr"><is><t xml:space="preserve">=SUM\(A1\)<\/t><\/is><\/c>/);
    assert.doesNotMatch(sheet, /<f>/);
  });

  it('bolds the header row and freezes it', () => {
    const sheet = files.get('xl/worksheets/sheet1.xml')!;
    assert.match(sheet, /<c r="A1" s="1" t="inlineStr">/);
    assert.match(sheet, /<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"\/>/);
  });

  it('skips empty cells', () => {
    assert.doesNotMatch(files.get('xl/worksheets/sheet1.xml')!, /r="C3"/);
  });

  it('drops characters XML cannot hold', () => {
    const sheet = unzip(buildXlsx('S', ['A'], [['bad\u0001text']])).get('xl/worksheets/sheet1.xml')!;
    assert.match(sheet, />badtext</);
  });
});

describe('columnName', () => {
  it('counts past Z', () => {
    assert.deepEqual([0, 25, 26, 27, 701, 702].map(columnName), ['A', 'Z', 'AA', 'AB', 'ZZ', 'AAA']);
  });
});

describe('sheetName', () => {
  it('removes characters Excel forbids and keeps 31 characters', () => {
    assert.equal(sheetName('Stock: movements / requests [all] and everything else'), 'Stock movements  requests all a');
    assert.equal(sheetName(''), 'Sheet1');
  });
});
