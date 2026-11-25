import React, { useState } from 'react';
import {
  Check,
  Copy,
  HelpCircle,
  Loader2,
  Palette,
  Plus,
  Sparkles,
  Trash2,
  Wand2,
} from 'lucide-react';
import type {
  DocBlock,
  StyleProfile,
  StyleSuggestion,
} from '../types/doc';
import type { InspectorTab } from './TopNav';

interface SideInspectorProps {
  activeTab: InspectorTab;
  onSelectTab: (tab: InspectorTab) => void;
  templates: StyleProfile[];
  activeTemplate: StyleProfile;
  onSelectTemplate: (id: string) => void;
  onApplyTemplateToDoc: (template: StyleProfile) => void;
  onAnalyzeDocumentStyle: () => void;
  isAnalyzingStyle: boolean;
  clonedPreview: StyleProfile | null;
  onSaveTemplate: (template: StyleProfile) => void;
  onDeleteTemplate: (id: string) => void;
  onUpdateActiveTemplateField: (patch: Partial<StyleProfile>) => void;
  suggestions: StyleSuggestion[];
  isLoadingSuggestions: boolean;
  suggestionsError: string | null;
  onGenerateSuggestions: () => void;
  onPreviewSuggestion: (suggestion: StyleSuggestion) => void;
  onApplySuggestionDirect: (suggestion: StyleSuggestion) => void;
  questionBlocks: DocBlock[];
  onAnswerQuestion: (block: DocBlock) => void;
}

const FONT_OPTIONS = [
  'Plus Jakarta Sans',
  'DM Sans',
  'Manrope',
  'Merriweather',
  'Lora',
  'Playfair Display',
  'Source Serif 4',
];

