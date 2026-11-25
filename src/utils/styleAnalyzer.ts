import type {
  DiffToken,
  DocBlock,
  DocStats,
  StyleProfile,
} from '../types/doc';

function pickMostFrequent<T extends string | number>(
  values: T[],
  fallback: T
): T {
  if (values.length === 0) return fallback;
  const counts = new Map<T, number>();
  for (const val of values) {
    counts.set(val, (counts.get(val) ?? 0) + 1);
  }
  let bestVal = fallback;
  let bestCount = -1;
  for (const [val, count] of counts.entries()) {
    if (count > bestCount) {
      bestVal = val;
      bestCount = count;
    }
  }
  return bestVal;
}

function inferFormality(textSample: string): StyleProfile['formality'] {
  const lower = textSample.toLowerCase();
  if (
    lower.includes('metodología') ||
    lower.includes('hipótesis') ||
    lower.includes('abstract') ||
    lower.includes('bibliografía') ||
    lower.includes('estudio')
  ) {
    return 'Académico';
  }
  if (
    lower.includes('roi') ||
    lower.includes('trimestre') ||
    lower.includes('q1') ||
    lower.includes('q2') ||
    lower.includes('q3') ||
    lower.includes('directivo') ||
    lower.includes('kpi') ||
    lower.includes('ingresos')
  ) {
    return 'Ejecutivo';
  }
  if (
    lower.includes('arquitectura') ||
    lower.includes('api') ||
    lower.includes('latencia') ||
    lower.includes('endpoint') ||
    lower.includes('especificación')
  ) {
    return 'Técnico';
  }
  return 'Editorial';
}

export function extractStyleProfileFromBlocks(
  blocks: DocBlock[],
  docTitle: string,
  toneOverride?: string
): StyleProfile {
  const h1Fonts: string[] = [];
  const bodyFonts: string[] = [];
  const h1Sizes: number[] = [];
  const h2Sizes: number[] = [];
  const h3Sizes: number[] = [];
  const bodySizes: number[] = [];
  const lineHeights: number[] = [];
  const headingColors: string[] = [];
  const bodyColors: string[] = [];
  const tableHeaderBgs: string[] = [];
  const tableHeaderTexts: string[] = [];
  const calloutBgs: string[] = [];

  const textChunks: string[] = [docTitle];

  for (const block of blocks) {
    if (block.text) textChunks.push(block.text);
    if (block.items) textChunks.push(block.items.join(' '));

    const st = block.style;
    if (block.type === 'heading1') {
      if (st?.fontFamily) h1Fonts.push(st.fontFamily);
      if (st?.fontSizePx) h1Sizes.push(st.fontSizePx);
      if (st?.color) headingColors.push(st.color);
    } else if (block.type === 'heading2') {
      if (st?.fontFamily) h1Fonts.push(st.fontFamily);
      if (st?.fontSizePx) h2Sizes.push(st.fontSizePx);
      if (st?.color) headingColors.push(st.color);
    } else if (block.type === 'heading3') {
      if (st?.fontSizePx) h3Sizes.push(st.fontSizePx);
    } else if (
      block.type === 'paragraph' ||
      block.type === 'bulletList' ||
      block.type === 'numberedList' ||
      block.type === 'checklist'
    ) {
      if (st?.fontFamily) bodyFonts.push(st.fontFamily);
      if (st?.fontSizePx) bodySizes.push(st.fontSizePx);
      if (st?.color) bodyColors.push(st.color);
      if (st?.lineHeight) lineHeights.push(st.lineHeight);
    } else if (block.type === 'callout') {
      if (st?.backgroundColor) calloutBgs.push(st.backgroundColor);
      if (st?.color) headingColors.push(st.color);
    } else if (block.type === 'table' && block.table) {
      if (block.table.headerBg) tableHeaderBgs.push(block.table.headerBg);
      if (block.table.headerTextColor) {
        tableHeaderTexts.push(block.table.headerTextColor);
      }
    }
  }

  const fontDisplay = pickMostFrequent(h1Fonts, 'Plus Jakarta Sans');
  const fontBody = pickMostFrequent(bodyFonts, fontDisplay);
  const h1SizePx = pickMostFrequent(h1Sizes, 28);
  const h2SizePx = pickMostFrequent(h2Sizes, 20);
  const h3SizePx = pickMostFrequent(h3Sizes, 16);
  const bodySizePx = pickMostFrequent(bodySizes, 15);
  const lineHeight = pickMostFrequent(lineHeights, 1.65);
  const primaryColor = pickMostFrequent(headingColors, '#0F172A');
  const textColor = pickMostFrequent(bodyColors, '#1E293B');
  const tableHeaderBg = pickMostFrequent(tableHeaderBgs, primaryColor);
  const tableHeaderText = pickMostFrequent(tableHeaderTexts, '#FFFFFF');
  const calloutBg = pickMostFrequent(calloutBgs, '#F1F5F9');

  const combinedText = textChunks.join(' ');
  const formality = inferFormality(combinedText);

  return {
    id: `cloned-${Date.now()}`,
    name: `Estilo clonado · ${docTitle.slice(0, 26)}`,
    description: `Tipografía ${fontDisplay}/${fontBody}, cuerpo ${bodySizePx}px y paleta ${primaryColor} extraídos del documento.`,
    fontDisplay,
    fontBody,
    h1SizePx,
    h2SizePx,
    h3SizePx,
    bodySizePx,
    lineHeight,
    primaryColor,
    accentColor: primaryColor === '#0F172A' ? '#1A73E8' : primaryColor,
    textColor,
    mutedColor: '#64748B',
    tableHeaderBg,
    tableHeaderText,
    calloutBg,
    tone:
      toneOverride ??
      `Consistente con el documento actual (${formality.toLowerCase()}, párrafos claros y estructura escaneable).`,
    formality,
    writingRules:
      'Mantener jerarquía visual detectada, títulos concisos y datos clave estructurados en listas o tablas.',
    isCustom: true,
  };
}

