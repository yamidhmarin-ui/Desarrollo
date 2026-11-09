import React, { useState } from 'react';
import {
  Download,
  Copy,
  CheckCircle2,
  X,
  ExternalLink,
  Code2,
  FolderArchive,
  Terminal,
} from 'lucide-react';

interface GitHubExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const GitHubExportModal: React.FC<GitHubExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!isOpen) return null;

  const gitCommands = `# 1. En la carpeta descomprimida del proyecto, abre tu terminal y ejecuta:
git init
git add .
git commit -m "feat: versión completa de Regressio Business AI"

# 2. Renombra la rama a main y vincula tu repositorio de GitHub:
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main`;

  const handleCopy = () => {
    navigator.clipboard.writeText(gitCommands);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadZip = async () => {
    try {
      setIsDownloading(true);
      const res = await fetch('/api/export-zip');
      if (!res.ok) throw new Error('Error al descargar ZIP');
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = 'regressio-business-ai.zip';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(blobUrl);
      a.remove();
    } catch (err) {
      console.error('Error descargando ZIP:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-6 shadow-2xl space-y-5">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <FolderArchive className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Exportar y Publicar en GitHub
              </h3>
              <p className="text-xs text-slate-500">
                Descarga el código fuente completo e instrucciones para subirlo a tu repositorio
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Explicación de por qué no se puede hacer directo desde AI Studio */}
        <div className="p-3.5 rounded-lg bg-amber-50/80 border border-amber-200 text-xs text-amber-900 space-y-1">
          <span className="font-semibold text-amber-950">
            ¿Por qué Google AI Studio no permite compartir directamente a GitHub?
          </span>
          <p className="leading-relaxed text-amber-900/90">
            Google AI Studio opera en un entorno hermético en la nube y por defecto solo genera un enlace público de visualización de la app (mediante el botón superior <strong>Compartir</strong>). Para llevar el código a tu cuenta de GitHub, simplemente descarga el archivo ZIP completo aquí abajo y súbelo a tu repositorio.
          </p>
        </div>

        {/* Botón de descarga directa del ZIP */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-900 block">
              Código Fuente Completo (.ZIP)
            </span>
            <span className="text-[11px] text-slate-500">
              Incluye versión React/Node + versión Python Streamlit (app_streamlit.py y requirements.txt)
            </span>
          </div>
          <button
            onClick={handleDownloadZip}
            disabled={isDownloading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 disabled:opacity-50 rounded-lg shadow-sm transition-colors whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span>{isDownloading ? 'Generando ZIP...' : 'Descargar ZIP del Proyecto'}</span>
          </button>
        </div>

        {/* Instrucciones Git */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-900 flex items-center gap-1.5">
              <Terminal className="w-4 h-4 text-slate-600" />
              <span>Comandos para publicar en tu GitHub:</span>
            </span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 hover:text-indigo-800"
            >
              {copied ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Comandos copiados</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copiar comandos</span>
                </>
              )}
            </button>
          </div>

          <pre className="p-3.5 rounded-lg bg-slate-900 text-slate-200 font-mono text-[11px] leading-relaxed overflow-x-auto">
            {gitCommands}
          </pre>
        </div>

        <div className="pt-2 flex justify-between items-center text-xs text-slate-500">
          <a
            href="https://github.com/new"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium"
          >
            <span>Crear nuevo repositorio en GitHub</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