export const SideInspector: React.FC<SideInspectorProps> = ({
  activeTab,
  onSelectTab,
  templates,
  activeTemplate,
  onSelectTemplate,
  onApplyTemplateToDoc,
  onAnalyzeDocumentStyle,
  isAnalyzingStyle,
  clonedPreview,
  onSaveTemplate,
  onDeleteTemplate,
  onUpdateActiveTemplateField,
  suggestions,
  isLoadingSuggestions,
  suggestionsError,
  onGenerateSuggestions,
  onPreviewSuggestion,
  onApplySuggestionDirect,
  questionBlocks,
  onAnswerQuestion,
}) => {
  const [newTplName, setNewTplName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleSaveNewTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTplName.trim()) return;
    const created: StyleProfile = {
      ...activeTemplate,
      id: `custom-${Date.now()}`,
      name: newTplName.trim(),
      description: `Plantilla personalizada · ${activeTemplate.fontDisplay}/${activeTemplate.fontBody} (${activeTemplate.bodySizePx}px)`,
      isCustom: true,
    };
    onSaveTemplate(created);
    setNewTplName('');
    setShowCreateForm(false);
  };

  return (
    <aside
      aria-label="Inspector de estilo, sugerencias y preguntas"
      className="w-full lg:w-[360px] bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shrink-0 overflow-hidden"
    >
      {/* Inspector Sub-Tabs */}
      <div className="px-4 pt-3 pb-2 border-b border-slate-200 flex items-center gap-1 bg-slate-50/70">
        <button
          type="button"
          onClick={() => onSelectTab('style')}
          className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'style'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Estilo
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('suggestions')}
          className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'suggestions'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Sugerencias
        </button>
        <button
          type="button"
          onClick={() => onSelectTab('questions')}
          className={`flex-1 py-1.5 px-2 text-xs font-semibold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
            activeTab === 'questions'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Preguntas ({questionBlocks.length})
        </button>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto clean-scroll p-4 space-y-5">
        {activeTab === 'style' && (
          <>
            {/* Section 1: Document Style Analyzer & Cloner */}
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-slate-900">
                  Clonar estilo del documento
                </h2>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Analiza las tipografías, tamaños, colores de encabezado y tono del documento actual para seguir escribiendo igual.
              </p>

              <button
                type="button"
                onClick={onAnalyzeDocumentStyle}
                disabled={isAnalyzingStyle}
                data-testid="analyze-style-btn"
                className="w-full py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {isAnalyzingStyle ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                    <span>Analizando documento...</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Analizar y copiar estilo actual</span>
                  </>
                )}
              </button>

              {clonedPreview && (
                <div
                  data-testid="cloned-style-result"
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-900">
                      Estilo detectado y activo
                    </span>
                    <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      Copiado
                    </span>
                  </div>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs">
                    <div>
                      <dt className="text-slate-500">Títulos</dt>
                      <dd className="font-medium text-slate-900 truncate">
                        {clonedPreview.fontDisplay} · {clonedPreview.h1SizePx}px
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Cuerpo</dt>
                      <dd className="font-medium text-slate-900 truncate">
                        {clonedPreview.fontBody} · {clonedPreview.bodySizePx}px
                      </dd>
                    </div>
                    <div className="col-span-2 flex items-center gap-2 pt-1">
                      <span
                        className="w-4 h-4 rounded border border-slate-300 shrink-0"
                        style={{ backgroundColor: clonedPreview.primaryColor }}
                        title={clonedPreview.primaryColor}
                      />
                      <span className="font-mono text-slate-700">
                        {clonedPreview.primaryColor}
                      </span>
                      <span className="text-slate-400">·</span>
                      <span
                        className="w-4 h-4 rounded border border-slate-300 shrink-0"
                        style={{ backgroundColor: clonedPreview.textColor }}
                        title={clonedPreview.textColor}
                      />
                      <span className="font-mono text-slate-700">
                        {clonedPreview.textColor}
                      </span>
                    </div>
                    <div className="col-span-2 pt-0.5 text-slate-600">
                      Tono ({clonedPreview.formality}): {clonedPreview.tone}
                    </div>
                  </dl>
                </div>
              )}
            </section>

            <hr className="border-slate-200" />

            {/* Section 2: Active Style Fine-Tuning */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  Ajustes de plantilla activa
                </h2>
                <button
                  type="button"
                  onClick={() => onApplyTemplateToDoc(activeTemplate)}
                  className="text-xs font-semibold text-blue-700 hover:text-blue-800 cursor-pointer whitespace-nowrap"
                >
                  Aplicar al documento
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label
                    htmlFor="style-font-display"
                    className="block text-xs font-medium text-slate-600 mb-1"
                  >
                    Tipografía títulos
                  </label>
                  <select
                    id="style-font-display"
                    value={activeTemplate.fontDisplay}
                    onChange={(e) =>
                      onUpdateActiveTemplateField({ fontDisplay: e.target.value })
                    }
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="style-font-body"
                    className="block text-xs font-medium text-slate-600 mb-1"
                  >
                    Tipografía cuerpo
                  </label>
                  <select
                    id="style-font-body"
                    value={activeTemplate.fontBody}
                    onChange={(e) =>
                      onUpdateActiveTemplateField({ fontBody: e.target.value })
                    }
                    className="w-full h-8 px-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                  >
                    {FONT_OPTIONS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="style-h1-size"
                    className="block text-xs font-medium text-slate-600 mb-1"
                  >
                    Tamaño H1 (px)
                  </label>
                  <input
                    id="style-h1-size"
                    type="number"
                    min={18}
                    max={48}
                    value={activeTemplate.h1SizePx}
                    onChange={(e) =>
                      onUpdateActiveTemplateField({
                        h1SizePx: Number(e.target.value) || 28,
                      })
                    }
                    className="w-full h-8 px-2 text-xs font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="style-body-size"
                    className="block text-xs font-medium text-slate-600 mb-1"
                  >
                    Tamaño cuerpo (px)
                  </label>
                  <input
                    id="style-body-size"
                    type="number"
                    min={11}
                    max={24}
                    value={activeTemplate.bodySizePx}
                    onChange={(e) =>
                      onUpdateActiveTemplateField({
                        bodySizePx: Number(e.target.value) || 15,
                      })
                    }
                    className="w-full h-8 px-2 text-xs font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div>
                  <label
                    htmlFor="style-primary-color"
                    className="block text-xs font-medium text-slate-600 mb-1"
                  >
                    Color principal
                  </label>
                  <div className="flex items-center gap-1.5 h-8 px-2 border border-slate-200 rounded-md bg-white">
                    <input
                      id="style-primary-color"
                      type="color"
                      value={activeTemplate.primaryColor}
                      onChange={(e) =>
                        onUpdateActiveTemplateField({
                          primaryColor: e.target.value,
                          tableHeaderBg: e.target.value,
                        })
                      }
                      className="w-5 h-5 border-0 p-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-700 uppercase">
                      {activeTemplate.primaryColor}
                    </span>
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="style-text-color"
                    className="block text-xs font-medium text-slate-600 mb-1"
                  >
                    Color texto
                  </label>
                  <div className="flex items-center gap-1.5 h-8 px-2 border border-slate-200 rounded-md bg-white">
                    <input
                      id="style-text-color"
                      type="color"
                      value={activeTemplate.textColor}
                      onChange={(e) =>
                        onUpdateActiveTemplateField({ textColor: e.target.value })
                      }
                      className="w-5 h-5 border-0 p-0 bg-transparent cursor-pointer"
                    />
                    <span className="text-xs font-mono text-slate-700 uppercase">
                      {activeTemplate.textColor}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <label
                  htmlFor="style-tone-input"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Tono y reglas de redacción IA
                </label>
                <textarea
                  id="style-tone-input"
                  rows={2}
                  value={activeTemplate.tone}
                  onChange={(e) =>
                    onUpdateActiveTemplateField({ tone: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>
            </section>

            <hr className="border-slate-200" />

            {/* Section 3: Saved Templates Library */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-slate-900">
                  Plantillas guardadas
                </h2>
                <button
                  type="button"
                  onClick={() => setShowCreateForm((v) => !v)}
                  className="text-xs font-semibold text-slate-700 hover:text-slate-950 flex items-center gap-1 cursor-pointer whitespace-nowrap"
                >
                  <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Guardar actual</span>
                </button>
              </div>

              {showCreateForm && (
                <form
                  onSubmit={handleSaveNewTemplate}
                  className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200"
                >
                  <input
                    type="text"
                    aria-label="Nombre de la nueva plantilla"
                    placeholder="Nombre de plantilla (ej. Memo Legal)"
                    value={newTplName}
                    onChange={(e) => setNewTplName(e.target.value)}
                    className="flex-1 h-8 px-2.5 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
                  />
                  <button
                    type="submit"
                    className="h-8 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md cursor-pointer whitespace-nowrap"
                  >
                    Guardar
                  </button>
                </form>
              )}

              <div className="space-y-2">
                {templates.map((tpl) => {
                  const isActive = tpl.id === activeTemplate.id;
                  return (
                    <div
                      key={tpl.id}
                      className={`rounded-xl border p-3 transition-colors ${
                        isActive
                          ? 'border-slate-900 bg-slate-50/80'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onSelectTemplate(tpl.id)}
                          className="text-left flex-1 min-w-0 cursor-pointer"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-sm shrink-0"
                              style={{ backgroundColor: tpl.primaryColor }}
                            />
                            <span className="text-xs font-semibold text-slate-900 truncate">
                              {tpl.name}
                            </span>
                          </div>
                          <div className="text-xs text-slate-500 mt-1 truncate">
                            {tpl.fontDisplay} / {tpl.fontBody} · {tpl.bodySizePx}px · {tpl.formality}
                          </div>
                        </button>

                        {tpl.isCustom && (
                          <button
                            type="button"
                            onClick={() => onDeleteTemplate(tpl.id)}
                            aria-label={`Eliminar plantilla ${tpl.name}`}
                            className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                          </button>
                        )}
                      </div>

                      {isActive && (
                        <div className="mt-2.5 pt-2 border-t border-slate-200 flex items-center justify-between gap-2">
                          <span className="text-xs text-slate-600 truncate">
                            Activa para IA
                          </span>
                          <button
                            type="button"
                            onClick={() => onApplyTemplateToDoc(tpl)}
                            className="px-2.5 py-1 text-xs font-medium text-slate-800 bg-white border border-slate-200 hover:bg-slate-100 rounded-md cursor-pointer whitespace-nowrap"
                          >
                            Aplicar a todo el doc
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          </>
        )}

        {activeTab === 'suggestions' && (
          <section className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-slate-900">
                Sugerencias automáticas de estilo
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Detecta mejoras de claridad, coherencia con tu plantilla y estructura para aumentar la productividad.
              </p>
            </div>

            <button
              type="button"
              onClick={onGenerateSuggestions}
              disabled={isLoadingSuggestions}
              data-testid="generate-suggestions-btn"
              className="w-full py-2 px-3 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {isLoadingSuggestions ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>Analizando redacción...</span>
                </>
              ) : (
                <>
                  <Wand2 className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>Analizar y sugerir mejoras</span>
                </>
              )}
            </button>

            {suggestionsError && (
              <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg p-2.5">
                {suggestionsError}
              </div>
            )}

            {suggestions.length === 0 && !isLoadingSuggestions && (
              <div className="py-10 px-4 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                Pulsa &ldquo;Analizar y sugerir mejoras&rdquo; para recibir recomendaciones personalizadas sobre el texto actual.
              </div>
            )}

            <div className="space-y-3">
              {suggestions.map((sug) => (
                <div
                  key={sug.id}
                  className="rounded-xl border border-slate-200 bg-white p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-900">
                      {sug.title}
                    </span>
                    <span className="text-xs text-slate-500 capitalize">
                      {sug.category}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {sug.description}
                  </p>
                  <div className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-2 text-slate-700 line-clamp-3">
                    {sug.suggestedBlock?.text || sug.originalSnippet}
                  </div>
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => onPreviewSuggestion(sug)}
                      className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 border border-slate-200 rounded-md cursor-pointer whitespace-nowrap"
                    >
                      Previsualizar
                    </button>
                    <button
                      type="button"
                      onClick={() => onApplySuggestionDirect(sug)}
                      className="px-2.5 py-1 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-md cursor-pointer whitespace-nowrap"
                    >
                      Aplicar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {activeTab === 'questions' && (
          <section className="space-y-3">
            <div className="space-y-1">
              <h2 className="text-sm font-semibold text-slate-900">
                Preguntas detectadas en el documento
              </h2>
              <p className="text-xs text-slate-600 leading-relaxed">
                Responde dudas abiertas directamente en el texto manteniendo el estilo y contexto del documento.
              </p>
            </div>

            {questionBlocks.length === 0 ? (
              <div className="py-10 px-4 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-500">
                No hay preguntas detectadas en este documento. Puedes insertar una desde la barra superior o preguntar en la barra inferior.
              </div>
            ) : (
              <div className="space-y-2.5">
                {questionBlocks.map((qb) => (
                  <div
                    key={qb.id}
                    className="rounded-xl border border-slate-200 bg-white p-3 space-y-2.5"
                  >
                    <div className="flex items-start gap-2">
                      <HelpCircle
                        className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"
                        aria-hidden="true"
                      />
                      <p className="text-xs font-medium text-slate-800 leading-relaxed">
                        {qb.text}
                      </p>
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-xs text-slate-500">
                        {qb.answered ? 'Respondida' : 'Pendiente'}
                      </span>
                      <button
                        type="button"
                        onClick={() => onAnswerQuestion(qb)}
                        className="px-2.5 py-1 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-md flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                      >
                        <Sparkles className="w-3 h-3" aria-hidden="true" />
                        <span>Generar respuesta</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {/* Subtle footer hint */}
      <div className="px-4 py-2.5 border-t border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs text-slate-500">
        <span className="flex items-center gap-1.5 truncate">
          <Palette className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
          <span className="truncate">{activeTemplate.name}</span>
        </span>
        <span className="tabular-nums shrink-0">{templates.length} plantillas</span>
      </div>
    </aside>
  );
};
