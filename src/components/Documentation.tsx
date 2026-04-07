import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  BookOpen, ChevronRight, ChevronDown, FileText, Search, X, Menu, Clock
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { marked, Renderer, use } from 'marked';

interface DocPage {
  id: string;
  sectionId: string;
  title: string;
  content: string;
  order: number;
  updatedAt: string;
}

interface DocSection {
  id: string;
  title: string;
  order: number;
  pages: DocPage[];
}

declare global {
  interface Window {
    mermaid?: {
      initialize: (config: object) => void;
      run: (opts?: object) => Promise<void>;
    };
  }
}

// Configura o renderer do marked para transformar blocos mermaid
const mermaidRenderer = new Renderer();
mermaidRenderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  if (lang === 'mermaid') {
    return `<div class="mermaid not-rendered">${text}</div>`;
  }
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<pre class="doc-code-block"><code class="language-${lang || ''}">${escaped}</code></pre>`;
};
use({ renderer: mermaidRenderer });

function loadMermaidCDN(): Promise<void> {
  return new Promise((resolve) => {
    if (window.mermaid) {
      resolve();
      return;
    }
    const existing = document.querySelector('script[data-mermaid]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js';
    script.setAttribute('data-mermaid', 'true');
    script.onload = () => {
      window.mermaid?.initialize({ startOnLoad: false, theme: 'default' });
      resolve();
    };
    document.head.appendChild(script);
  });
}

async function renderMermaidInContainer(container: HTMLElement) {
  const divs = container.querySelectorAll('.mermaid.not-rendered');
  if (divs.length === 0) return;
  await loadMermaidCDN();
  divs.forEach(d => d.classList.remove('not-rendered'));
  try {
    await window.mermaid?.run({ nodes: Array.from(divs) as HTMLElement[] });
  } catch {
    // diagrama inválido — mantém o texto raw
  }
}

const Documentation: React.FC = () => {
  const { token } = useAuth();
  const [sections, setSections] = useState<DocSection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/documentation`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        const result = await res.json();
        if (result.success && result.data.length > 0) {
          setSections(result.data);
          const firstSection = result.data[0];
          setActiveSectionId(firstSection.id);
          setExpandedSections(new Set([firstSection.id]));
          if (firstSection.pages.length > 0) {
            setActivePageId(firstSection.pages[0].id);
          }
        }
      } catch {
        // erro silencioso
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const activePage = sections
    .flatMap(s => s.pages)
    .find(p => p.id === activePageId);

  const renderedHtml = activePage
    ? (marked(activePage.content) as string)
    : '';

  useEffect(() => {
    if (contentRef.current && renderedHtml) {
      renderMermaidInContainer(contentRef.current);
    }
  }, [renderedHtml]);

  const toggleSection = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }, []);

  const selectPage = useCallback((sectionId: string, pageId: string) => {
    setActiveSectionId(sectionId);
    setActivePageId(pageId);
    setExpandedSections(prev => new Set([...prev, sectionId]));
    setSidebarOpen(false); // fecha sidebar no mobile ao selecionar
  }, []);

  // Filtro de busca
  const searchLower = search.toLowerCase().trim();
  const filteredSections = searchLower
    ? sections
        .map(s => ({
          ...s,
          pages: s.pages.filter(
            p =>
              p.title.toLowerCase().includes(searchLower) ||
              p.content.toLowerCase().includes(searchLower)
          ),
        }))
        .filter(s => s.pages.length > 0 || s.title.toLowerCase().includes(searchLower))
    : sections;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400 text-sm">Carregando documentação...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-amber-500 to-orange-400 rounded-2xl shadow-lg p-6 mb-6">
        <div className="flex items-center gap-4">
          <div className="bg-white/20 rounded-xl p-3">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-white">Documentação</h1>
            <p className="text-white/80 text-sm mt-0.5">
              Guias, instruções e referências do sistema
            </p>
          </div>
        </div>
      </div>

      {sections.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="bg-amber-50 rounded-full p-4">
              <FileText className="h-10 w-10 text-amber-400" />
            </div>
          </div>
          <h3 className="text-lg font-semibold text-gray-700 mb-2">
            Nenhuma documentação disponível
          </h3>
          <p className="text-gray-400 text-sm">
            A documentação será adicionada em breve.
          </p>
        </div>
      ) : (
        <div className="flex gap-4 relative">
          {/* Botão de toggle sidebar (mobile) */}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="lg:hidden fixed bottom-6 right-6 z-30 bg-amber-500 text-white rounded-full p-3 shadow-lg"
          >
            {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          {/* Sidebar */}
          <aside
            className={`
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
              transition-transform duration-200
              fixed lg:static inset-y-0 left-0 z-20
              w-72 lg:w-72 flex-shrink-0
              bg-white lg:bg-transparent
              lg:block
            `}
          >
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden sticky top-4">
              {/* Busca */}
              <div className="p-3 border-b border-gray-100">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar na documentação..."
                    className="w-full pl-9 pr-8 py-2 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                  {search && (
                    <button
                      onClick={() => setSearch('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Seções */}
              <nav className="overflow-y-auto max-h-[calc(100vh-320px)]">
                {filteredSections.map(section => {
                  const isExpanded = expandedSections.has(section.id);
                  return (
                    <div key={section.id}>
                      <button
                        onClick={() => toggleSection(section.id)}
                        className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold text-gray-700 hover:bg-amber-50 hover:text-amber-700 transition-colors"
                      >
                        <span className="truncate">{section.title}</span>
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        ) : (
                          <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        )}
                      </button>

                      {isExpanded && (
                        <div className="bg-gray-50">
                          {section.pages.map(page => (
                            <button
                              key={page.id}
                              onClick={() => selectPage(section.id, page.id)}
                              className={`w-full flex items-center gap-2 pl-6 pr-4 py-2.5 text-sm transition-colors ${
                                activePageId === page.id
                                  ? 'bg-gradient-to-r from-amber-400/20 to-orange-400/20 text-amber-700 font-medium border-l-2 border-amber-500'
                                  : 'text-gray-600 hover:bg-amber-50 hover:text-amber-700 border-l-2 border-transparent'
                              }`}
                            >
                              <FileText className="h-3.5 w-3.5 flex-shrink-0" />
                              <span className="truncate text-left">{page.title}</span>
                            </button>
                          ))}
                          {section.pages.length === 0 && (
                            <p className="pl-6 py-2 text-xs text-gray-400">
                              Nenhuma página nesta seção
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </nav>
            </div>
          </aside>

          {/* Conteúdo principal */}
          <main className="flex-1 min-w-0">
            {activePage ? (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                {/* Título da página */}
                <div className="px-8 py-5 border-b border-gray-100">
                  <h2 className="text-xl font-bold text-gray-800">{activePage.title}</h2>
                  {activePage.updatedAt && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      Atualizado em{' '}
                      {new Date(activePage.updatedAt).toLocaleDateString('pt-BR', {
                        day: '2-digit',
                        month: 'long',
                        year: 'numeric',
                      })}
                    </p>
                  )}
                </div>

                {/* Corpo renderizado */}
                <div
                  ref={contentRef}
                  className="px-8 py-6 doc-content"
                  dangerouslySetInnerHTML={{ __html: renderedHtml }}
                />
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-12 text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-amber-50 rounded-full p-4">
                    <BookOpen className="h-10 w-10 text-amber-400" />
                  </div>
                </div>
                <p className="text-gray-400 text-sm">
                  Selecione uma página na barra lateral para começar.
                </p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* Estilos do conteúdo markdown */}
      <style>{`
        .doc-content h1 { font-size: 1.75rem; font-weight: 700; color: #1f2937; margin: 1.5rem 0 0.75rem; }
        .doc-content h2 { font-size: 1.375rem; font-weight: 700; color: #374151; margin: 1.5rem 0 0.5rem; padding-bottom: 0.375rem; border-bottom: 1px solid #f3f4f6; }
        .doc-content h3 { font-size: 1.125rem; font-weight: 600; color: #4b5563; margin: 1.25rem 0 0.375rem; }
        .doc-content h4 { font-size: 1rem; font-weight: 600; color: #6b7280; margin: 1rem 0 0.25rem; }
        .doc-content p { color: #374151; line-height: 1.75; margin: 0.75rem 0; }
        .doc-content ul { list-style: disc; padding-left: 1.5rem; margin: 0.75rem 0; }
        .doc-content ol { list-style: decimal; padding-left: 1.5rem; margin: 0.75rem 0; }
        .doc-content li { color: #374151; line-height: 1.75; margin: 0.25rem 0; }
        .doc-content a { color: #d97706; text-decoration: underline; }
        .doc-content a:hover { color: #b45309; }
        .doc-content strong { font-weight: 700; color: #1f2937; }
        .doc-content em { font-style: italic; }
        .doc-content blockquote { border-left: 3px solid #f59e0b; padding: 0.5rem 1rem; background: #fffbeb; margin: 1rem 0; border-radius: 0 0.5rem 0.5rem 0; color: #78350f; }
        .doc-content code:not(pre code) { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.85em; color: #b45309; font-family: monospace; }
        .doc-code-block { background: #1f2937; border-radius: 0.75rem; padding: 1.25rem; overflow-x: auto; margin: 1rem 0; }
        .doc-code-block code { color: #f9fafb; font-family: monospace; font-size: 0.875rem; }
        .doc-content table { width: 100%; border-collapse: collapse; margin: 1rem 0; font-size: 0.875rem; }
        .doc-content th { background: #fffbeb; color: #92400e; font-weight: 600; padding: 0.625rem 0.875rem; border: 1px solid #fde68a; text-align: left; }
        .doc-content td { padding: 0.5rem 0.875rem; border: 1px solid #e5e7eb; color: #374151; }
        .doc-content tr:nth-child(even) td { background: #f9fafb; }
        .doc-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
        .doc-content img { max-width: 100%; border-radius: 0.5rem; }
        .mermaid { display: flex; justify-content: center; margin: 1.5rem 0; }
      `}</style>
    </div>
  );
};

export default Documentation;
