import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Footer from './Footer';
import {
  Lock, User, Eye, EyeOff, Copy, Check,
  HelpCircle, ChevronDown, ChevronUp, BookOpen, X, Search
} from 'lucide-react';
import EsqueciSenhaModal from './modals/EsqueciSenhaModal';
import ResetarSenhaModal from './modals/ResetarSenhaModal';
import { API_BASE_URL } from '../config/api';
import Documentation from './Documentation';
import CookieBanner from './CookieBanner';
import TermosUsoModal from './TermosUsoModal';
import PoliticaPrivacidadeModal from './PoliticaPrivacidadeModal';

interface FaqItem {
  id: string;
  pergunta: string;
  resposta: string;
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

  // Demo register
  const [showDemoModal, setShowDemoModal] = useState(false);
  const [demoNome, setDemoNome] = useState('');
  const [demoUsername, setDemoUsername] = useState('');
  const [demoEmail, setDemoEmail] = useState('');
  const [demoLoading, setDemoLoading] = useState(false);
  const [demoError, setDemoError] = useState('');
  const [demoTempPassword, setDemoTempPassword] = useState('');
  const [demoPasswordCopied, setDemoPasswordCopied] = useState(false);
  const [showDemoPasswordModal, setShowDemoPasswordModal] = useState(false);

  // FAQ
  const [faqItems, setFaqItems] = useState<FaqItem[]>([]);
  const [showFaqModal, setShowFaqModal] = useState(false);
  const [faqOpenId, setFaqOpenId] = useState<string | null>(null);
  const [faqSearch, setFaqSearch] = useState('');

  // Documentação
  const [showDocsModal, setShowDocsModal] = useState(false);

  // Legal
  const [showTermosModal, setShowTermosModal] = useState(false);
  const [showPoliticaModal, setShowPoliticaModal] = useState(false);

  const closeFaqModal = () => { setShowFaqModal(false); setFaqSearch(''); setFaqOpenId(null); };
  const closeDocsModal = () => { setShowDocsModal(false); };

  // Pontos do fundo — revelados pelo mouse via CSS mask
  const bgDots = useMemo(() => {
    const step = 52;
    const cols = Math.ceil(1440 / step) + 1;
    const rows = Math.ceil(920 / step) + 1;
    return Array.from({ length: cols * rows }, (_, i) => ({
      x: (i % cols) * step,
      y: Math.floor(i / cols) * step,
    }));
  }, []);

  // Efeito de luz seguindo o mouse
  const spotlightRef  = useRef<HTMLDivElement>(null);
  const dotsLayerRef  = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const isDark = () => document.documentElement.classList.contains('dark');

    const onMove = (e: MouseEvent) => {
      // Spotlight ambiente
      const el = spotlightRef.current;
      if (el) {
        const color = isDark()
          ? 'rgba(245, 158, 11, 0.14)'
          : 'rgba(245, 158, 11, 0.22)';
        el.style.background = `radial-gradient(650px circle at ${e.clientX}px ${e.clientY}px, ${color}, transparent 65%)`;
        el.style.opacity = '1';
      }
      // Dots revelados pela máscara radial
      const dotsEl = dotsLayerRef.current;
      if (dotsEl) {
        const mask = `radial-gradient(200px circle at ${e.clientX}px ${e.clientY}px, black 20%, transparent 100%)`;
        dotsEl.style.webkitMaskImage = mask;
        (dotsEl.style as any).maskImage = mask;
      }
    };

    const onLeave = () => {
      if (spotlightRef.current) spotlightRef.current.style.opacity = '0';
      if (dotsLayerRef.current) {
        const empty = 'radial-gradient(0px circle at 50% 50%, black, transparent)';
        dotsLayerRef.current.style.webkitMaskImage = empty;
        (dotsLayerRef.current.style as any).maskImage = empty;
      }
    };

    window.addEventListener('mousemove', onMove);
    document.documentElement.addEventListener('mouseleave', onLeave);
    return () => {
      window.removeEventListener('mousemove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
    };
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (showFaqModal) closeFaqModal();
      else if (showDocsModal) closeDocsModal();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [showFaqModal, showDocsModal]);

  const { login, completeFirstLogin, setUserAndToken } = useAuth();

  const isDemoMode = typeof window !== 'undefined' && (
    import.meta.env.VITE_DEMO_MODE === 'true' ||
    window.location.hostname.includes('github.io') ||
    window.location.hostname.includes('demo') ||
    window.location.hostname.includes('demo.') ||
    window.location.hostname === 'alya.fercarvalho.com'
  );

