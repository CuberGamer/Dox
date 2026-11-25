import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DocumentCanvas } from './components/DocumentCanvas';
import { EditorToolbar } from './components/EditorToolbar';
import { ExtensionExportModal } from './components/ExtensionExportModal';
import { ExtensionLauncher } from './components/ExtensionLauncher';
import { SideInspector } from './components/SideInspector';
import { TopNav, type InspectorTab } from './components/TopNav';
import { BUILTIN_TEMPLATES, INITIAL_DOCUMENTS } from './data/presets';
import type {
  ComposeMode,
  DocBlock,
  DocumentData,
  ProposedChange,
  StyleProfile,
  StyleSuggestion,
} from './types/doc';
import {
  applyStyleProfileToBlocks,
  blockToPlainText,
  calculateDocStats,
  extractStyleProfileFromBlocks,
  serializeBlocksForAI,
} from './utils/styleAnalyzer';

const STORAGE_TEMPLATES_KEY = 'trazo_templates_v1';
const STORAGE_DOCS_KEY = 'trazo_documents_v1';

function loadSavedTemplates(): StyleProfile[] {
  try {
    const raw = localStorage.getItem(STORAGE_TEMPLATES_KEY);
    if (!raw) return BUILTIN_TEMPLATES;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore storage parse failure
  }
  return BUILTIN_TEMPLATES;
}

function loadSavedDocuments(): DocumentData[] {
  try {
    const raw = localStorage.getItem(STORAGE_DOCS_KEY);
    if (!raw) return INITIAL_DOCUMENTS;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    // ignore storage parse failure
  }
  return INITIAL_DOCUMENTS;
}

