import React from 'react';
import {
  ArrowRight,
  Check,
  HelpCircle,
  Loader2,
  Palette,
  PenTool,
  RefreshCw,
  Table2,
  X,
} from 'lucide-react';
import type { ComposeMode, DocBlock, ProposedChange, StyleProfile } from '../types/doc';
import { blockToPlainText, computeWordDiff } from '../utils/styleAnalyzer';

interface ExtensionLauncherProps {
  isOpen: boolean;
  onToggleOpen: () => void;
  mode: ComposeMode;
  onChangeMode: (mode: ComposeMode) => void;
  prompt: string;
  onChangePrompt: (val: string) => void;
  onSubmitPrompt: () => void;
  isGenerating: boolean;
  error: string | null;
  activeTemplate: StyleProfile;
  targetBlock: DocBlock | null;
  onClearTargetBlock: () => void;
  proposal: ProposedChange | null;
  onAcceptProposal: () => void;
  onDiscardProposal: () => void;
  onRegenerateProposal: () => void;
  onQuickAnalyzeStyle: () => void;
}

const QUICK_PROMPTS: Record<ComposeMode, { label: string; text: string }[]> = {
  compose: [
    {
      label: 'Resumen ejecutivo',
      text: 'Redacta un resumen ejecutivo claro al final con los puntos clave y próximos pasos.',
    },
    {
      label: 'Lista de hitos',
      text: 'Genera una lista numerada de 4 hitos estratégicos para el próximo trimestre.',
    },
  ],
  answer: [
    {
      label: 'Responder preguntas abiertas',
      text: 'Responde de forma fundamentada a las preguntas abiertas pendientes en el documento.',
    },
    {
      label: 'Explicar riesgos',
      text: '¿Cuáles son los principales riesgos operativos de este plan y cómo mitigarlos?',
    },
  ],
  table: [
    {
      label: 'Tabla de KPIs',
      text: 'Crea una tabla comparativa con KPIs clave, meta Q3, responsable y estado.',
    },
    {
      label: 'Matriz de cronograma',
      text: 'Genera una tabla con fases de implementación, semanas estimadas y entregables.',
    },
  ],
  style: [
    {
      label: 'Adaptar a tono ejecutivo',
      text: 'Reescribe la última sección aplicando exactamente el tono y estilo de la plantilla activa.',
    },
  ],
};

