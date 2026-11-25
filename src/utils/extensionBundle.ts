import type { StyleProfile } from '../types/doc';

export interface ExtensionFile {
  path: string;
  label: string;
  language: 'json' | 'javascript' | 'css' | 'html' | 'text';
  content: string;
}

export function generateChromeExtensionFiles(
  apiBaseUrl: string,
  templates: StyleProfile[]
): ExtensionFile[] {
  const normalizedUrl = apiBaseUrl.replace(/\/+$/, '');
  const hostPattern = normalizedUrl.startsWith('http')
    ? `${normalizedUrl}/*`
    : 'https://*/*';

  const manifestJson = JSON.stringify(
    {
      manifest_version: 3,
      name: 'Trazo · Asistente IA para Google Docs',
      version: '1.0.0',
      description:
        'Icono minimalista inferior en Google Docs para redactar con IA, previsualizar cambios, responder preguntas, crear tablas y clonar estilos.',
      permissions: ['storage', 'activeTab', 'clipboardWrite'],
      host_permissions: [
        'https://docs.google.com/document/*',
        hostPattern,
      ],
      background: {
        service_worker: 'background.js',
      },
      action: {
        default_popup: 'popup.html',
        default_title: 'Trazo · Plantillas y configuración',
      },
      content_scripts: [
        {
          matches: ['https://docs.google.com/document/*'],
          js: ['content.js'],
          css: ['styles.css'],
          run_at: 'document_idle',
        },
      ],
    },
    null,
    2
  );

  const backgroundJs = `const DEFAULT_API_BASE = ${JSON.stringify(normalizedUrl)};
const DEFAULT_TEMPLATES = ${JSON.stringify(templates, null, 2)};

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get(['trazoApiBase', 'trazoTemplates', 'trazoActiveTemplateId'], (res) => {
    if (!res.trazoApiBase) {
      chrome.storage.sync.set({ trazoApiBase: DEFAULT_API_BASE });
    }
    if (!res.trazoTemplates) {
      chrome.storage.sync.set({
        trazoTemplates: DEFAULT_TEMPLATES,
        trazoActiveTemplateId: DEFAULT_TEMPLATES[0]?.id || 'tpl-executive'
      });
    }
  });
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'TRAZO_API_REQUEST') {
    chrome.storage.sync.get(['trazoApiBase'], async (res) => {
      const apiBase = (res.trazoApiBase || DEFAULT_API_BASE).replace(/\\/+$/, '');
      try {
        const response = await fetch(\`\${apiBase}\${message.endpoint}\`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(message.payload)
        });
        const data = await response.json();
        if (!response.ok) {
          sendResponse({ ok: false, error: data.error || 'Error del servidor IA' });
          return;
        }
        sendResponse({ ok: true, data });
      } catch (err) {
        sendResponse({ ok: false, error: err.message || 'No se pudo conectar con el servidor Trazo' });
      }
    });
    return true;
  }
});
`;

  const stylesCss = `#trazo-root {
  position: fixed;
  bottom: 22px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 999999;
  font-family: "DM Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

#trazo-fab {
  width: 44px;
  height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.12);
  background: #0f172a;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
  transition: transform 160ms cubic-bezier(0.16, 1, 0.3, 1), background 160ms ease;
}

#trazo-fab:hover {
  transform: translateY(-2px);
  background: #1e293b;
}

#trazo-bar {
  width: min(680px, calc(100vw - 32px));
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  box-shadow: 0 18px 42px rgba(15, 23, 42, 0.14);
  padding: 12px;
  display: none;
  flex-direction: column;
  gap: 10px;
}

#trazo-bar.open {
  display: flex;
}

.trazo-modes {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.trazo-mode-btn {
  padding: 5px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: #f1f5f9;
  color: #475569;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.trazo-mode-btn.active {
  background: #0f172a;
  color: #ffffff;
}

.trazo-input-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

#trazo-prompt {
  flex: 1;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  padding: 9px 12px;
  font-size: 13px;
  color: #0f172a;
  outline: none;
}

#trazo-prompt:focus {
  border-color: #1a73e8;
}

.trazo-primary-btn {
  background: #1a73e8;
  color: #ffffff;
  border: none;
  border-radius: 10px;
  padding: 9px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
}

.trazo-preview {
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  padding: 12px;
  max-height: 280px;
  overflow-y: auto;
  font-size: 13px;
  line-height: 1.55;
  color: #1e293b;
}

.trazo-preview-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 10px;
}
`;

  const contentJs = `(() => {
  if (document.getElementById('trazo-root')) return;

  let currentMode = 'compose';
  let pendingProposal = null;

  const root = document.createElement('div');
  root.id = 'trazo-root';
  root.innerHTML = \`
    <div id="trazo-bar" role="dialog" aria-label="Barra de redacción Trazo">
      <div class="trazo-modes">
        <button class="trazo-mode-btn active" data-mode="compose">Redactar</button>
        <button class="trazo-mode-btn" data-mode="answer">Responder</button>
        <button class="trazo-mode-btn" data-mode="table">Crear tabla</button>
        <button class="trazo-mode-btn" id="trazo-clone-style" type="button">Analizar estilo</button>
      </div>
      <div class="trazo-input-row">
        <input id="trazo-prompt" type="text" placeholder="Escribe qué deseas redactar, responder o estructurar en tu documento..." />
        <button id="trazo-send" class="trazo-primary-btn" type="button">Previsualizar</button>
      </div>
      <div id="trazo-preview-box" class="trazo-preview" style="display:none;"></div>
    </div>
    <button id="trazo-fab" type="button" aria-label="Abrir barra de asistencia Trazo" title="Trazo IA para Google Docs">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M12 20h9"></path>
        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
      </svg>
    </button>
  \`;
  document.body.appendChild(root);

  const bar = document.getElementById('trazo-bar');
  const fab = document.getElementById('trazo-fab');
  const promptInput = document.getElementById('trazo-prompt');
  const sendBtn = document.getElementById('trazo-send');
  const previewBox = document.getElementById('trazo-preview-box');
  const cloneBtn = document.getElementById('trazo-clone-style');

  fab.addEventListener('click', () => {
    bar.classList.toggle('open');
    if (bar.classList.contains('open')) {
      promptInput.focus();
    }
  });

  root.querySelectorAll('.trazo-mode-btn[data-mode]').forEach((btn) => {
    btn.addEventListener('click', () => {
      root.querySelectorAll('.trazo-mode-btn[data-mode]').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.getAttribute('data-mode') || 'compose';
    });
  });

  function readGoogleDocsTextAndStyle() {
    const spans = Array.from(document.querySelectorAll('.kix-lineview-text-block, .kix-wordhtmlgenerator-word-node'));
    const text = spans.map((s) => s.textContent || '').join(' ').replace(/\\s+/g, ' ').trim();
    const firstBody = spans.find((s) => (s.textContent || '').trim().length > 12);
    const computed = firstBody ? window.getComputedStyle(firstBody) : null;
    return {
      title: document.title.replace(' - Google Docs', '').trim() || 'Documento',
      text: text.slice(0, 8000),
      detectedStyle: computed
        ? {
            fontBody: computed.fontFamily.split(',')[0].replace(/["']/g, '').trim(),
            bodySizePx: parseInt(computed.fontSize, 10) || 15,
            textColor: computed.color || '#1E293B',
            lineHeight: parseFloat(computed.lineHeight) / (parseInt(computed.fontSize, 10) || 15) || 1.6
          }
        : null
    };
  }

  async function insertHtmlAndTextFluidly(blocks, styleProfile) {
    const editorFrame = document.querySelector('.docs-texteventtarget-iframe');
    const targetDoc = editorFrame?.contentDocument || document;
    const htmlParts = blocks.map((b) => {
      const font = styleProfile?.fontBody || 'Arial';
      const color = styleProfile?.textColor || '#1e293b';
      if (b.type === 'heading1') return \`<h1 style="font-family:\${font};color:\${styleProfile?.primaryColor || color};font-size:\${styleProfile?.h1SizePx || 24}px;">\${b.text}</h1>\`;
      if (b.type === 'heading2') return \`<h2 style="font-family:\${font};color:\${styleProfile?.primaryColor || color};font-size:\${styleProfile?.h2SizePx || 18}px;">\${b.text}</h2>\`;
      if (b.type === 'table' && b.table) {
        const ths = b.table.headers.map((h) => \`<th style="background:\${styleProfile?.tableHeaderBg || '#0f172a'};color:#fff;padding:6px 10px;border:1px solid #cbd5e1;">\${h}</th>\`).join('');
        const trs = b.table.rows.map((r) => \`<tr>\${r.map((c) => \`<td style="padding:6px 10px;border:1px solid #cbd5e1;">\${c}</td>\`).join('')}</tr>\`).join('');
        return \`<table style="border-collapse:collapse;width:100%;font-family:\${font};"><thead><tr>\${ths}</tr></thead><tbody>\${trs}</tbody></table>\`;
      }
      return \`<p style="font-family:\${font};color:\${color};font-size:\${styleProfile?.bodySizePx || 14}px;line-height:1.6;">\${b.text || (b.items || []).join('<br/>')}</p>\`;
    }).join('');

    const plainParts = blocks.map((b) => b.text || (b.items || []).join('\\n')).join('\\n\\n');
    try {
      const htmlBlob = new Blob([htmlParts], { type: 'text/html' });
      const textBlob = new Blob([plainParts], { type: 'text/plain' });
      await navigator.clipboard.write([new ClipboardItem({ 'text/html': htmlBlob, 'text/plain': textBlob })]);
      targetDoc.execCommand('paste');
    } catch {
      await navigator.clipboard.writeText(plainParts);
      targetDoc.execCommand('insertText', false, plainParts);
    }
  }

  cloneBtn.addEventListener('click', () => {
    const info = readGoogleDocsTextAndStyle();
    if (!info.detectedStyle) {
      previewBox.style.display = 'block';
      previewBox.textContent = 'No se detectó texto en el lienzo de Google Docs todavía.';
      return;
    }
    chrome.storage.sync.get(['trazoTemplates'], (res) => {
      const templates = res.trazoTemplates || [];
      const cloned = {
        id: 'cloned-' + Date.now(),
        name: 'Clonado · ' + info.title.slice(0, 20),
        ...info.detectedStyle,
        fontDisplay: info.detectedStyle.fontBody,
        h1SizePx: 26,
        h2SizePx: 20,
        primaryColor: info.detectedStyle.textColor,
        tableHeaderBg: '#0f172a',
        tone: 'Clonado automáticamente desde Google Docs'
      };
      chrome.storage.sync.set({ trazoTemplates: [cloned, ...templates], trazoActiveTemplateId: cloned.id });
      previewBox.style.display = 'block';
      previewBox.innerHTML = \`<strong>Estilo clonado y activado:</strong> \${cloned.fontBody} · \${cloned.bodySizePx}px · Color \${cloned.textColor}\`;
    });
  });

  sendBtn.addEventListener('click', () => {
    const instruction = promptInput.value.trim();
    if (!instruction) return;
    sendBtn.disabled = true;
    sendBtn.textContent = 'Generando...';

    chrome.storage.sync.get(['trazoTemplates', 'trazoActiveTemplateId'], (res) => {
      const templates = res.trazoTemplates || [];
      const activeStyle = templates.find((t) => t.id === res.trazoActiveTemplateId) || templates[0];
      const docState = readGoogleDocsTextAndStyle();

      chrome.runtime.sendMessage(
        {
          type: 'TRAZO_API_REQUEST',
          endpoint: '/api/ai/compose',
          payload: {
            mode: currentMode,
            instruction,
            documentTitle: docState.title,
            documentContent: docState.text,
            styleProfile: activeStyle
          }
        },
        (resp) => {
          sendBtn.disabled = false;
          sendBtn.textContent = 'Previsualizar';
          if (!resp?.ok) {
            previewBox.style.display = 'block';
            previewBox.textContent = resp?.error || 'Error al generar propuesta.';
            return;
          }
          pendingProposal = { ...resp.data, styleProfile: activeStyle };
          previewBox.style.display = 'block';
          previewBox.innerHTML = \`
            <div style="font-weight:600;margin-bottom:6px;">Vista previa de cambios · \${resp.data.summary}</div>
            <div>\${(resp.data.blocks || []).map((b) => b.text || (b.table ? '[Tabla ' + b.table.headers.length + ' columnas]' : '')).join('<br/><br/>')}</div>
            <div class="trazo-preview-actions">
              <button id="trazo-discard" type="button" class="trazo-mode-btn">Descartar</button>
              <button id="trazo-accept" type="button" class="trazo-primary-btn">Aceptar e insertar</button>
            </div>
          \`;
          document.getElementById('trazo-discard').onclick = () => {
            pendingProposal = null;
            previewBox.style.display = 'none';
          };
          document.getElementById('trazo-accept').onclick = async () => {
            if (!pendingProposal) return;
            await insertHtmlAndTextFluidly(pendingProposal.blocks || [], pendingProposal.styleProfile);
            pendingProposal = null;
            previewBox.style.display = 'none';
            promptInput.value = '';
          };
        }
      );
    });
  });
})();
`;

  const popupHtml = `<!doctype html>
<html lang="es">
  <head>
    <meta charset="UTF-8" />
    <title>Trazo · Plantillas</title>
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; width: 320px; margin: 0; padding: 14px; background: #f8fafc; color: #0f172a; }
      h1 { font-size: 15px; margin: 0 0 8px; }
      label { display: block; font-size: 12px; font-weight: 600; margin-top: 10px; color: #475569; }
      input, select { width: 100%; box-sizing: border-box; margin-top: 4px; padding: 7px 9px; border: 1px solid #cbd5e1; border-radius: 8px; font-size: 12px; background: #fff; }
      button { margin-top: 12px; width: 100%; padding: 8px 12px; border: none; border-radius: 8px; background: #0f172a; color: #fff; font-weight: 600; cursor: pointer; font-size: 12px; }
      .status { margin-top: 8px; font-size: 11px; color: #16a34a; min-height: 16px; }
    </style>
  </head>
  <body>
    <h1>Trazo · Google Docs AI</h1>
    <label for="templateSelect">Plantilla de estilo activa</label>
    <select id="templateSelect"></select>
    <label for="apiUrl">URL del servidor Trazo</label>
    <input id="apiUrl" type="url" placeholder="https://tu-servidor-trazo.run.app" />
    <button id="saveBtn" type="button">Guardar configuración</button>
    <div id="status" class="status"></div>
    <script src="popup.js"></script>
  </body>
</html>
`;

  const popupJs = `const select = document.getElementById('templateSelect');
const apiInput = document.getElementById('apiUrl');
const saveBtn = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');

chrome.storage.sync.get(['trazoApiBase', 'trazoTemplates', 'trazoActiveTemplateId'], (res) => {
  apiInput.value = res.trazoApiBase || '';
  const templates = res.trazoTemplates || [];
  select.innerHTML = '';
  templates.forEach((tpl) => {
    const opt = document.createElement('option');
    opt.value = tpl.id;
    opt.textContent = tpl.name;
    if (tpl.id === res.trazoActiveTemplateId) opt.selected = true;
    select.appendChild(opt);
  });
});

saveBtn.addEventListener('click', () => {
  chrome.storage.sync.set(
    {
      trazoApiBase: apiInput.value.trim(),
      trazoActiveTemplateId: select.value
    },
    () => {
      statusEl.textContent = 'Configuración guardada en Chrome Sync.';
      setTimeout(() => (statusEl.textContent = ''), 2500);
    }
  );
});
`;

  const readmeTxt = `Trazo · Extensión Chrome Manifest V3 para Google Docs
=====================================================

Instalación en Google Chrome (Modo Desarrollador):
1. Descomprime este archivo ZIP en una carpeta permanente.
2. Abre Google Chrome y visita: chrome://extensions
3. Activa el interruptor "Modo de desarrollador" (arriba a la derecha).
4. Haz clic en "Cargar descomprimida" (Load unpacked) y selecciona la carpeta descomprimida.
5. Abre cualquier documento en https://docs.google.com/document/
6. Verás el icono minimalista de Trazo centrado en la parte inferior de la pantalla.
`;

  return [
    { path: 'manifest.json', label: 'manifest.json', language: 'json', content: manifestJson },
    { path: 'content.js', label: 'content.js', language: 'javascript', content: contentJs },
    { path: 'styles.css', label: 'styles.css', language: 'css', content: stylesCss },
    { path: 'background.js', label: 'background.js', language: 'javascript', content: backgroundJs },
    { path: 'popup.html', label: 'popup.html', language: 'html', content: popupHtml },
    { path: 'popup.js', label: 'popup.js', language: 'javascript', content: popupJs },
    { path: 'README.txt', label: 'README.txt', language: 'text', content: readmeTxt },
  ];
}
