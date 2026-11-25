import React from 'react';

export type InspectorTab = 'style' | 'suggestions' | 'questions';

interface TopNavProps {
  activeTab: InspectorTab;
  onSelectTab: (tab: InspectorTab) => void;
  onFocusEditor: () => void;
  onOpenExport: () => void;
  openQuestionsCount: number;
  suggestionsCount: number;
}

export const TopNav: React.FC<TopNavProps> = ({
  activeTab,
  onSelectTab,
  onFocusEditor,
  onOpenExport,
  openQuestionsCount,
  suggestionsCount,
}) => {
  return (
    <header className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8 shrink-0 z-30">
      {/* Zone 1: Single-element Brand Wordmark */}
      <a
        href="#editor"
        onClick={(e) => {
          e.preventDefault();
          onFocusEditor();
        }}
        className="font-display text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
      >
        Trazo
      </a>

      {/* Zone 2: Clean single-line navigation links */}
      <nav
        aria-label="Navegación del espacio de trabajo"
        className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600"
      >
        <button
          type="button"
          onClick={onFocusEditor}
          className="py-1 text-slate-700 hover:text-slate-950 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 rounded"
        >
          Editor Docs
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('style')}
          className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            activeTab === 'style'
              ? 'border-slate-900 text-slate-950 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-950'
          }`}
        >
          Estilo y Plantillas
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('suggestions')}
          className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            activeTab === 'suggestions'
              ? 'border-slate-900 text-slate-950 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-950'
          }`}
        >
          Sugerencias{suggestionsCount > 0 ? ` (${suggestionsCount})` : ''}
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('questions')}
          className={`py-1 border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
            activeTab === 'questions'
              ? 'border-slate-900 text-slate-950 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-950'
          }`}
        >
          Preguntas{openQuestionsCount > 0 ? ` (${openQuestionsCount})` : ''}
        </button>
      </nav>

      {/* Zone 3: 1 primary CTA */}
      <div className="flex items-center shrink-0">
        <button
          type="button"
          onClick={onOpenExport}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
        >
          Exportar extensión
        </button>
      </div>
    </header>
  );
};
