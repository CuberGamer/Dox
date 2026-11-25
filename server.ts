import 'dotenv/config';
import express, { type Request, type Response } from 'express';
import fs from 'fs';
import path from 'path';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '2mb' }));

// Allow requests from the exported Chrome Extension running on docs.google.com
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }
  next();
});

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    throw new Error(
      'Falta configurar GEMINI_API_KEY en el entorno del servidor (Settings > Secrets).'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

async function generateWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI['models']['generateContent']>[0],
  maxAttempts = 3
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await ai.models.generateContent(params);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message.toLowerCase() : '';
      const isTransient =
        msg.includes('503') ||
        msg.includes('unavailable') ||
        msg.includes('high demand') ||
        msg.includes('429');
      if (!isTransient || attempt === maxAttempts - 1) {
        throw err;
      }
      await new Promise((resolve) => setTimeout(resolve, 650 * (attempt + 1)));
    }
  }
  throw lastError;
}

function extractReadableError(err: unknown): string {
  const raw =
    err instanceof Error ? err.message : 'Error inesperado al consultar Gemini.';
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.error?.message) return String(parsed.error.message);
  } catch {
    // not JSON
  }
  return raw;
}

function handleGeminiError(res: Response, err: unknown) {
  const message = extractReadableError(err);
  const lower = message.toLowerCase();
  if (lower.includes('403') || lower.includes('permission_denied') || lower.includes('api_key_invalid')) {
    res.status(403).json({
      error: 'Clave API inválida o sin permisos. Verifica GEMINI_API_KEY en Settings > Secrets.',
    });
    return;
  }
  if (lower.includes('429') || lower.includes('resource_exhausted')) {
    res.status(429).json({
      error: 'Límite de solicitudes alcanzado temporalmente. Intenta nuevamente en unos segundos.',
    });
    return;
  }
  if (lower.includes('503') || lower.includes('unavailable') || lower.includes('high demand')) {
    res.status(503).json({
      error: 'El servicio de IA tiene alta demanda temporal. Intenta de nuevo en unos segundos.',
    });
    return;
  }
  res.status(500).json({ error: message });
}

const blockSchema = {
  type: Type.OBJECT,
  properties: {
    type: {
      type: Type.STRING,
      description:
        'Uno de: heading1, heading2, heading3, paragraph, bulletList, numberedList, table, callout, checklist',
    },
    text: {
      type: Type.STRING,
      description: 'Contenido textual para encabezados, párrafos o callouts.',
    },
    items: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Elementos si el tipo es bulletList o numberedList.',
    },
    checklistItems: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Tareas si el tipo es checklist.',
    },
    tableHeaders: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: 'Cabeceras de columna si el tipo es table.',
    },
    tableRows: {
      type: Type.ARRAY,
      items: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
      },
      description: 'Filas de datos si el tipo es table.',
    },
  },
  required: ['type'],
};

function normalizeGeneratedBlocks(rawBlocks: any[], styleProfile: any) {
  return (rawBlocks || []).map((b: any, index: number) => {
    const id = `ai-${Date.now()}-${index}`;
    const type = b.type || 'paragraph';

    if (type === 'table' && Array.isArray(b.tableHeaders)) {
      return {
        id,
        type: 'table',
        table: {
          headers: b.tableHeaders,
          rows: Array.isArray(b.tableRows) ? b.tableRows : [],
          headerBg: styleProfile?.tableHeaderBg || '#0F172A',
          headerTextColor: styleProfile?.tableHeaderText || '#FFFFFF',
        },
        style: {
          fontFamily: styleProfile?.fontBody || 'DM Sans',
          fontSizePx: Math.max(12, (styleProfile?.bodySizePx || 15) - 1),
          color: styleProfile?.textColor || '#1E293B',
        },
      };
    }

    if (type === 'checklist') {
      const list = Array.isArray(b.checklistItems)
        ? b.checklistItems
        : Array.isArray(b.items)
          ? b.items
          : [];
      return {
        id,
        type: 'checklist',
        checklist: list.map((txt: string) => ({ text: txt, checked: false })),
        style: {
          fontFamily: styleProfile?.fontBody || 'DM Sans',
          fontSizePx: styleProfile?.bodySizePx || 15,
          color: styleProfile?.textColor || '#1E293B',
          lineHeight: styleProfile?.lineHeight || 1.65,
        },
      };
    }

    if (type === 'bulletList' || type === 'numberedList') {
      return {
        id,
        type,
        items: Array.isArray(b.items) ? b.items : b.text ? [b.text] : [],
        style: {
          fontFamily: styleProfile?.fontBody || 'DM Sans',
          fontSizePx: styleProfile?.bodySizePx || 15,
          color: styleProfile?.textColor || '#1E293B',
          lineHeight: styleProfile?.lineHeight || 1.65,
        },
      };
    }

    const isHeading = type === 'heading1' || type === 'heading2' || type === 'heading3';
    const fontSizePx =
      type === 'heading1'
        ? styleProfile?.h1SizePx || 28
        : type === 'heading2'
          ? styleProfile?.h2SizePx || 20
          : type === 'heading3'
            ? styleProfile?.h3SizePx || 16
            : styleProfile?.bodySizePx || 15;

    return {
      id,
      type,
      text: b.text || '',
      style: {
        fontFamily: isHeading
          ? styleProfile?.fontDisplay || 'Plus Jakarta Sans'
          : styleProfile?.fontBody || 'DM Sans',
        fontSizePx,
        color: isHeading
          ? styleProfile?.primaryColor || '#0F172A'
          : styleProfile?.textColor || '#1E293B',
        backgroundColor:
          type === 'callout' ? styleProfile?.calloutBg || '#EFF6FF' : undefined,
        lineHeight: isHeading ? 1.3 : styleProfile?.lineHeight || 1.65,
        bold: isHeading,
      },
    };
  });
}