export default function App() {
  const [documents, setDocuments] = useState<DocumentData[]>(loadSavedDocuments);
  const [activeDocId, setActiveDocId] = useState<string>(() => loadSavedDocuments()[0].id);
  const [templates, setTemplates] = useState<StyleProfile[]>(loadSavedTemplates);
  const [undoStack, setUndoStack] = useState<DocBlock[][]>([]);

  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [inspectorOpen, setInspectorOpen] = useState<boolean>(true);
  const [inspectorTab, setInspectorTab] = useState<InspectorTab>('style');
  const [exportModalOpen, setExportModalOpen] = useState<boolean>(false);

  // Extension launcher state
  const [launcherOpen, setLauncherOpen] = useState<boolean>(false);
  const [composeMode, setComposeMode] = useState<ComposeMode>('compose');
  const [promptInput, setPromptInput] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [composeError, setComposeError] = useState<string | null>(null);
  const [targetBlockForAI, setTargetBlockForAI] = useState<DocBlock | null>(null);
  const [proposal, setProposal] = useState<ProposedChange | null>(null);

  // Style cloning & suggestions state
  const [isAnalyzingStyle, setIsAnalyzingStyle] = useState<boolean>(false);
  const [clonedPreview, setClonedPreview] = useState<StyleProfile | null>(null);
  const [suggestions, setSuggestions] = useState<StyleSuggestion[]>([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState<boolean>(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  // Fluid streaming typewriter state per block ID
  const [streamingBlockIds, setStreamingBlockIds] = useState<Record<string, string>>({});
  const streamTimersRef = useRef<number[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_TEMPLATES_KEY, JSON.stringify(templates));
    } catch {
      // ignore quota error
    }
  }, [templates]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_DOCS_KEY, JSON.stringify(documents));
    } catch {
      // ignore quota error
    }
  }, [documents]);

  useEffect(() => {
    return () => {
      streamTimersRef.current.forEach((t) => window.clearInterval(t));
    };
  }, []);

  const activeDocument = useMemo(
    () => documents.find((d) => d.id === activeDocId) ?? documents[0],
    [documents, activeDocId]
  );

  const activeTemplate = useMemo(
    () =>
      templates.find((t) => t.id === activeDocument.activeTemplateId) ??
      templates[0],
    [templates, activeDocument.activeTemplateId]
  );

  const stats = useMemo(
    () => calculateDocStats(activeDocument.blocks),
    [activeDocument.blocks]
  );

  const questionBlocks = useMemo(
    () =>
      activeDocument.blocks.filter(
        (b) =>
          b.type === 'qaQuestion' ||
          (b.type === 'paragraph' && (b.text ?? '').trim().endsWith('?'))
      ),
    [activeDocument.blocks]
  );

  const updateActiveDocumentBlocks = useCallback(
    (updater: (prev: DocBlock[]) => DocBlock[], pushUndo = true) => {
      setDocuments((prevDocs) =>
        prevDocs.map((doc) => {
          if (doc.id !== activeDocument.id) return doc;
          if (pushUndo) {
            setUndoStack((prev) => [...prev.slice(-14), doc.blocks]);
          }
          return {
            ...doc,
            updatedAt: 'Editado ahora',
            blocks: updater(doc.blocks),
          };
        })
      );
    },
    [activeDocument.id]
  );

  const handleUndo = () => {
    if (undoStack.length === 0) return;
    const previousBlocks = undoStack[undoStack.length - 1];
    setUndoStack((prev) => prev.slice(0, -1));
    setDocuments((prevDocs) =>
      prevDocs.map((doc) =>
        doc.id === activeDocument.id ? { ...doc, blocks: previousBlocks } : doc
      )
    );
  };

  const handleCreateDocument = () => {
    const newId = `doc-${Date.now()}`;
    const newDoc: DocumentData = {
      id: newId,
      title: `Nuevo documento ${documents.length + 1}`,
      updatedAt: 'Creado ahora',
      activeTemplateId: activeTemplate.id,
      blocks: [
        {
          id: `h-${Date.now()}`,
          type: 'heading1',
          text: 'Título del Documento',
          style: {
            fontFamily: activeTemplate.fontDisplay,
            fontSizePx: activeTemplate.h1SizePx,
            color: activeTemplate.primaryColor,
            bold: true,
          },
        },
        {
          id: `p-${Date.now() + 1}`,
          type: 'paragraph',
          text: 'Comienza a escribir aquí o abre la barra minimalista inferior para redactar con Trazo IA.',
          style: {
            fontFamily: activeTemplate.fontBody,
            fontSizePx: activeTemplate.bodySizePx,
            color: activeTemplate.textColor,
            lineHeight: activeTemplate.lineHeight,
          },
        },
      ],
    };
    setDocuments((prev) => [newDoc, ...prev]);
    setActiveDocId(newId);
    setUndoStack([]);
    setSuggestions([]);
    setClonedPreview(null);
  };

  const handleRenameDocument = (title: string) => {
    setDocuments((prevDocs) =>
      prevDocs.map((d) => (d.id === activeDocument.id ? { ...d, title } : d))
    );
  };

  const handleInsertQuickBlock = (
    kind: 'paragraph' | 'table' | 'qaQuestion' | 'callout'
  ) => {
    const id = `blk-${Date.now()}`;
    let newBlock: DocBlock;
    if (kind === 'table') {
      newBlock = {
        id,
        type: 'table',
        table: {
          headers: ['Concepto', 'Responsable', 'Estado'],
          rows: [
            ['Elemento 1', 'Equipo Producto', 'En progreso'],
            ['Elemento 2', 'Operaciones', 'Pendiente'],
          ],
          headerBg: activeTemplate.tableHeaderBg,
          headerTextColor: activeTemplate.tableHeaderText,
        },
        style: {
          fontFamily: activeTemplate.fontBody,
          fontSizePx: Math.max(12, activeTemplate.bodySizePx - 1),
          color: activeTemplate.textColor,
        },
      };
    } else if (kind === 'qaQuestion') {
      newBlock = {
        id,
        type: 'qaQuestion',
        text: '¿Qué métricas utilizaremos para validar este entregable?',
        answered: false,
        style: {
          fontFamily: activeTemplate.fontBody,
          fontSizePx: activeTemplate.bodySizePx,
          color: activeTemplate.primaryColor,
        },
      };
    } else if (kind === 'callout') {
      newBlock = {
        id,
        type: 'callout',
        text: 'Nota destacada: Resumen de punto crítico o decisión aprobada.',
        style: {
          fontFamily: activeTemplate.fontBody,
          fontSizePx: activeTemplate.bodySizePx,
          color: activeTemplate.textColor,
          backgroundColor: activeTemplate.calloutBg,
        },
      };
    } else {
      newBlock = {
        id,
        type: 'paragraph',
        text: 'Nuevo párrafo en el documento...',
        style: {
          fontFamily: activeTemplate.fontBody,
          fontSizePx: activeTemplate.bodySizePx,
          color: activeTemplate.textColor,
          lineHeight: activeTemplate.lineHeight,
        },
      };
    }

    updateActiveDocumentBlocks((prev) => [...prev, newBlock]);
    setSelectedBlockId(id);
  };

  const startFluidTyping = useCallback((blocksToStream: DocBlock[]) => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    blocksToStream.forEach((blk) => {
      if (
        !blk.text ||
        (blk.type !== 'paragraph' &&
          blk.type !== 'heading1' &&
          blk.type !== 'heading2' &&
          blk.type !== 'heading3' &&
          blk.type !== 'callout')
      ) {
        return;
      }

      const fullText = blk.text;
      const words = fullText.split(' ');
      let index = 0;

      setStreamingBlockIds((prev) => ({ ...prev, [blk.id]: '' }));

      const timer = window.setInterval(() => {
        index += 2;
        if (index >= words.length) {
          window.clearInterval(timer);
          setStreamingBlockIds((prev) => {
            const copy = { ...prev };
            delete copy[blk.id];
            return copy;
          });
        } else {
          setStreamingBlockIds((prev) => ({
            ...prev,
            [blk.id]: words.slice(0, index).join(' '),
          }));
        }
      }, 28);

      streamTimersRef.current.push(timer);
    });
  }, []);

  const handleSubmitCompose = async (overrideInstruction?: string) => {
    const instruction = (overrideInstruction ?? promptInput).trim();
    if (!instruction) return;

    setIsGenerating(true);
    setComposeError(null);

    try {
      const response = await fetch('/api/ai/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode: composeMode,
          instruction,
          documentTitle: activeDocument.title,
          documentContent: serializeBlocksForAI(activeDocument.blocks),
          styleProfile: activeTemplate,
          targetBlockId: targetBlockForAI?.id,
          targetBlockText: targetBlockForAI
            ? blockToPlainText(targetBlockForAI)
            : undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo generar la propuesta.');
      }
      setProposal(data);
    } catch (err) {
      setComposeError(
        err instanceof Error
          ? err.message
          : 'Error inesperado al conectar con el asistente.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleAcceptProposal = () => {
    if (!proposal) return;
    const styledBlocks = applyStyleProfileToBlocks(proposal.blocks, activeTemplate);

    updateActiveDocumentBlocks((prev) => {
      if (proposal.action === 'replace_block' && proposal.targetBlockId) {
        const idx = prev.findIndex((b) => b.id === proposal.targetBlockId);
        if (idx !== -1) {
          const next = [...prev];
          next.splice(idx, 1, ...styledBlocks);
          return next;
        }
      }

      if (proposal.action === 'insert_after' && proposal.targetBlockId) {
        const idx = prev.findIndex((b) => b.id === proposal.targetBlockId);
        if (idx !== -1) {
          const next = [...prev];
          next[idx] = { ...next[idx], answered: true };
          next.splice(idx + 1, 0, ...styledBlocks);
          return next;
        }
      }

      return [...prev, ...styledBlocks];
    });

    startFluidTyping(styledBlocks);
    setProposal(null);
    setPromptInput('');
    setTargetBlockForAI(null);
  };

  const handleAnalyzeDocumentStyle = async () => {
    setIsAnalyzingStyle(true);
    const heuristicProfile = extractStyleProfileFromBlocks(
      activeDocument.blocks,
      activeDocument.title
    );

    let finalProfile = heuristicProfile;
    try {
      const resp = await fetch('/api/ai/analyze-tone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTitle: activeDocument.title,
          documentContent: serializeBlocksForAI(activeDocument.blocks),
        }),
      });
      if (resp.ok) {
        const aiTone = await resp.json();
        finalProfile = {
          ...heuristicProfile,
          tone: aiTone.tone || heuristicProfile.tone,
          formality: aiTone.formality || heuristicProfile.formality,
          writingRules: aiTone.writingRules || heuristicProfile.writingRules,
        };
      }
    } catch {
      // Keep heuristic visual DNA if network call is unavailable
    } finally {
      setIsAnalyzingStyle(false);
    }

    setClonedPreview(finalProfile);
    setTemplates((prev) => [finalProfile, ...prev]);
    setDocuments((prevDocs) =>
      prevDocs.map((d) =>
        d.id === activeDocument.id
          ? { ...d, activeTemplateId: finalProfile.id }
          : d
      )
    );
    setInspectorOpen(true);
    setInspectorTab('style');
  };

  const handleSelectTemplate = (templateId: string) => {
    setDocuments((prevDocs) =>
      prevDocs.map((d) =>
        d.id === activeDocument.id ? { ...d, activeTemplateId: templateId } : d
      )
    );
  };

  const handleApplyTemplateToDoc = (template: StyleProfile) => {
    updateActiveDocumentBlocks((prev) =>
      applyStyleProfileToBlocks(prev, template)
    );
  };

  const handleUpdateActiveTemplateField = (patch: Partial<StyleProfile>) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === activeTemplate.id ? { ...t, ...patch } : t))
    );
  };

  const handleSaveTemplate = (tpl: StyleProfile) => {
    setTemplates((prev) => [tpl, ...prev]);
    handleSelectTemplate(tpl.id);
  };

  const handleDeleteTemplate = (id: string) => {
    setTemplates((prev) => {
      const next = prev.filter((t) => t.id !== id);
      if (activeDocument.activeTemplateId === id && next.length > 0) {
        handleSelectTemplate(next[0].id);
      }
      return next;
    });
  };

  const handleGenerateSuggestions = async () => {
    setIsLoadingSuggestions(true);
    setSuggestionsError(null);
    try {
      const resp = await fetch('/api/ai/suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTitle: activeDocument.title,
          documentContent: serializeBlocksForAI(activeDocument.blocks),
          styleProfile: activeTemplate,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'No se pudieron obtener sugerencias.');
      }
      setSuggestions(data.suggestions ?? []);
    } catch (err) {
      setSuggestionsError(
        err instanceof Error ? err.message : 'Error al analizar sugerencias.'
      );
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handlePreviewSuggestion = (sug: StyleSuggestion) => {
    const targetBlock = activeDocument.blocks.find(
      (b) => b.id === sug.targetBlockId
    );
    setLauncherOpen(true);
    setComposeMode('style');
    setProposal({
      id: `sug-prop-${sug.id}`,
      mode: 'style',
      action: targetBlock ? 'replace_block' : 'insert_end',
      targetBlockId: targetBlock?.id,
      beforeText: targetBlock
        ? blockToPlainText(targetBlock)
        : sug.originalSnippet,
      summary: sug.title,
      rationale: sug.description,
      blocks: [sug.suggestedBlock],
    });
  };

  const handleApplySuggestionDirect = (sug: StyleSuggestion) => {
    const styled = applyStyleProfileToBlocks(
      [sug.suggestedBlock],
      activeTemplate
    );
    updateActiveDocumentBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === sug.targetBlockId);
      if (idx === -1) return [...prev, ...styled];
      const next = [...prev];
      next.splice(idx, 1, ...styled);
      return next;
    });
    startFluidTyping(styled);
    setSuggestions((prev) => prev.filter((s) => s.id !== sug.id));
  };

  const handleAnswerQuestionBlock = async (block: DocBlock) => {
    setLauncherOpen(true);
    setComposeMode('answer');
    setIsGenerating(true);
    setComposeError(null);
    setPromptInput(block.text ?? '');

    try {
      const resp = await fetch('/api/ai/answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: block.text ?? '',
          documentTitle: activeDocument.title,
          documentContent: serializeBlocksForAI(activeDocument.blocks),
          styleProfile: activeTemplate,
          targetBlockId: block.id,
        }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        throw new Error(data.error || 'Error al responder la pregunta.');
      }
      setProposal(data);
    } catch (err) {
      setComposeError(
        err instanceof Error ? err.message : 'Error al generar respuesta.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#F1F3F4] text-slate-900 overflow-hidden">
      <TopNav
        activeTab={inspectorTab}
        onSelectTab={(tab) => {
          setInspectorTab(tab);
          setInspectorOpen(true);
        }}
        onFocusEditor={() => setLauncherOpen(true)}
        onOpenExport={() => setExportModalOpen(true)}
        openQuestionsCount={stats.questions}
        suggestionsCount={suggestions.length}
      />

      <EditorToolbar
        documents={documents}
        activeDocument={activeDocument}
        onSelectDocument={(id) => {
          setActiveDocId(id);
          setUndoStack([]);
          setSelectedBlockId(null);
          setProposal(null);
          setSuggestions([]);
          setClonedPreview(null);
        }}
        onCreateDocument={handleCreateDocument}
        onRenameDocument={handleRenameDocument}
        activeTemplate={activeTemplate}
        stats={stats}
        canUndo={undoStack.length > 0}
        onUndo={handleUndo}
        onInsertQuickBlock={handleInsertQuickBlock}
        inspectorOpen={inspectorOpen}
        onToggleInspector={() => setInspectorOpen((v) => !v)}
      />

      {/* Main Split: Google Docs Canvas + Contextual Style/Suggestions Inspector */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden relative">
        <main id="editor" className="relative flex-1 min-w-0 flex flex-col overflow-hidden">
          <DocumentCanvas
            blocks={activeDocument.blocks}
            activeTemplate={activeTemplate}
            selectedBlockId={selectedBlockId}
            streamingBlockIds={streamingBlockIds}
            onSelectBlock={setSelectedBlockId}
            onUpdateBlockText={(id, text) =>
              updateActiveDocumentBlocks(
                (prev) => prev.map((b) => (b.id === id ? { ...b, text } : b)),
                false
              )
            }
            onUpdateTableCell={(id, rowIdx, colIdx, value) =>
              updateActiveDocumentBlocks(
                (prev) =>
                  prev.map((b) => {
                    if (b.id !== id || !b.table) return b;
                    const rows = b.table.rows.map((r, rI) =>
                      rI === rowIdx
                        ? r.map((c, cI) => (cI === colIdx ? value : c))
                        : r
                    );
                    return { ...b, table: { ...b.table, rows } };
                  }),
                false
              )
            }
            onToggleChecklistItem={(id, itemIdx) =>
              updateActiveDocumentBlocks((prev) =>
                prev.map((b) => {
                  if (b.id !== id || !b.checklist) return b;
                  const checklist = b.checklist.map((item, idx) =>
                    idx === itemIdx ? { ...item, checked: !item.checked } : item
                  );
                  return { ...b, checklist };
                })
              )
            }
            onDeleteBlock={(id) => {
              updateActiveDocumentBlocks((prev) =>
                prev.filter((b) => b.id !== id)
              );
              setSelectedBlockId(null);
            }}
            onAskRewriteBlock={(block) => {
              setTargetBlockForAI(block);
              setComposeMode('compose');
              setLauncherOpen(true);
            }}
            onAnswerQuestionBlock={handleAnswerQuestionBlock}
          />

          {/* Minimalist Bottom Extension Icon + Floating Prompt Bar + Change Preview */}
          <ExtensionLauncher
            isOpen={launcherOpen}
            onToggleOpen={() => setLauncherOpen((v) => !v)}
            mode={composeMode}
            onChangeMode={setComposeMode}
            prompt={promptInput}
            onChangePrompt={setPromptInput}
            onSubmitPrompt={() => handleSubmitCompose()}
            isGenerating={isGenerating}
            error={composeError}
            activeTemplate={activeTemplate}
            targetBlock={targetBlockForAI}
            onClearTargetBlock={() => setTargetBlockForAI(null)}
            proposal={proposal}
            onAcceptProposal={handleAcceptProposal}
            onDiscardProposal={() => setProposal(null)}
            onRegenerateProposal={() => handleSubmitCompose()}
            onQuickAnalyzeStyle={handleAnalyzeDocumentStyle}
          />
        </main>

        {inspectorOpen && (
          <SideInspector
            activeTab={inspectorTab}
            onSelectTab={setInspectorTab}
            templates={templates}
            activeTemplate={activeTemplate}
            onSelectTemplate={handleSelectTemplate}
            onApplyTemplateToDoc={handleApplyTemplateToDoc}
            onAnalyzeDocumentStyle={handleAnalyzeDocumentStyle}
            isAnalyzingStyle={isAnalyzingStyle}
            clonedPreview={clonedPreview}
            onSaveTemplate={handleSaveTemplate}
            onDeleteTemplate={handleDeleteTemplate}
            onUpdateActiveTemplateField={handleUpdateActiveTemplateField}
            suggestions={suggestions}
            isLoadingSuggestions={isLoadingSuggestions}
            suggestionsError={suggestionsError}
            onGenerateSuggestions={handleGenerateSuggestions}
            onPreviewSuggestion={handlePreviewSuggestion}
            onApplySuggestionDirect={handleApplySuggestionDirect}
            questionBlocks={questionBlocks}
            onAnswerQuestion={handleAnswerQuestionBlock}
          />
        )}
      </div>

      {/* Chrome Extension Manifest V3 Export & Download Modal */}
      <ExtensionExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        templates={templates}
      />
    </div>
  );
}
