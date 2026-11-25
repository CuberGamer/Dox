import React from 'react';
import { Check, HelpCircle, Sparkles, Trash2 } from 'lucide-react';
import type { DocBlock, StyleProfile } from '../types/doc';

interface DocumentCanvasProps {
  blocks: DocBlock[];
  activeTemplate: StyleProfile;
  selectedBlockId: string | null;
  streamingBlockIds: Record<string, string>;
  onSelectBlock: (id: string | null) => void;
  onUpdateBlockText: (id: string, text: string) => void;
  onUpdateTableCell: (id: string, rowIdx: number, colIdx: number, value: string) => void;
  onToggleChecklistItem: (id: string, itemIdx: number) => void;
  onDeleteBlock: (id: string) => void;
  onAskRewriteBlock: (block: DocBlock) => void;
  onAnswerQuestionBlock: (block: DocBlock) => void;
}

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({
  blocks,
  activeTemplate,
  selectedBlockId,
  streamingBlockIds,
  onSelectBlock,
  onUpdateBlockText,
  onUpdateTableCell,
  onToggleChecklistItem,
  onDeleteBlock,
  onAskRewriteBlock,
  onAnswerQuestionBlock,
}) => {
  return (
    <div
      className="flex-1 overflow-y-auto clean-scroll px-4 sm:px-8 pt-6 pb-36"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onSelectBlock(null);
        }
      }}
    >
      {/* Google Docs US-Letter / A4 Sheet */}
      <article
        aria-label="Lienzo del documento de Google Docs"
        data-testid="document-sheet"
        className="mx-auto max-w-[816px] min-h-[960px] bg-white border border-slate-200/90 shadow-[0_1px_4px_rgba(15,23,42,0.06)] rounded-sm px-8 sm:px-16 py-12 sm:py-14"
      >
        {blocks.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            El documento está vacío. Pulsa el icono inferior para redactar con IA o añade un bloque arriba.
          </div>
        ) : (
          <div className="space-y-4">
            {blocks.map((block) => {
              const isSelected = selectedBlockId === block.id;
              const streamedText = streamingBlockIds[block.id];
              const isStreaming = streamedText !== undefined;

              const fontFamily =
                block.style?.fontFamily ||
                (block.type.startsWith('heading')
                  ? activeTemplate.fontDisplay
                  : activeTemplate.fontBody);

              const fontSizePx =
                block.style?.fontSizePx ||
                (block.type === 'heading1'
                  ? activeTemplate.h1SizePx
                  : block.type === 'heading2'
                    ? activeTemplate.h2SizePx
                    : block.type === 'heading3'
                      ? activeTemplate.h3SizePx
                      : activeTemplate.bodySizePx);

              const color =
                block.style?.color ||
                (block.type.startsWith('heading')
                  ? activeTemplate.primaryColor
                  : activeTemplate.textColor);

              const lineHeight = block.style?.lineHeight || activeTemplate.lineHeight;

              return (
                <div
                  key={block.id}
                  data-testid={`doc-block-${block.id}`}
                  onClick={() => onSelectBlock(block.id)}
                  className={`group relative rounded-md px-2.5 py-1.5 -mx-2.5 transition-colors ${
                    isSelected
                      ? 'ring-1 ring-blue-500/40 bg-blue-50/20'
                      : 'hover:bg-slate-50/60'
                  }`}
                >
                  {/* Floating Block Context Actions when selected */}
                  {isSelected && !isStreaming && (
                    <div className="absolute -top-8 right-1 z-10 flex items-center gap-1 bg-white border border-slate-200 shadow-sm rounded-lg px-1.5 py-1">
                      {block.type === 'qaQuestion' ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAnswerQuestionBlock(block);
                          }}
                          className="px-2 py-1 text-xs font-medium text-blue-700 hover:bg-blue-50 rounded flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <HelpCircle className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Responder en doc</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAskRewriteBlock(block);
                          }}
                          className="px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded flex items-center gap-1 cursor-pointer whitespace-nowrap"
                        >
                          <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                          <span>Editar con IA</span>
                        </button>
                      )}
                      <button
                        type="button"
                        aria-label="Eliminar bloque"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteBlock(block.id);
                        }}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    </div>
                  )}

                  {/* Block Renderer by Type */}
                  {block.type === 'divider' && (
                    <hr className="border-t border-slate-200 my-4" />
                  )}

                  {(block.type === 'heading1' ||
                    block.type === 'heading2' ||
                    block.type === 'heading3' ||
                    block.type === 'paragraph') && (
                    <textarea
                      aria-label={`Bloque ${block.type}`}
                      rows={1}
                      value={isStreaming ? streamedText : block.text ?? ''}
                      onChange={(e) => {
                        onUpdateBlockText(block.id, e.target.value);
                        e.target.style.height = 'auto';
                        e.target.style.height = `${e.target.scrollHeight}px`;
                      }}
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = `${el.scrollHeight}px`;
                        }
                      }}
                      style={{
                        fontFamily,
                        fontSize: `${fontSizePx}px`,
                        color,
                        lineHeight,
                        fontWeight: block.type.startsWith('heading') ? 700 : 400,
                      }}
                      className="w-full resize-none overflow-hidden bg-transparent border-none focus:outline-none p-0 m-0 block"
                    />
                  )}

                  {block.type === 'callout' && (
                    <div
                      style={{
                        backgroundColor:
                          block.style?.backgroundColor || activeTemplate.calloutBg,
                        fontFamily,
                        fontSize: `${fontSizePx}px`,
                        color,
                        lineHeight,
                      }}
                      className="rounded-lg border border-slate-200/80 px-4 py-3"
                    >
                      <textarea
                        aria-label="Bloque destacado"
                        rows={1}
                        value={isStreaming ? streamedText : block.text ?? ''}
                        onChange={(e) => {
                          onUpdateBlockText(block.id, e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = `${e.target.scrollHeight}px`;
                        }}
                        ref={(el) => {
                          if (el) {
                            el.style.height = 'auto';
                            el.style.height = `${el.scrollHeight}px`;
                          }
                        }}
                        className="w-full resize-none overflow-hidden bg-transparent border-none focus:outline-none p-0 m-0 font-medium"
                      />
                    </div>
                  )}

                  {block.type === 'qaQuestion' && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/70 px-4 py-3 flex items-start justify-between gap-3">
                      <div className="flex items-start gap-2.5 flex-1 min-w-0">
                        <HelpCircle
                          className="w-4 h-4 text-amber-700 shrink-0 mt-1"
                          aria-hidden="true"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="text-xs font-medium text-amber-800 mb-1">
                            {block.answered ? 'Pregunta respondida' : 'Pregunta pendiente en el documento'}
                          </div>
                          <textarea
                            aria-label="Pregunta del documento"
                            rows={1}
                            value={block.text ?? ''}
                            onChange={(e) => {
                              onUpdateBlockText(block.id, e.target.value);
                              e.target.style.height = 'auto';
                              e.target.style.height = `${e.target.scrollHeight}px`;
                            }}
                            ref={(el) => {
                              if (el) {
                                el.style.height = 'auto';
                                el.style.height = `${el.scrollHeight}px`;
                              }
                            }}
                            style={{ fontFamily, fontSize: `${fontSizePx}px`, color }}
                            className="w-full resize-none overflow-hidden bg-transparent border-none focus:outline-none p-0 m-0 font-medium"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAnswerQuestionBlock(block);
                        }}
                        className="px-3 py-1.5 text-xs font-semibold text-amber-950 bg-amber-200/80 hover:bg-amber-300/80 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Responder con IA
                      </button>
                    </div>
                  )}

                  {(block.type === 'bulletList' || block.type === 'numberedList') && (
                    <ul
                      style={{ fontFamily, fontSize: `${fontSizePx}px`, color, lineHeight }}
                      className={
                        block.type === 'numberedList'
                          ? 'list-decimal pl-6 space-y-1.5'
                          : 'list-disc pl-6 space-y-1.5'
                      }
                    >
                      {(block.items ?? []).map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  )}

                  {block.type === 'checklist' && (
                    <div
                      style={{ fontFamily, fontSize: `${fontSizePx}px`, color, lineHeight }}
                      className="space-y-2"
                    >
                      {(block.checklist ?? []).map((item, idx) => (
                        <label
                          key={idx}
                          className="flex items-start gap-2.5 cursor-pointer select-none"
                        >
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={item.checked}
                            onClick={(e) => {
                              e.stopPropagation();
                              onToggleChecklistItem(block.id, idx);
                            }}
                            className={`w-4 h-4 mt-1 rounded border flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                              item.checked
                                ? 'bg-slate-900 border-slate-900 text-white'
                                : 'border-slate-300 bg-white'
                            }`}
                          >
                            {item.checked && <Check className="w-3 h-3" aria-hidden="true" />}
                          </button>
                          <span className={item.checked ? 'line-through text-slate-400' : ''}>
                            {item.text}
                          </span>
                        </label>
                      ))}
                    </div>
                  )}

                  {block.type === 'table' && block.table && (
                    <div className="overflow-x-auto my-2">
                      <table
                        style={{ fontFamily, fontSize: `${Math.max(12, fontSizePx - 1)}px` }}
                        className="w-full border-collapse border border-slate-300 text-left tabular-nums"
                      >
                        <thead>
                          <tr>
                            {block.table.headers.map((header, colIdx) => (
                              <th
                                key={colIdx}
                                style={{
                                  backgroundColor:
                                    block.table?.headerBg || activeTemplate.tableHeaderBg,
                                  color:
                                    block.table?.headerTextColor ||
                                    activeTemplate.tableHeaderText,
                                }}
                                className="px-3 py-2 text-xs font-semibold border border-slate-300"
                              >
                                {header}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {block.table.rows.map((row, rowIdx) => (
                            <tr
                              key={rowIdx}
                              className={rowIdx % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}
                            >
                              {row.map((cell, colIdx) => (
                                <td
                                  key={colIdx}
                                  className="border border-slate-200 p-0"
                                >
                                  <input
                                    type="text"
                                    aria-label={`Celda fila ${rowIdx + 1} columna ${colIdx + 1}`}
                                    value={cell}
                                    onChange={(e) =>
                                      onUpdateTableCell(
                                        block.id,
                                        rowIdx,
                                        colIdx,
                                        e.target.value
                                      )
                                    }
                                    style={{ color }}
                                    className="w-full px-3 py-2 bg-transparent focus:outline-none focus:bg-blue-50/40 text-sm"
                                  />
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </article>
    </div>
  );
};