export const ExtensionLauncher: React.FC<ExtensionLauncherProps> = ({
  isOpen,
  onToggleOpen,
  mode,
  onChangeMode,
  prompt,
  onChangePrompt,
  onSubmitPrompt,
  isGenerating,
  error,
  activeTemplate,
  targetBlock,
  onClearTargetBlock,
  proposal,
  onAcceptProposal,
  onDiscardProposal,
  onRegenerateProposal,
  onQuickAnalyzeStyle,
}) => {
  return (
    <div className="absolute bottom-5 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-3 w-full max-w-[700px] px-4 pointer-events-none">
      {/* Change Diff Preview Panel (Rendered BEFORE applying changes to doc) */}
      {isOpen && proposal && (
        <section
          aria-label="Vista previa de cambios antes de aceptar"
          data-testid="diff-preview-card"
          className="pointer-events-auto w-full bg-white border border-slate-200 rounded-2xl shadow-[0_18px_48px_rgba(15,23,42,0.14)] overflow-hidden"
        >
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 truncate">
                Vista previa de cambios · {proposal.summary}
              </div>
              <div className="text-xs text-slate-500 truncate mt-0.5">
                {proposal.rationale}
              </div>
            </div>
            <button
              type="button"
              onClick={onDiscardProposal}
              aria-label="Cerrar vista previa"
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-200/60 cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" aria-hidden="true" />
            </button>
          </div>

          <div className="p-4 max-h-[260px] overflow-y-auto clean-scroll space-y-3 bg-white">
            {proposal.action === 'replace_block' &&
            proposal.beforeText &&
            proposal.blocks.length === 1 &&
            proposal.blocks[0].type !== 'table' ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-slate-500">
                  Comparativa palabra por palabra
                </div>
                <p
                  style={{
                    fontFamily: activeTemplate.fontBody,
                    fontSize: `${activeTemplate.bodySizePx}px`,
                    lineHeight: activeTemplate.lineHeight,
                  }}
                  className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-slate-800 leading-relaxed"
                >
                  {computeWordDiff(
                    proposal.beforeText,
                    blockToPlainText(proposal.blocks[0])
                  ).map((tok, i) => {
                    if (tok.kind === 'removed') {
                      return (
                        <del
                          key={i}
                          className="bg-red-100 text-red-800 px-0.5 rounded line-through mr-1"
                        >
                          {tok.text}
                        </del>
                      );
                    }
                    if (tok.kind === 'added') {
                      return (
                        <ins
                          key={i}
                          className="bg-emerald-100 text-emerald-900 px-0.5 rounded no-underline font-medium mr-1"
                        >
                          {tok.text}
                        </ins>
                      );
                    }
                    return (
                      <span key={i} className="mr-1">
                        {tok.text}
                      </span>
                    );
                  })}
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {proposal.blocks.map((block) => (
                  <div
                    key={block.id}
                    className="rounded-lg border border-emerald-200/80 bg-emerald-50/40 px-3.5 py-2.5"
                  >
                    {block.type === 'heading1' ||
                    block.type === 'heading2' ||
                    block.type === 'heading3' ? (
                      <div
                        style={{
                          fontFamily: activeTemplate.fontDisplay,
                          color: activeTemplate.primaryColor,
                          fontSize: `${
                            block.type === 'heading1'
                              ? Math.min(22, activeTemplate.h1SizePx)
                              : activeTemplate.h2SizePx
                          }px`,
                        }}
                        className="font-bold"
                      >
                        {block.text}
                      </div>
                    ) : block.type === 'table' && block.table ? (
                      <div className="overflow-x-auto">
                        <table className="w-full border-collapse text-xs tabular-nums">
                          <thead>
                            <tr>
                              {block.table.headers.map((h, idx) => (
                                <th
                                  key={idx}
                                  style={{
                                    backgroundColor: activeTemplate.tableHeaderBg,
                                    color: activeTemplate.tableHeaderText,
                                  }}
                                  className="px-2.5 py-1.5 text-left font-semibold border border-slate-300"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {block.table.rows.map((row, rIdx) => (
                              <tr key={rIdx} className="bg-white">
                                {row.map((cell, cIdx) => (
                                  <td
                                    key={cIdx}
                                    className="px-2.5 py-1.5 border border-slate-200 text-slate-800"
                                  >
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : block.type === 'bulletList' || block.type === 'numberedList' ? (
                      <ul
                        style={{ fontFamily: activeTemplate.fontBody }}
                        className={`text-sm text-slate-800 pl-5 space-y-1 ${
                          block.type === 'numberedList' ? 'list-decimal' : 'list-disc'
                        }`}
                      >
                        {(block.items ?? []).map((it, idx) => (
                          <li key={idx}>{it}</li>
                        ))}
                      </ul>
                    ) : block.type === 'checklist' ? (
                      <ul className="text-sm text-slate-800 space-y-1">
                        {(block.checklist ?? []).map((it, idx) => (
                          <li key={idx}>[ ] {it.text}</li>
                        ))}
                      </ul>
                    ) : (
                      <p
                        style={{
                          fontFamily: activeTemplate.fontBody,
                          color: activeTemplate.textColor,
                          fontSize: `${activeTemplate.bodySizePx}px`,
                          lineHeight: activeTemplate.lineHeight,
                        }}
                      >
                        {block.text}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2">
            <span className="text-xs text-slate-500 truncate">
              Estilo aplicado: {activeTemplate.name} ({activeTemplate.fontBody} · {activeTemplate.bodySizePx}px)
            </span>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={onDiscardProposal}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-200/70 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={onRegenerateProposal}
                disabled={isGenerating}
                className="px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap disabled:opacity-50"
              >
                <RefreshCw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Regenerar</span>
              </button>
              <button
                type="button"
                onClick={onAcceptProposal}
                className="px-3.5 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
              >
                <Check className="w-3.5 h-3.5" aria-hidden="true" />
                <span>Aceptar e insertar</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Unfolded Command Bar */}
      {isOpen && (
        <section
          aria-label="Barra flotante de redacción Trazo"
          data-testid="extension-command-bar"
          className="pointer-events-auto w-full bg-white border border-slate-200 rounded-2xl shadow-[0_14px_40px_rgba(15,23,42,0.14)] p-3 space-y-2.5 transition-all duration-150"
        >
          {/* Mode Segmented Buttons + Style Action */}
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg">
              <button
                type="button"
                onClick={() => onChangeMode('compose')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  mode === 'compose'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <PenTool className="w-3 h-3" aria-hidden="true" />
                <span>Redactar</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeMode('answer')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  mode === 'answer'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <HelpCircle className="w-3 h-3" aria-hidden="true" />
                <span>Responder</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeMode('table')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  mode === 'table'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Table2 className="w-3 h-3" aria-hidden="true" />
                <span>Tabla</span>
              </button>
              <button
                type="button"
                onClick={() => onChangeMode('style')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  mode === 'style'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Palette className="w-3 h-3" aria-hidden="true" />
                <span>Estilo</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onQuickAnalyzeStyle}
                className="px-2.5 py-1 text-xs font-medium text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200/70 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
              >
                Copiar estilo del doc
              </button>
              <button
                type="button"
                onClick={onToggleOpen}
                aria-label="Minimizar barra Trazo"
                className="p-1 text-slate-400 hover:text-slate-700 rounded-md hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Target block indicator if editing a specific block */}
          {targetBlock && (
            <div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-blue-50/80 border border-blue-200 rounded-lg text-xs text-blue-900">
              <span className="truncate">
                Editando bloque seleccionado: &ldquo;{blockToPlainText(targetBlock).slice(0, 68)}...&rdquo;
              </span>
              <button
                type="button"
                onClick={onClearTargetBlock}
                className="text-blue-700 hover:text-blue-950 font-medium shrink-0 cursor-pointer"
              >
                Quitar
              </button>
            </div>
          )}

          {/* Prompt Input Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              onSubmitPrompt();
            }}
            className="flex items-center gap-2"
          >
            <label htmlFor="trazo-command-input" className="sr-only">
              Instrucción para la IA
            </label>
            <input
              id="trazo-command-input"
              type="text"
              value={prompt}
              onChange={(e) => onChangePrompt(e.target.value)}
              placeholder={
                mode === 'table'
                  ? 'Describe la tabla o matriz que necesitas crear...'
                  : mode === 'answer'
                    ? 'Escribe la pregunta del documento que deseas responder...'
                    : 'Indica qué redactar en el documento...'
              }
              className="flex-1 h-10 px-3.5 text-sm text-slate-900 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:border-blue-600 focus:outline-none"
            />
            <button
              type="submit"
              disabled={isGenerating || !prompt.trim()}
              className="h-10 px-4 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-45 rounded-xl transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                  <span>Generando</span>
                </>
              ) : (
                <>
                  <span>Previsualizar</span>
                  <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                </>
              )}
            </button>
          </form>

          {/* Error feedback */}
          {error && (
            <div role="alert" className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </div>
          )}

          {/* Quick prompts & active style metadata */}
          <div className="flex items-center justify-between gap-2 flex-wrap pt-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {QUICK_PROMPTS[mode].map((qp) => (
                <button
                  key={qp.label}
                  type="button"
                  onClick={() => onChangePrompt(qp.text)}
                  className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-950 bg-slate-100/80 hover:bg-slate-200/70 rounded-md transition-colors cursor-pointer whitespace-nowrap"
                >
                  {qp.label}
                </button>
              ))}
            </div>
            <div className="text-xs text-slate-500 whitespace-nowrap">
              {activeTemplate.name} · {activeTemplate.fontBody} {activeTemplate.bodySizePx}px
            </div>
          </div>
        </section>
      )}

      {/* Minimalist Bottom Floating Extension Icon */}
      <button
        type="button"
        onClick={onToggleOpen}
        aria-expanded={isOpen}
        aria-label={
          isOpen
            ? 'Ocultar barra de redacción Trazo'
            : 'Abrir barra de redacción Trazo'
        }
        data-testid="minimalist-fab"
        title="Trazo IA · Haz clic para redactar en el documento"
        className={`pointer-events-auto w-11 h-11 rounded-2xl border shadow-[0_6px_20px_rgba(15,23,42,0.16)] flex items-center justify-center transition-transform duration-150 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2 ${
          isOpen
            ? 'bg-white text-slate-900 border-slate-300 hover:bg-slate-50'
            : 'bg-slate-900 text-white border-slate-800 hover:-translate-y-0.5 hover:bg-slate-800'
        }`}
      >
        <PenTool className="w-4 h-4" aria-hidden="true" />
      </button>
    </div>
  );
};
