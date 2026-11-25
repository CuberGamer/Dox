export type DocBlockType =
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'paragraph'
  | 'bulletList'
  | 'numberedList'
  | 'table'
  | 'callout'
  | 'checklist'
  | 'qaQuestion'
  | 'divider';

export interface BlockInlineStyle {
  fontFamily?: string;
  fontSizePx?: number;
  color?: string;
  lineHeight?: number;
  backgroundColor?: string;
  bold?: boolean;
  italic?: boolean;
}

export interface TableData {
  headers: string[];
  rows: string[][];
  headerBg?: string;
  headerTextColor?: string;
  zebraStripe?: boolean;
}

export interface ChecklistItem {
  text: string;
  checked: boolean;
}

export interface DocBlock {
  id: string;
  type: DocBlockType;
  text?: string;
  items?: string[];
  checklist?: ChecklistItem[];
  table?: TableData;
  style?: BlockInlineStyle;
  answered?: boolean;
}

export interface StyleProfile {
  id: string;
  name: string;
  description: string;
  fontDisplay: string;
  fontBody: string;
  h1SizePx: number;
  h2SizePx: number;
  h3SizePx: number;
  bodySizePx: number;
  lineHeight: number;
  primaryColor: string;
  accentColor: string;
  textColor: string;
  mutedColor: string;
  tableHeaderBg: string;
  tableHeaderText: string;
  calloutBg: string;
  tone: string;
  formality: 'Ejecutivo' | 'Académico' | 'Directo' | 'Editorial' | 'Técnico';
  writingRules: string;
  isCustom?: boolean;
}

export interface DocumentData {
  id: string;
  title: string;
  updatedAt: string;
  blocks: DocBlock[];
  activeTemplateId: string;
}

export type ComposeMode = 'compose' | 'answer' | 'table' | 'style';

export interface ProposedChange {
  id: string;
  mode: ComposeMode;
  action: 'insert_end' | 'insert_after' | 'replace_block';
  targetBlockId?: string;
  summary: string;
  rationale: string;
  beforeText?: string;
  blocks: DocBlock[];
}

export interface StyleSuggestion {
  id: string;
  category: 'tono' | 'claridad' | 'estilo' | 'estructura';
  title: string;
  description: string;
  targetBlockId: string;
  originalSnippet: string;
  suggestedBlock: DocBlock;
}

export interface DiffToken {
  text: string;
  kind: 'same' | 'added' | 'removed';
}

export interface DocStats {
  words: number;
  chars: number;
  tables: number;
  questions: number;
  readingMinutes: number;
}
