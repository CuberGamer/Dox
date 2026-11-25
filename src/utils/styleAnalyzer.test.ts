import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyStyleProfileToBlocks,
  calculateDocStats,
  computeWordDiff,
  extractStyleProfileFromBlocks,
} from './styleAnalyzer';
import type { DocBlock } from '../types/doc';

test('extractStyleProfileFromBlocks clones dominant fonts, sizes, and colors', () => {
  const blocks: DocBlock[] = [
    {
      id: '1',
      type: 'heading1',
      text: 'Propuesta Comercial',
      style: { fontFamily: 'Playfair Display', fontSizePx: 32, color: '#1E3A5F' },
    },
    {
      id: '2',
      type: 'paragraph',
      text: 'Nuestro análisis de ROI para el trimestre Q3 demuestra crecimiento sólido.',
      style: { fontFamily: 'Lora', fontSizePx: 16, color: '#1F2937', lineHeight: 1.75 },
    },
    {
      id: '3',
      type: 'paragraph',
      text: 'Proyectamos expansión regional con métricas claras.',
      style: { fontFamily: 'Lora', fontSizePx: 16, color: '#1F2937', lineHeight: 1.75 },
    },
  ];

  const profile = extractStyleProfileFromBlocks(blocks, 'Plan Q3');
  assert.equal(profile.fontDisplay, 'Playfair Display');
  assert.equal(profile.fontBody, 'Lora');
  assert.equal(profile.h1SizePx, 32);
  assert.equal(profile.bodySizePx, 16);
  assert.equal(profile.primaryColor, '#1E3A5F');
  assert.equal(profile.textColor, '#1F2937');
  assert.equal(profile.lineHeight, 1.75);
  assert.equal(profile.formality, 'Ejecutivo');
});

test('computeWordDiff highlights added and removed words accurately', () => {
  const diff = computeWordDiff(
    'El sistema actual es lento.',
    'El sistema nuevo es muy rápido.'
  );

  const removed = diff.filter((d) => d.kind === 'removed').map((d) => d.text);
  const added = diff.filter((d) => d.kind === 'added').map((d) => d.text);
  const same = diff.filter((d) => d.kind === 'same').map((d) => d.text);

  assert.deepEqual(same, ['El', 'sistema', 'es']);
  assert.deepEqual(removed, ['actual', 'lento.']);
  assert.deepEqual(added, ['nuevo', 'muy', 'rápido.']);
});

test('applyStyleProfileToBlocks updates heading, paragraph, and table styling', () => {
  const blocks: DocBlock[] = [
    { id: 'h1', type: 'heading1', text: 'Título' },
    {
      id: 't1',
      type: 'table',
      table: { headers: ['Col A', 'Col B'], rows: [['1', '2']] },
    },
  ];
  const profile = extractStyleProfileFromBlocks(
    [
      {
        id: 'ref',
        type: 'heading1',
        text: 'Ref',
        style: { fontFamily: 'Manrope', fontSizePx: 26, color: '#0F766E' },
      },
    ],
    'Spec'
  );

  const styled = applyStyleProfileToBlocks(blocks, profile);
  assert.equal(styled[0].style?.fontFamily, 'Manrope');
  assert.equal(styled[0].style?.color, '#0F766E');
  assert.equal(styled[1].table?.headerBg, '#0F766E');
});

test('calculateDocStats counts words, tables, and open questions', () => {
  const blocks: DocBlock[] = [
    { id: '1', type: 'paragraph', text: 'Uno dos tres cuatro' },
    { id: '2', type: 'qaQuestion', text: '¿Pregunta abierta?', answered: false },
    { id: '3', type: 'qaQuestion', text: '¿Pregunta resuelta?', answered: true },
    {
      id: '4',
      type: 'table',
      table: { headers: ['A', 'B'], rows: [['x', 'y']] },
    },
  ];

  const stats = calculateDocStats(blocks);
  assert.equal(stats.tables, 1);
  assert.equal(stats.questions, 1);
  assert.equal(stats.words, 12);
});
