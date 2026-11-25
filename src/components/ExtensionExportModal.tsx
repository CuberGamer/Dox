import React, { useMemo, useState } from 'react';
import { Check, Copy, Download, FileCode2, X } from 'lucide-react';
import type { StyleProfile } from '../types/doc';
import { generateChromeExtensionFiles } from '../utils/extensionBundle';
import { buildZipArchive } from '../utils/zipBuilder';

interface ExtensionExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  templates: StyleProfile[];
}

export const ExtensionExportModal: React.FC<ExtensionExportModalProps> = ({
  isOpen,
  onClose,
  templates,
}) => {
  const defaultOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const [serverUrl, setServerUrl] = useState(defaultOrigin);
  const [selectedFileIndex, setSelectedFileIndex] = useState(0);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);

  const files = useMemo(
    () => generateChromeExtensionFiles(serverUrl, templates),
    [serverUrl, templates]
  );

  if (!isOpen) return null;

  const activeFile = files[selectedFileIndex] ?? files[0];

  const handleDownloadZip = () => {
    const zipBytes = buildZipArchive(
      files.map((f) => ({ name: f.path, content: f.content }))
    );
    const blob = new Blob([zipBytes.buffer as ArrayBuffer], {
      type: 'application/zip',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'trazo-google-docs-extension.zip';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleCopyFile = async () => {
    if (!activeFile) return;
    await navigator.clipboard.writeText(activeFile.content);
    setCopiedPath(activeFile.path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Exportar extensión de Chrome Manifest V3"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display text-base font-bold text-slate-900">
              Extensión de Chrome para Google Docs (Manifest V3)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Paquete completo listo para cargar en chrome://extensions con tus {templates.length} plantillas guardadas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar ventana"
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg cursor-pointer"
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>

        {/* Config + Instructions */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 flex-1 min-w-[260px]">
            <label
              htmlFor="ext-server-url"
              className="text-xs font-semibold text-slate-700 whitespace-nowrap"
            >
              URL del servidor IA:
            </label>
            <input
              id="ext-server-url"
              type="url"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              className="flex-1 h-8 px-2.5 text-xs font-mono bg-white border border-slate-200 rounded-md focus:outline-none focus:border-blue-600"
            />
          </div>

          <button
            type="button"
            onClick={handleDownloadZip}
            data-testid="download-extension-zip-btn"
            className="h-9 px-4 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" aria-hidden="true" />
            <span>Descargar extensión (.zip)</span>
          </button>
        </div>

        {/* Code Inspector Split */}
        <div className="flex-1 min-h-0 flex flex-col md:flex-row overflow-hidden">
          <div className="w-full md:w-52 bg-slate-50/60 border-b md:border-b-0 md:border-r border-slate-200 p-2.5 flex md:flex-col gap-1 overflow-x-auto">
            {files.map((file, idx) => (
              <button
                key={file.path}
                type="button"
                onClick={() => setSelectedFileIndex(idx)}
                className={`px-2.5 py-2 rounded-lg text-left text-xs font-mono flex items-center gap-2 cursor-pointer whitespace-nowrap transition-colors ${
                  idx === selectedFileIndex
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-700 hover:bg-slate-200/70'
                }`}
              >
                <FileCode2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                <span>{file.label}</span>
              </button>
            ))}
          </div>

          <div className="flex-1 flex flex-col min-w-0 bg-[#0F172A] text-slate-100">
            <div className="px-4 py-2 border-b border-slate-800 flex items-center justify-between">
              <span className="text-xs font-mono text-slate-300">
                {activeFile.path}
              </span>
              <button
                type="button"
                onClick={handleCopyFile}
                className="px-2.5 py-1 text-xs font-medium text-slate-200 hover:bg-slate-800 rounded flex items-center gap-1.5 cursor-pointer"
              >
                {copiedPath === activeFile.path ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" aria-hidden="true" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Copiar archivo</span>
                  </>
                )}
              </button>
            </div>
            <pre className="flex-1 p-4 overflow-auto clean-scroll text-xs font-mono leading-relaxed text-slate-200">
              <code>{activeFile.content}</code>
            </pre>
          </div>
        </div>

        {/* Footer install guide */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 text-xs text-slate-600 flex flex-wrap items-center justify-between gap-2">
          <span>
            Instalación: Descomprime el ZIP → abre <strong className="font-mono text-slate-900">chrome://extensions</strong> → activa Modo desarrollador → &ldquo;Cargar descomprimida&rdquo;.
          </span>
          <span className="text-slate-500">
            Compatible con docs.google.com/document/*
          </span>
        </div>
      </div>
    </div>
  );
};