export function applyStyleProfileToBlocks(
  blocks: DocBlock[],
  profile: StyleProfile
): DocBlock[] {
  return blocks.map((block) => {
    if (block.type === 'divider') return block;

    if (block.type === 'heading1') {
      return {
        ...block,
        style: {
          ...block.style,
          fontFamily: profile.fontDisplay,
          fontSizePx: profile.h1SizePx,
          color: profile.primaryColor,
          lineHeight: 1.25,
          bold: true,
        },
      };
    }

    if (block.type === 'heading2') {
      return {
        ...block,
        style: {
          ...block.style,
          fontFamily: profile.fontDisplay,
          fontSizePx: profile.h2SizePx,
          color: profile.primaryColor,
          lineHeight: 1.35,
          bold: true,
        },
      };
    }

    if (block.type === 'heading3') {
      return {
        ...block,
        style: {
          ...block.style,
          fontFamily: profile.fontDisplay,
          fontSizePx: profile.h3SizePx,
          color: profile.accentColor,
          lineHeight: 1.4,
          bold: true,
        },
      };
    }

    if (block.type === 'callout') {
      return {
        ...block,
        style: {
          ...block.style,
          fontFamily: profile.fontBody,
          fontSizePx: profile.bodySizePx,
          color: profile.textColor,
          backgroundColor: profile.calloutBg,
          lineHeight: profile.lineHeight,
        },
      };
    }

    if (block.type === 'table' && block.table) {
      return {
        ...block,
        style: {
          ...block.style,
          fontFamily: profile.fontBody,
          fontSizePx: Math.max(12, profile.bodySizePx - 1),
          color: profile.textColor,
        },
        table: {
          ...block.table,
          headerBg: profile.tableHeaderBg,
          headerTextColor: profile.tableHeaderText,
        },
      };
    }

    return {
      ...block,
      style: {
        ...block.style,
        fontFamily: profile.fontBody,
        fontSizePx: profile.bodySizePx,
        color: profile.textColor,
        lineHeight: profile.lineHeight,
      },
    };
  });
}

export function computeWordDiff(before: string, after: string): DiffToken[] {
  const a = before.trim() ? before.trim().split(/\s+/) : [];
  const b = after.trim() ? after.trim().split(/\s+/) : [];

  if (a.length === 0) {
    return b.map((word) => ({ text: word, kind: 'added' }));
  }
  if (b.length === 0) {
    return a.map((word) => ({ text: word, kind: 'removed' }));
  }

  // LCS matrix for clean, accurate word-level diffing
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array<number>(n + 1).fill(0)
  );

  for (let i = m - 1; i >= 0; i--) {
    for (let j = n - 1; j >= 0; j--) {
      if (a[i] === b[j]) {
        dp[i][j] = 1 + dp[i + 1][j + 1];
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }

  const tokens: DiffToken[] = [];
  let i = 0;
  let j = 0;
  while (i < m && j < n) {
    if (a[i] === b[j]) {
      tokens.push({ text: a[i], kind: 'same' });
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      tokens.push({ text: a[i], kind: 'removed' });
      i++;
    } else {
      tokens.push({ text: b[j], kind: 'added' });
      j++;
    }
  }
  while (i < m) {
    tokens.push({ text: a[i++], kind: 'removed' });
  }
  while (j < n) {
    tokens.push({ text: b[j++], kind: 'added' });
  }

  return tokens;
}

export function blockToPlainText(block: DocBlock): string {
  if (block.type === 'table' && block.table) {
    const head = block.table.headers.join(' | ');
    const rows = block.table.rows.map((r) => r.join(' | ')).join('\n');
    return `${head}\n${rows}`;
  }
  if (block.items && block.items.length > 0) {
    return block.items.join('\n');
  }
  if (block.checklist && block.checklist.length > 0) {
    return block.checklist.map((c) => `${c.checked ? '[x]' : '[ ]'} ${c.text}`).join('\n');
  }
  return block.text ?? '';
}

export function calculateDocStats(blocks: DocBlock[]): DocStats {
  let words = 0;
  let chars = 0;
  let tables = 0;
  let questions = 0;

  for (const block of blocks) {
    if (block.type === 'table') tables++;
    if (block.type === 'qaQuestion' && !block.answered) questions++;

    const plain = blockToPlainText(block);
    if (plain.trim()) {
      chars += plain.length;
      const tokens = plain
        .replace(/\|/g, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);
      words += tokens.length;
      if (block.type !== 'qaQuestion' && plain.includes('?') && plain.trim().endsWith('?')) {
        questions++;
      }
    }
  }

  const readingMinutes = Math.max(1, Math.ceil(words / 200));
  return { words, chars, tables, questions, readingMinutes };
}

export function serializeBlocksForAI(blocks: DocBlock[]): string {
  return blocks
    .map((b) => {
      const prefix = `[id:${b.id} type:${b.type}]`;
      return `${prefix} ${blockToPlainText(b)}`;
    })
    .join('\n\n');
}
