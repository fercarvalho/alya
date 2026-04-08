import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Lock, User, Eye, EyeOff, Copy, Check,
  HelpCircle, ChevronDown, ChevronUp, BookOpen, X, Search, ChevronRight
} from 'lucide-react';
import { marked, Renderer, use } from 'marked';
import EsqueciSenhaModal from './modals/EsqueciSenhaModal';
import ResetarSenhaModal from './modals/ResetarSenhaModal';
import { API_BASE_URL } from '../config/api';

declare global {
  interface Window {
    mermaid?: {
      initialize: (config: object) => void;
      run: (opts?: object) => Promise<void>;
    };
  }
}

const mermaidRenderer = new Renderer();
mermaidRenderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  if (lang === 'mermaid') {
    return `<div class="mermaid not-rendered">${text}</div>`;
  }
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<pre class="login-code-block"><code>${escaped}</code></pre>`;
};
use({ renderer: mermaidRenderer });

function loadMermaidCDN(): Promise<void> {
  return new Promise((resolve) => {
    if (window.mermaid) { resolve(); return; }
    const existing = document.querySelector('script[data-mermaid]');
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
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

interface FaqItem {
  id: string;
  pergunta: string;
  resposta: string;
}

interface DocPage {
  id: string;
  title: string;
  content: string;
  sectionId: string;
  updatedAt: string;
}

interface DocSection {
  id: string;
  title: string;
  pages: DocPage[];
}

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [passwordCopied, setPasswordCopied] = useState(false);
  const [showEsqueciSenhaModal, setShowEsqueciSenhaModal] = useState(false);
  const [showResetarSenhaModal, setShowResetarSenhaModal] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  // FAQ
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [faqOpenId, setFaqOpenId] = useState<string | null>(null);
  const [faqSearch, setFaqSearch] = useState('');

  // Documentação
  const [showDocsModal, setShowDocsModal] = useState(false);
  const [docsData, setDocsData] = useState<DocSection[]>([]);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [selectedPage, setSelectedPage] = useState<DocPage | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [docsSearch, setDocsSearch] = useState('');
  const docsContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedPage && docsContentRef.current) {
      renderMermaidInContainer(docsContentRef.current);
    }
  }, [selectedPage]);

  const closeFaqModal = () => { setShowFaqModal(false); setFaqSearch(''); setFaqOpenId(null); };
  const closeDocsModal = () => { setShowDocsModal(false); setDocsSearch(''); };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showFaqModal) closeFaqModal();
      else if (showDocsModal) closeDocsModal();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showFaqModal, showDocsModal]);

  const { login, completeFirstLogin } = useAuth();

  const isDemoMode = typeof window !== 'undefined' && (
    import.meta.env.VITE_DEMO_MODE === 'true' ||
    (window.location.hostname.includes('github.io') ||
      window.location.hostname.includes('demo') ||
      window.location.hostname.includes('demo.') ||
      window.location.hostname === 'alya.fercarvalho.com')
  );

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const token = params.get('token');
      if (token) {
        setResetToken(token);
        setShowResetarSenhaModal(true);
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    }
  }, []);

  React.useEffect(() => {
    fetch(`${API_BASE_URL}/faq`)
      .then(r => r.json())
      .then(result => { if (result.success) setFaqItems(result.data); })
      .catch(() => {});
  }, []);

  const handleOpenDocs = () => {
    setShowDocsModal(true);
    if (!docsLoaded) {
      fetch(`${API_BASE_URL}/documentation/public`)
        .then(r => r.json())
        .then(result => {
          if (result.success && result.data.length > 0) {
            setDocsData(result.data);
            // Expandir a primeira seção automaticamente
            setExpandedSections(new Set([result.data[0].id]));
            // Selecionar a primeira página automaticamente
            if (result.data[0].pages.length > 0) {
              setSelectedPage(result.data[0].pages[0]);
            }
          }
          setDocsLoaded(true);
        })
        .catch(() => setDocsLoaded(true));
    }
  };

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const filteredFaq = faqSearch
    ? faqItems.filter(f =>
        f.pergunta.toLowerCase().includes(faqSearch.toLowerCase()) ||
        f.resposta.toLowerCase().includes(faqSearch.toLowerCase())
      )
    : faqItems;

  const filteredDocs = docsSearch
    ? docsData.map(s => ({
        ...s,
        pages: s.pages.filter(p =>
          p.title.toLowerCase().includes(docsSearch.toLowerCase()) ||
          p.content.toLowerCase().includes(docsSearch.toLowerCase())
        )
      })).filter(s => s.pages.length > 0)
    : docsData;

  const renderMarkdown = (content: string) => {
    const html = marked(content, { breaks: true }) as string;
    return html;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setErrorCode('');
    setErrorMessage('');

    const result = await login(username, password);

    if (!result.success) {
      if (result.errorCode) {
        setError(result.error || 'Erro ao processar sua solicitação');
        setErrorCode(result.errorCode);
        setErrorMessage(result.message || '');
      } else {
        setError(result.error || 'Usuário ou senha incorretos');
      }
      setIsLoading(false);
    } else {
      if (result.firstLogin && result.newPassword) {
        setNewPassword(result.newPassword);
        setShowPasswordModal(true);
        setIsLoading(false);
        return;
      }
      setIsLoading(false);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(newPassword);
    setPasswordCopied(true);
    setTimeout(() => setPasswordCopied(false), 2000);
  };

  const handleCloseModal = async () => {
    setShowPasswordModal(false);
    setPasswordCopied(false);
    await completeFirstLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-amber-50 to-amber-100 flex flex-col items-center justify-start py-8 px-4">

      {/* Card de Login */}
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">ALYA</h1>
          <p className="text-gray-600">Sistema Financeiro</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {isDemoMode && (
            <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-4 mb-4">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-amber-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">!</span>
                  </div>
                </div>
                <div className="ml-3 flex-1">
                  <h3 className="text-sm font-bold text-amber-900 mb-2">Modo Demo</h3>
                  <div className="text-xs text-amber-800 space-y-1">
                    <p><strong>Login:</strong> <code className="bg-amber-100 px-2 py-1 rounded">demo</code></p>
                    <p><strong>Senha:</strong> <code className="bg-amber-100 px-2 py-1 rounded">demo123</code></p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div>
            <label htmlFor="username" className="block text-sm font-semibold text-gray-700 mb-2">
              Usuário
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <User className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                placeholder="Digite seu usuário"
                autoComplete="username"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-400" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 bg-white"
                placeholder="Digite sua senha"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
              >
                {showPassword
                  ? <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  : <Eye className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                }
              </button>
            </div>
          </div>

          <div className="flex justify-end mt-1">
            <button
              type="button"
              onClick={() => setShowEsqueciSenhaModal(true)}
              className="text-sm text-amber-600 hover:text-amber-800 font-medium"
            >
              Esqueci minha senha
            </button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 space-y-2">
              <p className="text-red-600 text-sm font-medium">{error}</p>
              {errorCode && (
                <div className="text-xs space-y-1">
                  <p className="text-red-500 font-mono">Código: {errorCode}</p>
                  {errorMessage && <p className="text-red-600">{errorMessage}</p>}
                </div>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-amber-600 hover:to-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>
      </div>

      {/* Botões de ajuda abaixo do card */}
      <div className="w-full max-w-md mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={handleOpenDocs}
          className="flex items-center justify-center gap-2 px-4 py-3 bg-white/70 hover:bg-white border border-amber-200 hover:border-amber-400 rounded-xl text-sm font-medium text-amber-800 hover:text-amber-900 shadow-sm hover:shadow transition-all duration-200 backdrop-blur-sm"
        >
          <BookOpen className="h-4 w-4 text-amber-600" />
          Documentação
        </button>
        {faqItems.length > 0 && (
          <button
            type="button"
            onClick={() => setShowFaqModal(true)}
            className="flex items-center justify-center gap-2 px-4 py-3 bg-white/70 hover:bg-white border border-amber-200 hover:border-amber-400 rounded-xl text-sm font-medium text-amber-800 hover:text-amber-900 shadow-sm hover:shadow transition-all duration-200 backdrop-blur-sm"
          >
            <HelpCircle className="h-4 w-4 text-amber-600" />
            Dúvidas Frequentes
          </button>
        )}
      </div>

      {/* ─── Modal FAQ ─── */}
      {showFaqModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={closeFaqModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                  <HelpCircle className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">Perguntas Frequentes</h2>
                  <p className="text-amber-100 text-xs">{faqItems.length} pergunta{faqItems.length !== 1 ? 's' : ''}</p>
                </div>
              </div>
              <button
                onClick={closeFaqModal}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>

            {/* Search */}
            <div className="px-4 pt-4 pb-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar pergunta..."
                  value={faqSearch}
                  onChange={e => setFaqSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
            </div>

            {/* Items */}
            <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-2">
              {filteredFaq.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Nenhuma pergunta encontrada.</div>
              ) : (
                filteredFaq.map(item => (
                  <div key={item.id} className="rounded-xl border border-gray-100 overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setFaqOpenId(prev => prev === item.id ? null : item.id)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-amber-50/60 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-800 leading-snug">{item.pergunta}</span>
                      {faqOpenId === item.id
                        ? <ChevronUp className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      }
                    </button>
                    {faqOpenId === item.id && (
                      <div className="px-4 pb-4 pt-1 border-t border-amber-50 bg-amber-50/30">
                        <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">{item.resposta}</p>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal Documentação ─── */}
      {showDocsModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4" onClick={closeDocsModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-orange-400 px-6 py-4 flex items-center justify-between flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h2 className="text-white font-bold text-lg">Documentação</h2>
                  <p className="text-amber-100 text-xs">Guias e referências do sistema</p>
                </div>
              </div>
              <button
                onClick={closeDocsModal}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-full flex items-center justify-center transition-colors"
              >
                <X className="h-4 w-4 text-white" />
              </button>
            </div>

            {/* Body */}
            <div className="flex flex-1 overflow-hidden">
              {/* Sidebar */}
              <div className="w-64 flex-shrink-0 border-r border-gray-100 flex flex-col overflow-hidden">
                {/* Search docs */}
                <div className="p-3 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Buscar..."
                      value={docsSearch}
                      onChange={e => setDocsSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* Sections tree */}
                <div className="overflow-y-auto flex-1">
                  {!docsLoaded ? (
                    <div className="p-4 text-sm text-gray-400 text-center">Carregando...</div>
                  ) : filteredDocs.length === 0 ? (
                    <div className="p-4 text-sm text-gray-400 text-center">Nenhum conteúdo encontrado.</div>
                  ) : (
                    filteredDocs.map(section => (
                      <div key={section.id}>
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-amber-50 transition-colors group"
                        >
                          <span className="text-xs font-semibold text-gray-700 uppercase tracking-wide group-hover:text-amber-700">
                            {section.title}
                          </span>
                          {expandedSections.has(section.id)
                            ? <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                            : <ChevronRight className="h-3.5 w-3.5 text-gray-400" />
                          }
                        </button>
                        {expandedSections.has(section.id) && (
                          <div className="pb-1">
                            {section.pages.map(page => (
                              <button
                                key={page.id}
                                onClick={() => setSelectedPage(page)}
                                className={`w-full text-left px-5 py-2 text-xs transition-colors ${
                                  selectedPage?.id === page.id
                                    ? 'bg-amber-50 text-amber-800 font-medium border-l-2 border-amber-500'
                                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                                }`}
                              >
                                {page.title}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto">
                {!selectedPage ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-8">
                    <BookOpen className="h-10 w-10 text-amber-200 mb-3" />
                    <p className="text-gray-500 text-sm">Selecione uma página no menu ao lado</p>
                  </div>
                ) : (
                  <div className="p-6">
                    <h1 className="text-xl font-bold text-gray-900 mb-1">{selectedPage.title}</h1>
                    <p className="text-xs text-gray-400 mb-5">
                      Atualizado em {new Date(selectedPage.updatedAt).toLocaleDateString('pt-BR')}
                    </p>
                    <div
                      ref={docsContentRef}
                      className="prose-login"
                      dangerouslySetInnerHTML={{ __html: renderMarkdown(selectedPage.content) }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Nova Senha */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 px-4 pb-4 pt-[180px]">
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-2xl p-8 w-full max-w-md max-h-[calc(100vh-220px)] overflow-y-auto border border-gray-200/50">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Primeiro Acesso</h2>
              <p className="text-gray-600">Uma nova senha foi gerada para você</p>
            </div>

            <div className="mb-6">
              <label htmlFor="new-password-display" className="block text-sm font-semibold text-gray-700 mb-2">
                Sua Nova Senha
              </label>
              <div className="relative">
                <input
                  id="new-password-display"
                  name="new-password-display"
                  type="text"
                  value={newPassword}
                  readOnly
                  className="w-full px-4 py-3 border-2 border-amber-500 rounded-lg bg-amber-50 font-mono text-lg font-bold text-gray-900 pr-12"
                  autoComplete="off"
                />
                <button
                  type="button"
                  onClick={handleCopyPassword}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  title="Copiar senha"
                >
                  {passwordCopied
                    ? <Check className="h-5 w-5 text-green-600" />
                    : <Copy className="h-5 w-5 text-gray-400 hover:text-gray-600" />
                  }
                </button>
              </div>
              {passwordCopied && <p className="text-green-600 text-sm mt-2">Senha copiada!</p>}
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
              <p className="text-amber-800 text-sm">
                <strong>⚠️ Importante:</strong> Anote esta senha em local seguro.
                Você precisará dela para fazer login novamente.
              </p>
            </div>

            <button
              onClick={handleCloseModal}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 text-white font-semibold py-3 px-4 rounded-lg hover:from-amber-600 hover:to-amber-700 focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 transition-all duration-200"
            >
              Entendi, continuar
            </button>
          </div>
        </div>
      )}

      <EsqueciSenhaModal
        isOpen={showEsqueciSenhaModal}
        onClose={() => setShowEsqueciSenhaModal(false)}
      />

      <ResetarSenhaModal
        isOpen={showResetarSenhaModal}
        token={resetToken}
        onClose={() => {
          setShowResetarSenhaModal(false);
          setResetToken(null);
        }}
      />

      {/* Estilos do conteúdo markdown na documentação */}
      <style>{`
        .prose-login h1 { font-size: 1.5rem; font-weight: 700; color: #111827; margin: 1.25rem 0 0.5rem; }
        .prose-login h2 { font-size: 1.125rem; font-weight: 600; color: #374151; margin: 1rem 0 0.5rem; padding-bottom: 0.25rem; border-bottom: 1px solid #f3f4f6; }
        .prose-login h3 { font-size: 1rem; font-weight: 600; color: #4b5563; margin: 0.75rem 0 0.25rem; }
        .prose-login p { color: #4b5563; line-height: 1.75; margin-bottom: 0.75rem; font-size: 0.875rem; }
        .prose-login ul, .prose-login ol { padding-left: 1.25rem; margin-bottom: 0.75rem; color: #4b5563; font-size: 0.875rem; }
        .prose-login li { margin-bottom: 0.25rem; line-height: 1.6; }
        .prose-login blockquote { border-left: 3px solid #f59e0b; background: #fffbeb; padding: 0.5rem 0.75rem; margin: 0.75rem 0; border-radius: 0 0.375rem 0.375rem 0; font-size: 0.875rem; }
        .prose-login code { background: #f3f4f6; color: #d97706; padding: 0.125rem 0.375rem; border-radius: 0.25rem; font-size: 0.8125rem; font-family: monospace; }
        .prose-login pre { background: #1f2937; color: #f9fafb; padding: 1rem; border-radius: 0.5rem; overflow-x: auto; margin: 0.75rem 0; font-size: 0.8125rem; }
        .prose-login pre code { background: none; color: inherit; padding: 0; }
        .prose-login table { width: 100%; border-collapse: collapse; margin: 0.75rem 0; font-size: 0.875rem; }
        .prose-login th { background: #fef3c7; padding: 0.5rem 0.75rem; text-align: left; border: 1px solid #e5e7eb; font-weight: 600; }
        .prose-login td { padding: 0.5rem 0.75rem; border: 1px solid #e5e7eb; }
        .prose-login a { color: #d97706; text-decoration: underline; }
        .prose-login strong { font-weight: 600; color: #1f2937; }
        .prose-login hr { border-color: #f3f4f6; margin: 1rem 0; }
        .mermaid { display: flex; justify-content: center; margin: 1rem 0; }
      `}</style>
    </div>
  );
};

export default Login;