  useEffect(() => {
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

  useEffect(() => {
    fetch(`${API_BASE_URL}/faq`)
      .then(r => r.json())
      .then(result => { if (result.success) setFaqItems(result.data); })
      .catch(() => {});
  }, []);

  const handleOpenDocs = () => setShowDocsModal(true);

  const filteredFaq = faqSearch
    ? faqItems.filter(f =>
        f.pergunta.toLowerCase().includes(faqSearch.toLowerCase()) ||
        f.resposta.toLowerCase().includes(faqSearch.toLowerCase())
      )
    : faqItems;

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

  const handleDemoRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setDemoError('');
    if (demoUsername !== 'teste_nuvemshop') {
      setDemoError('Nome de usuário inválido. Apenas o usuário "teste_nuvemshop" pode usar este cadastro.');
      return;
    }
    setDemoLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/auth/demo-register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: demoNome, username: demoUsername, email: demoEmail }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setDemoError(data.error || 'Erro ao criar conta.');
        setDemoLoading(false);
        return;
      }
      // Armazena token e usuário (igual ao login normal)
      const storage = localStorage;
      storage.setItem('accessToken', data.accessToken);
      if (data.refreshToken) storage.setItem('refreshToken', data.refreshToken);
      setUserAndToken(data.user, data.accessToken, data.refreshToken);
      // Fecha modal de cadastro e mostra modal de senha temporária
      setShowDemoModal(false);
      setDemoNome('');
      setDemoUsername('');
      setDemoEmail('');
      setDemoTempPassword(data.tempPassword);
      setShowDemoPasswordModal(true);
    } catch {
      setDemoError('Erro de conexão. Tente novamente.');
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex flex-col login-page-bg">

      {/* ─── Camada decorativa de fundo ─── */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none select-none" aria-hidden="true">

        {/* Spotlight ambiente */}
        <div
          ref={spotlightRef}
          className="absolute inset-0"
          style={{ opacity: 0, transition: 'opacity 0.4s ease' }}
        />

        {/* Camada de pontos — visíveis APENAS onde o mouse ilumina (CSS mask) */}
        <div
          ref={dotsLayerRef}
          className="absolute inset-0"
          style={{
            WebkitMaskImage: 'radial-gradient(0px circle at 50% 50%, black, transparent)',
            maskImage:        'radial-gradient(0px circle at 50% 50%, black, transparent)',
          }}
        >
          <svg
            className="absolute inset-0 w-full h-full"
            viewBox="0 0 1440 900"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="xMidYMid slice"
          >
            {bgDots.map((d, i) => (
              <circle key={i} cx={d.x} cy={d.y} r="1.8" fill="#f59e0b" opacity="0.85" />
            ))}
          </svg>
        </div>

        {/* SVG decorativo — ondas + anéis (sempre visíveis) */}
        <svg
          className="absolute inset-0 w-full h-full login-svg-bg"
          viewBox="0 0 1440 900"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="xMidYMid slice"
        >
          {/* Linhas onduladas */}
          <path
            d="M-200,160 C100,60 350,260 680,140 C980,30 1180,230 1500,120"
            fill="none" stroke="#f59e0b" strokeWidth="1.5"
            className="login-svg-wave-1"
          />
          <path
            d="M-200,340 C150,240 400,440 750,300 C1060,175 1270,380 1600,260"
            fill="none" stroke="#fb923c" strokeWidth="1"
            className="login-svg-wave-2"
          />
          <path
            d="M-200,520 C200,420 460,620 820,480 C1130,355 1340,550 1640,440"
            fill="none" stroke="#f59e0b" strokeWidth="1.5"
            className="login-svg-wave-3"
          />
          <path
            d="M-200,700 C250,600 520,800 890,650 C1160,520 1360,710 1640,610"
            fill="none" stroke="#fb923c" strokeWidth="1"
            className="login-svg-wave-4"
          />

          {/* Anéis decorativos — canto superior direito */}
          <circle cx="1380" cy="90"  r="130" fill="none" stroke="#f59e0b" strokeWidth="1" className="login-svg-ring-1" />
          <circle cx="1380" cy="90"  r="85"  fill="none" stroke="#f59e0b" strokeWidth="1" className="login-svg-ring-2" />
          <circle cx="1380" cy="90"  r="45"  fill="#f59e0b" className="login-svg-fill-1" />

          {/* Anéis decorativos — canto inferior esquerdo */}
          <circle cx="80"   cy="830" r="100" fill="none" stroke="#fb923c" strokeWidth="1" className="login-svg-ring-3" />
          <circle cx="80"   cy="830" r="58"  fill="#fb923c" className="login-svg-fill-2" />
        </svg>
      </div>

      {/* ─── Conteúdo principal ─── */}
      <div className="relative z-10 flex flex-col items-center flex-1 py-10 px-4">

        {/* Card glassmorphism */}
        <div className="login-card-enter login-card w-full max-w-md rounded-3xl p-6 sm:p-8">

          {/* Header / Logo */}
          <div className="text-center mb-8">
            <div className="relative flex flex-col items-center mb-1">
              {/* Glow ambiente atrás do logo */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-16 bg-amber-400/20 dark:bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
              {/* Logo real */}
              <img
                src="/alya-logo.png"
                alt="Alya"
                className="relative h-16 w-auto object-contain dark:brightness-110"
              />
            </div>
            <p className="text-sm text-gray-500 dark:text-slate-400 mt-3 font-medium tracking-wide">Sistema de Gestão Inteligente</p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Banner modo demo */}
            {isDemoMode && (
              <div className="login-demo-banner rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 bg-amber-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-xs font-bold">!</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-amber-900 dark:text-amber-300 mb-1.5">Modo Demo</h3>
                    <div className="text-xs text-amber-800 dark:text-amber-400 space-y-1">
                      <p><strong>Login:</strong> <code className="login-code-badge">demo</code></p>
                      <p><strong>Senha:</strong> <code className="login-code-badge">demo123</code></p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Campo usuário — floating label */}
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                <User className="h-4 w-4 text-gray-400 dark:text-slate-500" />
              </div>
              <input
                id="username"
                name="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder=" "
                className="login-float-input"
                autoComplete="username"
                required
              />
              <label htmlFor="username" className="login-float-label">Usuário</label>
            </div>

            {/* Campo senha — floating label */}
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none z-10">
                <Lock className="h-4 w-4 text-gray-400 dark:text-slate-500" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder=" "
                className="login-float-input pr-11"
                autoComplete="current-password"
                required
              />
              <label htmlFor="password" className="login-float-label">Senha</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 dark:text-slate-500 hover:text-gray-600 dark:hover:text-slate-300 transition-colors z-10"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {/* Esqueci minha senha */}
            <div className="flex justify-end -mt-1">
              <button
                type="button"
                onClick={() => setShowEsqueciSenhaModal(true)}
                className="text-xs font-semibold text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-300 transition-colors hover:underline underline-offset-2"
              >
                Esqueci minha senha
              </button>
            </div>

            {/* Bloco de erro */}
            {error && (
              <div className="login-error-block rounded-xl p-3.5 space-y-1.5">
                <p className="text-sm font-medium">{error}</p>
                {errorCode && (
                  <div className="text-xs space-y-0.5 opacity-80">
                    <p className="font-mono">Código: {errorCode}</p>
                    {errorMessage && <p>{errorMessage}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Botão entrar */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 mt-1 rounded-xl font-semibold text-white
                bg-gradient-to-r from-amber-500 to-orange-500
                hover:from-amber-600 hover:to-orange-600
                shadow-lg shadow-amber-500/25
                hover:shadow-xl hover:shadow-amber-500/35
                hover:-translate-y-0.5 active:translate-y-0
                transition-all duration-200
                focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900
                disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 disabled:hover:shadow-lg"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </button>

            {/* Link cadastro demo */}
            <div className="text-center pt-1">
              <button
                type="button"
                onClick={() => { setShowDemoModal(true); setDemoNome(''); setDemoUsername(''); setDemoEmail(''); setDemoError(''); }}
                className="text-xs text-gray-400 dark:text-slate-600 hover:text-amber-600 dark:hover:text-amber-400 transition-colors hover:underline underline-offset-2"
              >
                Criar nova conta
              </button>
            </div>
          </form>
        </div>

        {/* Botões auxiliares: Docs + FAQ */}
        <div className="w-full max-w-md mt-4 grid grid-cols-2 gap-3 login-helpers-enter">
          <button
            type="button"
            onClick={handleOpenDocs}
            className="login-aux-btn flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200"
          >
            <BookOpen className="h-4 w-4 flex-shrink-0" />
            Documentação
          </button>
          {faqItems.length > 0 && (
            <button
              type="button"
              onClick={() => setShowFaqModal(true)}
              className="login-aux-btn flex items-center justify-center gap-2 px-4 py-3 rounded-2xl text-sm font-medium transition-all duration-200"
            >
              <HelpCircle className="h-4 w-4 flex-shrink-0" />
              Dúvidas Frequentes
            </button>
          )}
        </div>

        {/* Links legais */}
        <div className="w-full max-w-md grid grid-cols-2 gap-3 mt-1 mb-6 login-legal-enter">
          <div className="flex justify-center">
            <button
              onClick={() => setShowTermosModal(true)}
              className="text-xs text-gray-400 dark:text-slate-600 hover:text-amber-600 dark:hover:text-amber-400 transition-colors hover:underline underline-offset-2"
            >
              Termos de Uso
            </button>
          </div>
          <div className="flex justify-center">
            <button
              onClick={() => setShowPoliticaModal(true)}
              className="text-xs text-gray-400 dark:text-slate-600 hover:text-amber-600 dark:hover:text-amber-400 transition-colors hover:underline underline-offset-2"
            >
              Política de Privacidade
            </button>
          </div>
        </div>
      </div>

      {/* Rodapé */}
      <Footer />

      {/* ─── Modal FAQ ─── */}
      {showFaqModal && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 p-4"
          onClick={closeFaqModal}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
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

            <div className="px-4 pt-4 pb-2 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar pergunta..."
                  value={faqSearch}
                  onChange={e => setFaqSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:!bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:text-gray-100 dark:placeholder-gray-400"
                />
              </div>
            </div>

            <div className="overflow-y-auto flex-1 px-4 pb-4 space-y-2">
              {filteredFaq.length === 0 ? (
                <div className="text-center py-8 text-gray-400 text-sm">Nenhuma pergunta encontrada.</div>
              ) : (
                filteredFaq.map(item => (
                  <div key={item.id} className="rounded-xl border border-gray-100 dark:border-gray-700 overflow-hidden shadow-sm">
                    <button
                      type="button"
                      onClick={() => setFaqOpenId(prev => prev === item.id ? null : item.id)}
                      className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-amber-50/60 dark:hover:bg-amber-900/20 transition-colors"
                    >
                      <span className="text-sm font-medium text-gray-800 dark:text-gray-100 leading-snug">{item.pergunta}</span>
                      {faqOpenId === item.id
                        ? <ChevronUp className="h-4 w-4 text-amber-500 flex-shrink-0" />
                        : <ChevronDown className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                      }
                    </button>
                    {faqOpenId === item.id && (
                      <div className="px-4 pb-4 pt-1 border-t border-amber-50 dark:border-gray-700 bg-amber-50/30 dark:bg-gray-900/40">
                        <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">{item.resposta}</p>
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
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={closeDocsModal}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto relative"
            onClick={e => e.stopPropagation()}
          >
            <button
              onClick={closeDocsModal}
              className="absolute top-4 right-4 z-10 w-9 h-9 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-300 rounded-full flex items-center justify-center shadow transition-colors"
              aria-label="Fechar documentação"
            >
              <X className="h-4 w-4" />
            </button>
            <Documentation inModal />
          </div>
        </div>
      )}

      {/* ─── Modal Primeiro Acesso ─── */}
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
              <label htmlFor="new-password-display" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
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

      {/* ─── Modal Cadastro Demo ─── */}
      {showDemoModal && (
        <div
          className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={() => { setShowDemoModal(false); setDemoUsername(''); setDemoNome(''); setDemoEmail(''); setDemoError(''); }}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm p-8"
            onClick={e => e.stopPropagation()}
          >
            <div className="text-center mb-6">
              <div className="mx-auto w-14 h-14 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center mb-4">
                <User className="w-7 h-7 text-white" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">Criar nova conta</h2>
              <p className="text-sm text-gray-500 dark:text-slate-400">Preencha os dados para criar sua conta</p>
            </div>

            <form onSubmit={handleDemoRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nome completo</label>
                <input
                  type="text"
                  value={demoNome}
                  onChange={e => setDemoNome(e.target.value)}
                  placeholder="Seu nome"
                  required
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">Nome de usuário</label>
                <input
                  type="text"
                  value={demoUsername}
                  onChange={e => { setDemoUsername(e.target.value); setDemoError(''); }}
                  placeholder="Digite o nome de usuário"
                  required
                  className={`w-full px-4 py-3 border rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm font-mono focus:outline-none focus:ring-2 focus:border-transparent transition ${
                    demoUsername && demoUsername !== 'teste_nuvemshop'
                      ? 'border-red-400 focus:ring-red-400'
                      : demoUsername === 'teste_nuvemshop'
                      ? 'border-green-400 focus:ring-green-400'
                      : 'border-gray-200 dark:border-gray-700 focus:ring-amber-400'
                  }`}
                />
                {demoUsername && demoUsername !== 'teste_nuvemshop' && (
                  <p className="text-xs text-red-500 mt-1">Apenas "teste_nuvemshop" é permitido.</p>
                )}
                {demoUsername === 'teste_nuvemshop' && (
                  <p className="text-xs text-green-600 dark:text-green-400 mt-1">✓ Usuário válido</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 dark:text-slate-400 uppercase tracking-wide mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={demoEmail}
                  onChange={e => setDemoEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 focus:border-transparent transition"
                />
              </div>

              {demoError && (
                <div className="rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3">
                  <p className="text-sm text-red-600 dark:text-red-400">{demoError}</p>
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => { setShowDemoModal(false); setDemoUsername(''); setDemoNome(''); setDemoEmail(''); setDemoError(''); }}
                  className="flex-1 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={demoLoading}
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white text-sm font-semibold shadow-lg shadow-amber-500/25 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {demoLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Criando...
                    </span>
                  ) : 'Criar conta'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal Senha Temporária (pós-cadastro demo) ─── */}
      {showDemoPasswordModal && (
        <div className="fixed inset-0 bg-gradient-to-br from-amber-900/50 to-orange-900/50 backdrop-blur-sm flex items-center justify-center z-50 px-4">
          <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-800 rounded-2xl shadow-2xl p-8 w-full max-w-md border border-gray-200/50 dark:border-gray-700/50">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 bg-gradient-to-r from-amber-500 to-amber-600 rounded-full flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Conta criada com sucesso!</h2>
              <p className="text-gray-600 dark:text-slate-400 text-sm">Esta é a sua senha temporária de acesso</p>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Senha temporária
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={demoTempPassword}
                  readOnly
                  className="w-full px-4 py-3 border-2 border-amber-500 rounded-xl bg-amber-50 dark:bg-amber-900/20 font-mono text-lg font-bold text-gray-900 dark:text-white pr-12"
                />
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(demoTempPassword);
                    setDemoPasswordCopied(true);
                    setTimeout(() => setDemoPasswordCopied(false), 2000);
                  }}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  title="Copiar senha"
                >
                  {demoPasswordCopied
                    ? <Check className="h-5 w-5 text-green-600" />
                    : <Copy className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" />
                  }
                </button>
              </div>
              {demoPasswordCopied && <p className="text-green-600 text-sm mt-2">Senha copiada!</p>}
            </div>

            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-6">
              <p className="text-amber-800 dark:text-amber-300 text-sm">
                <strong>⚠️ Importante:</strong> Anote esta senha. Você precisará dela para fazer login novamente com este usuário.
              </p>
            </div>

            <button
              onClick={() => setShowDemoPasswordModal(false)}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold py-3 px-4 rounded-xl shadow-lg shadow-amber-500/25 transition-all duration-200"
            >
              Entendi, continuar para o sistema
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

      {/* Banner de Cookies (LGPD) */}
      <CookieBanner
        onOpenTermos={() => setShowTermosModal(true)}
        onOpenPolitica={() => setShowPoliticaModal(true)}
      />

      {/* Modais Legais */}
      <TermosUsoModal
        isOpen={showTermosModal}
        onClose={() => setShowTermosModal(false)}
      />
      <PoliticaPrivacidadeModal
        isOpen={showPoliticaModal}
        onClose={() => setShowPoliticaModal(false)}
      />

      {/* ─── Estilos da página de login ─── */}
      <style>{`
        /* ── Fundo da página ── */
        .login-page-bg {
          background: linear-gradient(135deg, #fffbeb 0%, #fff7ed 40%, #fef3c7 100%);
        }
        html.dark .login-page-bg {
          background: linear-gradient(135deg, #020617 0%, #0f172a 50%, #020617 100%);
        }

        /* ── SVG decorativo (ondas + anéis) ── */
        .login-svg-bg .login-svg-wave-1 { opacity: 0.20; }
        .login-svg-bg .login-svg-wave-2 { opacity: 0.13; }
        .login-svg-bg .login-svg-wave-3 { opacity: 0.13; }
        .login-svg-bg .login-svg-wave-4 { opacity: 0.09; }
        .login-svg-bg .login-svg-ring-1 { opacity: 0.12; }
        .login-svg-bg .login-svg-ring-2 { opacity: 0.09; }
        .login-svg-bg .login-svg-fill-1 { opacity: 0.06; }
        .login-svg-bg .login-svg-ring-3 { opacity: 0.09; }
        .login-svg-bg .login-svg-fill-2 { opacity: 0.05; }

        html.dark .login-svg-bg .login-svg-wave-1 { opacity: 0.09; }
        html.dark .login-svg-bg .login-svg-wave-2 { opacity: 0.06; }
        html.dark .login-svg-bg .login-svg-wave-3 { opacity: 0.06; }
        html.dark .login-svg-bg .login-svg-wave-4 { opacity: 0.04; }
        html.dark .login-svg-bg .login-svg-ring-1 { opacity: 0.07; }
        html.dark .login-svg-bg .login-svg-ring-2 { opacity: 0.05; }
        html.dark .login-svg-bg .login-svg-fill-1 { opacity: 0.03; }
        html.dark .login-svg-bg .login-svg-ring-3 { opacity: 0.05; }
        html.dark .login-svg-bg .login-svg-fill-2 { opacity: 0.03; }

        /* ── Card glassmorphism ── */
        .login-card {
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(251, 191, 36, 0.20);
          box-shadow:
            0 25px 50px -12px rgba(245, 158, 11, 0.08),
            0 10px 24px -6px rgba(0, 0, 0, 0.06);
        }
        html.dark .login-card {
          background: rgba(15, 23, 42, 0.80);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          border: 1px solid rgba(255, 255, 255, 0.07);
          box-shadow:
            0 25px 50px -12px rgba(0, 0, 0, 0.50),
            0 10px 24px -6px rgba(0, 0, 0, 0.30);
        }

        /* ── Floating label inputs ── */
        .login-float-input {
          width: 100%;
          height: 3.5rem;
          padding: 1.375rem 1rem 0.375rem 2.75rem;
          border: 1px solid rgba(209, 213, 219, 0.70);
          border-radius: 0.75rem;
          background: rgba(255, 255, 255, 0.65);
          color: #111827;
          font-size: 0.9375rem;
          transition: border-color 0.2s, box-shadow 0.2s;
        }
        .login-float-input::placeholder { color: transparent; }
        .login-float-input:focus {
          outline: none;
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.18);
        }
        html.dark .login-float-input {
          background: rgba(30, 41, 59, 0.60);
          border-color: rgba(71, 85, 105, 0.55);
          color: #f1f5f9;
        }
        html.dark .login-float-input:focus {
          background: rgba(30, 41, 59, 0.75);
          border-color: #f59e0b;
          box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
        }

        /* Label dentro do input — posição padrão (campo vazio, sem foco) */
        .login-float-label {
          position: absolute;
          left: 2.75rem;
          top: 50%;
          transform: translateY(-50%);
          font-size: 0.9375rem;
          color: #9ca3af;
          pointer-events: none;
          transition: top 0.18s ease, transform 0.18s ease,
                      font-size 0.18s ease, color 0.18s ease,
                      font-weight 0.18s ease, letter-spacing 0.18s ease;
          white-space: nowrap;
        }
        html.dark .login-float-label { color: #475569; }

        /* Label flutuada — quando focado OU preenchido */
        .login-float-input:focus ~ .login-float-label,
        .login-float-input:not(:placeholder-shown) ~ .login-float-label {
          top: 0.55rem;
          transform: translateY(0);
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #d97706;
        }
        html.dark .login-float-input:focus ~ .login-float-label,
        html.dark .login-float-input:not(:placeholder-shown) ~ .login-float-label {
          color: #fbbf24;
        }

        /* ── Banner demo ── */
        .login-demo-banner {
          background: rgba(245, 158, 11, 0.10);
          border: 1px solid rgba(245, 158, 11, 0.28);
        }
        html.dark .login-demo-banner {
          background: rgba(245, 158, 11, 0.12);
          border-color: rgba(245, 158, 11, 0.25);
        }

        /* ── Code badge no banner demo ── */
        .login-code-badge {
          background: rgba(245, 158, 11, 0.15);
          padding: 1px 6px;
          border-radius: 4px;
          font-family: monospace;
        }

        /* ── Bloco de erro ── */
        .login-error-block {
          background: rgba(254, 226, 226, 0.80);
          border: 1px solid rgba(252, 165, 165, 0.60);
          color: #dc2626;
        }
        html.dark .login-error-block {
          background: rgba(127, 29, 29, 0.30);
          border-color: rgba(248, 113, 113, 0.25);
          color: #fca5a5;
        }

        /* ── Botões auxiliares ── */
        .login-aux-btn {
          background: rgba(255, 255, 255, 0.65);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          border: 1px solid rgba(251, 191, 36, 0.30);
          color: #92400e;
          box-shadow: 0 1px 3px rgba(0,0,0,0.06);
        }
        .login-aux-btn:hover {
          background: rgba(255, 255, 255, 0.90);
          border-color: rgba(245, 158, 11, 0.55);
          color: #78350f;
          box-shadow: 0 4px 8px rgba(0,0,0,0.08);
          transform: translateY(-1px);
        }
        html.dark .login-aux-btn {
          background: rgba(255, 255, 255, 0.05);
          border-color: rgba(255, 255, 255, 0.08);
          color: #fbbf24;
        }
        html.dark .login-aux-btn:hover {
          background: rgba(255, 255, 255, 0.10);
          border-color: rgba(245, 158, 11, 0.40);
          color: #fcd34d;
          transform: translateY(-1px);
        }

        /* ── Animação das ondas do fundo ── */
        @keyframes loginWave1 {
          0%, 100% { transform: translateX(0px) translateY(0px); }
          50%       { transform: translateX(-55px) translateY(10px); }
        }
        @keyframes loginWave2 {
          0%, 100% { transform: translateX(0px) translateY(0px); }
          50%       { transform: translateX(65px) translateY(-12px); }
        }
        @keyframes loginWave3 {
          0%, 100% { transform: translateX(0px) translateY(0px); }
          50%       { transform: translateX(-45px) translateY(14px); }
        }
        @keyframes loginWave4 {
          0%, 100% { transform: translateX(0px) translateY(0px); }
          50%       { transform: translateX(50px) translateY(-9px); }
        }
        .login-svg-bg .login-svg-wave-1 {
          animation: loginWave1 18s ease-in-out infinite;
        }
        .login-svg-bg .login-svg-wave-2 {
          animation: loginWave2 23s ease-in-out infinite;
          animation-delay: -6s;
        }
        .login-svg-bg .login-svg-wave-3 {
          animation: loginWave3 20s ease-in-out infinite;
          animation-delay: -11s;
        }
        .login-svg-bg .login-svg-wave-4 {
          animation: loginWave4 26s ease-in-out infinite;
          animation-delay: -4s;
        }

        /* ── Animações de entrada ── */
        @keyframes loginFadeInUp {
          from { opacity: 0; transform: translateY(22px); }
          to   { opacity: 1; transform: translateY(0);    }
        }
        .login-card-enter {
          animation: loginFadeInUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) both;
        }
        .login-helpers-enter {
          animation: loginFadeInUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.08s both;
        }
        .login-legal-enter {
          animation: loginFadeInUp 0.55s cubic-bezier(0.16, 1, 0.3, 1) 0.14s both;
        }

        /* ── Estilos markdown (modal de documentação) ── */
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
        html.dark .prose-login h1 { color: #f1f5f9; }
        html.dark .prose-login h2 { color: #e2e8f0; border-bottom-color: #334155; }
        html.dark .prose-login h3 { color: #cbd5e1; }
        html.dark .prose-login p { color: #cbd5e1; }
        html.dark .prose-login ul, html.dark .prose-login ol { color: #cbd5e1; }
        html.dark .prose-login blockquote { background: #1c1200; border-left-color: #f59e0b; }
        html.dark .prose-login code { background: #1e293b; color: #fbbf24; }
        html.dark .prose-login th { background: #1c1a00; border-color: #334155; color: #f1f5f9; }
        html.dark .prose-login td { border-color: #334155; color: #cbd5e1; }
        html.dark .prose-login a { color: #fbbf24; }
        html.dark .prose-login strong { color: #f1f5f9; }
        html.dark .prose-login hr { border-color: #334155; }
      `}</style>
    </div>
  );
};

export default Login;
