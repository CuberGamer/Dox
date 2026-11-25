import test from 'node:test';
import assert from 'node:assert/strict';
import { buildZipArchive, crc32 } from './zipBuilder';

test('crc32 computes standard IEEE 802.3 checksum', () => {
  const bytes = new TextEncoder().encode('123456789');
  assert.equal(crc32(bytes), 0xcbf43926);
});

test('buildZipArchive produces valid PK local headers and EOCD signature', () => {
  const zip = buildZipArchive([
    { name: 'manifest.json', content: '{"manifest_version":3}' },
    { name: 'README.txt', content: 'Trazo Extension' },
  ]);

  // Starts with PK\x03\x04
  assert.equal(zip[0], 0x50);
  assert.equal(zip[1], 0x4b);
  assert.equal(zip[2], 0x03);
  assert.equal(zip[3], 0x04);

  // Ends with EOCD signature PK\x05\x06 at offset length - 22
  const eocdOffset = zip.length - 22;
  const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
  assert.equal(view.getUint32(eocdOffset, true), 0x06054b50);
  assert.equal(view.getUint16(eocdOffset + 8, true), 2);
  assert.equal(view.getUint16(eocdOffset + 10, true), 2);
});