app.post('/api/ai/compose', async (req: Request, res: Response) => {
  try {
    const {
      mode = 'compose',
      instruction,
      documentTitle,
      documentContent,
      styleProfile,
      targetBlockId,
      targetBlockText,
    } = req.body ?? {};

    if (!instruction || typeof instruction !== 'string' || !instruction.trim()) {
      res.status(400).json({ error: 'Debes escribir una instrucción para redactar.' });
      return;
    }

    const ai = getGeminiClient();

    const styleContext = styleProfile
      ? `Plantilla activa: "${styleProfile.name}". Formalidad: ${styleProfile.formality}. Tono: ${styleProfile.tone}. Reglas de estilo: ${styleProfile.writingRules}.`
      : 'Tono profesional claro en español.';

    const modeHint =
      mode === 'table'
        ? 'El usuario solicita crear una tabla estructurada de Google Docs (usa tipo "table" con tableHeaders y tableRows, más un breve encabezado o párrafo introductorio si aporta claridad).'
        : mode === 'answer'
          ? 'El usuario solicita responder a una pregunta o duda presente en el documento. Redacta una respuesta clara, directa y fundamentada lista para insertarse en el documento.'
          : targetBlockText
            ? `El usuario desea mejorar o reescribir el siguiente bloque seleccionado (id: ${targetBlockId}): "${targetBlockText}". Devuelve action: "replace_block".`
            : 'Redacta contenido nuevo coherente con el documento actual y en el mismo idioma del usuario.';

    const response = await generateWithRetry(ai, {
      model: 'gemini-4-hydrogen',
      contents: `Documento: "${documentTitle || 'Sin título'}"
Contenido actual del documento:
${documentContent || '(Documento vacío)'}

Instrucción del usuario:
${instruction}

Contexto del modo:
${modeHint}

${styleContext}`,
      config: {
        systemInstruction:
          'Eres Trazo, un editor y redactor experto integrado en Google Docs. Respondes exclusivamente en JSON válido siguiendo el esquema solicitado. Redacta en español natural y profesional (a menos que la instrucción indique otro idioma), respetando estrictamente el tono y las reglas de estilo indicadas. No uses muletillas ni saludos.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: {
              type: Type.STRING,
              description: 'Resumen breve de 1 línea sobre el cambio propuesto.',
            },
            rationale: {
              type: Type.STRING,
              description: 'Explicación breve de cómo se aplicó el estilo o estructura.',
            },
            action: {
              type: Type.STRING,
              description: 'Uno de: insert_end, insert_after, replace_block',
            },
            blocks: {
              type: Type.ARRAY,
              items: blockSchema,
            },
          },
          required: ['summary', 'rationale', 'action', 'blocks'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const normalizedBlocks = normalizeGeneratedBlocks(parsed.blocks, styleProfile);

    res.json({
      id: `prop-${Date.now()}`,
      mode,
      action: targetBlockId ? 'replace_block' : parsed.action || 'insert_end',
      targetBlockId,
      beforeText: targetBlockText,
      summary: parsed.summary || 'Propuesta generada con Trazo IA',
      rationale: parsed.rationale || 'Adaptado al estilo del documento.',
      blocks: normalizedBlocks,
    });
  } catch (err) {
    handleGeminiError(res, err);
  }
});

app.post('/api/ai/answer', async (req: Request, res: Response) => {
  try {
    const { question, documentTitle, documentContent, styleProfile, targetBlockId } =
      req.body ?? {};
    if (!question || typeof question !== 'string' || !question.trim()) {
      res.status(400).json({ error: 'Se requiere una pregunta válida.' });
      return;
    }

    const ai = getGeminiClient();
    const response = await generateWithRetry(ai, {
      model: 'gemini-4-hydrogen',
      contents: `Documento: "${documentTitle || 'Sin título'}"
Contenido del documento:
${documentContent || '(Vacío)'}

Pregunta a responder:
${question}

Estilo objetivo: ${styleProfile?.tone || 'Profesional'} (${styleProfile?.formality || 'Ejecutivo'})`,
      config: {
        systemInstruction:
          'Eres un analista documental integrado en Google Docs. Responde la pregunta basándote en el contexto del documento y mejores prácticas del dominio. Devuelve una respuesta directa y bloques listos para insertar en el documento.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            summary: { type: Type.STRING },
            rationale: { type: Type.STRING },
            blocks: {
              type: Type.ARRAY,
              items: blockSchema,
            },
          },
          required: ['summary', 'rationale', 'blocks'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    const blocks = normalizeGeneratedBlocks(parsed.blocks, styleProfile);

    res.json({
      id: `ans-${Date.now()}`,
      mode: 'answer',
      action: targetBlockId ? 'insert_after' : 'insert_end',
      targetBlockId,
      summary: parsed.summary || 'Respuesta contextual al documento',
      rationale: parsed.rationale || 'Redacción adaptada al estilo activo.',
      blocks,
    });
  } catch (err) {
    handleGeminiError(res, err);
  }
});

app.post('/api/ai/suggestions', async (req: Request, res: Response) => {
  try {
    const { documentTitle, documentContent, styleProfile } = req.body ?? {};
    if (!documentContent || typeof documentContent !== 'string') {
      res.status(400).json({ error: 'El documento necesita contenido para analizar.' });
      return;
    }

    const ai = getGeminiClient();
    const response = await generateWithRetry(ai, {
      model: 'gemini-4-hydrogen',
      contents: `Documento: "${documentTitle || 'Sin título'}"
Bloques del documento (cada uno tiene [id:...] al inicio):
${documentContent}

Perfil de estilo deseado:
Nombre: ${styleProfile?.name || 'Estándar'}
Tono: ${styleProfile?.tone || 'Profesional y claro'}
Formalidad: ${styleProfile?.formality || 'Ejecutivo'}
Reglas: ${styleProfile?.writingRules || 'Conciso y estructurado'}`,
      config: {
        systemInstruction:
          'Eres un editor profesional de productividad en Google Docs. Analiza los bloques proporcionados y genera entre 2 y 4 sugerencias concretas de mejora de estilo, claridad, tono o estructura. Cada sugerencia DEBE referenciar un targetBlockId exacto de los bloques recibidos.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            suggestions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: {
                    type: Type.STRING,
                    description: 'Uno de: tono, claridad, estilo, estructura',
                  },
                  title: { type: Type.STRING },
                  description: { type: Type.STRING },
                  targetBlockId: { type: Type.STRING },
                  originalSnippet: { type: Type.STRING },
                  suggestedBlock: blockSchema,
                },
                required: [
                  'category',
                  'title',
                  'description',
                  'targetBlockId',
                  'originalSnippet',
                  'suggestedBlock',
                ],
              },
            },
          },
          required: ['suggestions'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{"suggestions":[]}').trim());
    const suggestions = (parsed.suggestions || []).map((s: any, idx: number) => ({
      id: `sug-${Date.now()}-${idx}`,
      category: s.category || 'estilo',
      title: s.title,
      description: s.description,
      targetBlockId: s.targetBlockId,
      originalSnippet: s.originalSnippet,
      suggestedBlock: normalizeGeneratedBlocks([s.suggestedBlock], styleProfile)[0],
    }));

    res.json({ suggestions });
  } catch (err) {
    handleGeminiError(res, err);
  }
});

app.post('/api/ai/analyze-tone', async (req: Request, res: Response) => {
  try {
    const { documentTitle, documentContent } = req.body ?? {};
    if (!documentContent || typeof documentContent !== 'string') {
      res.status(400).json({ error: 'Se requiere texto del documento para analizar el tono.' });
      return;
    }

    const ai = getGeminiClient();
    const response = await generateWithRetry(ai, {
      model: 'gemini-4-hydrogen',
      contents: `Analiza el estilo editorial y redacción del siguiente documento:
Título: ${documentTitle || 'Documento'}
Texto:
${documentContent.slice(0, 6000)}`,
      config: {
        systemInstruction:
          'Extrae el tono, formalidad y reglas prácticas de escritura del documento para poder imitarlo fielmente en nuevas secciones.',
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tone: { type: Type.STRING },
            formality: {
              type: Type.STRING,
              description: 'Uno de: Ejecutivo, Académico, Directo, Editorial, Técnico',
            },
            writingRules: { type: Type.STRING },
          },
          required: ['tone', 'formality', 'writingRules'],
        },
      },
    });

    const parsed = JSON.parse((response.text ?? '{}').trim());
    res.json(parsed);
  } catch (err) {
    handleGeminiError(res, err);
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Trazo server listening on http://localhost:${PORT}`);
  });
}

startServer();
