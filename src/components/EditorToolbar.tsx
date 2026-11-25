import React from 'react';
import {
  FilePlus2,
  HelpCircle,
  PanelRightClose,
  PanelRightOpen,
  Quote,
  Table2,
  Type,
  Undo2,
} from 'lucide-react';
import type { DocStats, DocumentData, StyleProfile } from '../types/doc';

interface EditorToolbarProps {
  documents: DocumentData[];
  activeDocument: DocumentData;
  onSelectDocument: (id: string) => void;
  onCreateDocument: () => void;
  onRenameDocument: (title: string) => void;
  activeTemplate: StyleProfile;
  stats: DocStats;
  canUndo: boolean;
  onUndo: () => void;
  onInsertQuickBlock: (kind: 'paragraph' | 'table' | 'qaQuestion' | 'callout') => void;
  inspectorOpen: boolean;
  onToggleInspector: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  documents,
  activeDocument,
  onSelectDocument,
  onCreateDocument,
  onRenameDocument,
  activeTemplate,
  stats,
  canUndo,
  onUndo,
  onInsertQuickBlock,
  inspectorOpen,
  onToggleInspector,
}) => {
  return (
    <div className="bg-[#F8FAFC] border-b border-slate-200 px-4 lg:px-6 py-2 flex flex-wrap items-center justify-between gap-3 shrink-0 z-20">
      {/* Left: Document Switcher & Editable Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <label htmlFor="doc-selector" className="text-xs font-medium text-slate-500 hidden sm:inline shrink-0">
          Docs:
        </label>
        <select
          id="doc-selector"
          aria-label="Seleccionar documento"
          value={activeDocument.id}
          onChange={(e) => onSelectDocument(e.target.value)}
          className="h-8 px-2 text-xs font-medium text-slate-700 bg-white border border-slate-200 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 max-w-[140px] truncate"
        >
          {documents.map((doc) => (
            <option key={doc.id} value={doc.id}>
              {doc.title}
            </option>
          ))}
        </select>

        <input
          type="text"
          aria-label="Título del documento"
          value={activeDocument.title}
          onChange={(e) => onRenameDocument(e.target.value)}
          className="h-8 px-2.5 text-sm font-semibold text-slate-900 bg-white/70 hover:bg-white focus:bg-white border border-slate-200/80 focus:border-blue-500 rounded-md focus-visible:outline-none w-[200px] sm:w-[240px] truncate"
        />

        <button
          type="button"
          onClick={onCreateDocument}
          title="Crear nuevo documento"
          aria-label="Crear nuevo documento"
          className="h-8 px-2.5 flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:text-slate-950 hover:bg-slate-200/60 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <FilePlus2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span className="hidden sm:inline">Nuevo</span>
        </button>
      </div>

      {/* Center: Google Docs Quick Element Controls */}
      <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-1.5 py-1">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Deshacer último cambio"
          aria-label="Deshacer último cambio"
          className="h-7 px-2 flex items-center gap-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none rounded transition-colors cursor-pointer"
        >
          <Undo2 className="w-3.5 h-3.5" aria-hidden="true" />
        </button>

        <span className="w-px h-4 bg-slate-200 mx-0.5" aria-hidden="true" />

        <button
          type="button"
          onClick={() => onInsertQuickBlock('paragraph')}
          className="h-7 px-2.5 flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Type className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Párrafo</span>
        </button>

        <button
          type="button"
          onClick={() => onInsertQuickBlock('table')}
          className="h-7 px-2.5 flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Table2 className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Tabla</span>
        </button>

        <button
          type="button"
          onClick={() => onInsertQuickBlock('callout')}
          className="h-7 px-2.5 flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Quote className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Destacado</span>
        </button>

        <button
          type="button"
          onClick={() => onInsertQuickBlock('qaQuestion')}
          className="h-7 px-2.5 flex items-center gap-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Pregunta</span>
        </button>
      </div>

      {/* Right: Clean Metadata + Inspector Toggle */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden xl:flex items-center gap-2 text-xs text-slate-500 tabular-nums">
          <span>{stats.words} palabras</span>
          <span aria-hidden="true">·</span>
          <span className="truncate max-w-[160px]">{activeTemplate.name}</span>
        </div>

        <button
          type="button"
          onClick={onToggleInspector}
          aria-expanded={inspectorOpen}
          className="h-8 px-3 flex items-center gap-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          {inspectorOpen ? (
            <PanelRightClose className="w-3.5 h-3.5" aria-hidden="true" />
          ) : (
            <PanelRightOpen className="w-3.5 h-3.5" aria-hidden="true" />
          )}
          <span>{inspectorOpen ? 'Ocultar panel' : 'Panel de estilo'}</span>
        </button>
      </div>
    </div>
  );
};
