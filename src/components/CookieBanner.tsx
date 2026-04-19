import React, { useState, useEffect } from 'react';
import { Cookie, X, Settings, ChevronDown, ChevronUp, Shield } from 'lucide-react';
import { API_BASE_URL } from '../config/api';

interface CookieCategoria {
  id: number;
  chave: string;
  nome: string;
  descricao: string;
  ativo: boolean;
  obrigatorio: boolean;
  ordem: number;
}

interface BannerConfig {
  titulo: string;
  texto: string;
  textoBotaoAceitar: string;
  textoBotaoRejeitar: string;
  textoBotaoPersonalizar: string;
  textoDescricaoGerenciamento: string;
}

interface CookiePreferences {
  [key: string]: boolean;
}

interface CookieBannerProps {
  onOpenTermos: () => void;
  onOpenPolitica: () => void;
}

const STORAGE_KEY = 'cookieConsent';

const CookieBanner: React.FC<CookieBannerProps> = ({ onOpenTermos, onOpenPolitica }) => {
  const [showBanner, setShowBanner] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [config, setConfig] = useState<BannerConfig | null>(null);
  const [categorias, setCategorias] = useState<CookieCategoria[]>([]);
  const [preferences, setPreferences] = useState<CookiePreferences>({});
  const [expandedCategoria, setExpandedCategoria] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const existingConsent = localStorage.getItem(STORAGE_KEY);
    if (existingConsent) return; // já consentiu neste browser

    // Carregar config e categorias em paralelo
    Promise.all([
      fetch(`${API_BASE_URL}/cookie-banner-config`).then(r => r.json()).catch(() => null),
      fetch(`${API_BASE_URL}/cookie-categorias`).then(r => r.json()).catch(() => null),
    ]).then(([configRes, categRes]) => {
      if (configRes?.success) setConfig(configRes.data);
      if (categRes?.success) {
        setCategorias(categRes.data);
        // Inicializar prefs: obrigatórios = true, outros = false
        const prefs: CookiePreferences = {};
        categRes.data.forEach((c: CookieCategoria) => {
          prefs[c.chave] = c.obrigatorio;
        });
        setPreferences(prefs);
      }
      setShowBanner(true);
      // Animação de entrada com delay
      setTimeout(() => setIsVisible(true), 100);
    });
  }, []);

  // Abrir gerenciador via evento externo (ex: link "Gerenciar Cookies" do rodapé)
  useEffect(() => {
    const handleOpen = () => {
      Promise.all([
        fetch(`${API_BASE_URL}/cookie-banner-config`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE_URL}/cookie-categorias`).then(r => r.json()).catch(() => null),
      ]).then(([configRes, categRes]) => {
        if (configRes?.success) setConfig(configRes.data);
        if (categRes?.success) {
          setCategorias(categRes.data);
          const prefs: CookiePreferences = {};
          categRes.data.forEach((c: CookieCategoria) => { prefs[c.chave] = c.obrigatorio; });
          // Mesclar com preferências já salvas
          try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) Object.assign(prefs, JSON.parse(saved));
          } catch {}
          setPreferences(prefs);
        }
        setShowBanner(true);
        setShowModal(true);
        // isVisible permanece false → o banner inferior não aparece, só o modal
      });
    };
    window.addEventListener('cookie:open-manager', handleOpen);
    return () => window.removeEventListener('cookie:open-manager', handleOpen);
  }, []);

  // Fechar o modal (e o banner se o usuário já havia consentido)
  const fecharModal = () => {
    setShowModal(false);
    if (localStorage.getItem(STORAGE_KEY)) {
      setIsVisible(false);
      setTimeout(() => setShowBanner(false), 300);
    }
  };

  // Fechar com Escape
  useEffect(() => {
    if (!showModal) return;
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') fecharModal(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [showModal]);

  const salvarPreferencias = (prefs: CookiePreferences) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
    setIsVisible(false);
    setTimeout(() => setShowBanner(false), 300);
    setShowModal(false);
  };

  const handleAceitarTodos = () => {
    const allAccepted: CookiePreferences = {};
    categorias.forEach(c => { allAccepted[c.chave] = true; });
    // Garantir necessary sempre true
    allAccepted['necessary'] = true;
    salvarPreferencias(allAccepted);
  };

  const handleRejeitarTodos = () => {
    const onlyRequired: CookiePreferences = {};
    categorias.forEach(c => { onlyRequired[c.chave] = c.obrigatorio; });
    salvarPreferencias(onlyRequired);
  };

  const handleSalvarPersonalizados = () => {
    // Garantir obrigatórios sempre true
    const finalPrefs = { ...preferences };
    categorias.forEach(c => { if (c.obrigatorio) finalPrefs[c.chave] = true; });
    salvarPreferencias(finalPrefs);
  };

  const toggleCategoria = (chave: string) => {
    if (categorias.find(c => c.chave === chave)?.obrigatorio) return;
    setPreferences(prev => ({ ...prev, [chave]: !prev[chave] }));
  };

  if (!showBanner) return null;

  const titulo = config?.titulo || 'Política de Cookies e Privacidade';
  const texto = config?.texto || 'Utilizamos cookies para melhorar sua experiência e garantir a segurança do sistema, em conformidade com a LGPD (Lei 13.709/2018).';
  const btnAceitar = config?.textoBotaoAceitar || 'Aceitar Todos';
  const btnRejeitar = config?.textoBotaoRejeitar || 'Rejeitar Todos';
  const btnPersonalizar = config?.textoBotaoPersonalizar || 'Personalizar';
  const descricaoGerenciamento = config?.textoDescricaoGerenciamento || 'Escolha quais tipos de cookies você deseja aceitar.';

  return (
    <>
      {/* Banner Principal */}
      <div
        className={`fixed bottom-0 left-0 right-0 z-[9998] transition-transform duration-300 ${
          isVisible ? 'translate-y-0' : 'translate-y-full'
        }`}
      >
        <div className="mx-auto max-w-5xl mb-4 px-4">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 sm:p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              {/* Ícone */}
              <div className="flex-shrink-0 bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-900/40 dark:to-orange-900/40 rounded-xl p-2.5">
                <Cookie className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>

              {/* Texto */}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm mb-0.5">{titulo}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  {texto}{' '}
                  <button onClick={onOpenTermos} className="text-amber-600 dark:text-amber-400 hover:underline font-medium">
                    Termos de Uso
                  </button>{' '}
                  e{' '}
                  <button onClick={onOpenPolitica} className="text-amber-600 dark:text-amber-400 hover:underline font-medium">
                    Política de Privacidade
                  </button>.
                </p>
              </div>

              {/* Botões */}
              <div className="flex flex-wrap gap-2 flex-shrink-0 w-full sm:w-auto">
                <button
                  onClick={handleRejeitarTodos}
                  className="flex-1 sm:flex-none px-3 py-2 text-xs font-medium rounded-xl border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  {btnRejeitar}
                </button>
                <button
                  onClick={() => setShowModal(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-2 text-xs font-medium rounded-xl border border-amber-300 dark:border-amber-600 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                >
                  <Settings className="h-3.5 w-3.5" />
                  {btnPersonalizar}
                </button>
                <button
                  onClick={handleAceitarTodos}
                  className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md transition-all"
                >
                  {btnAceitar}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Personalização */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/60 dark:bg-black/75 flex items-end sm:items-center justify-center z-[9999] p-4"
          onClick={fecharModal}
        >
          <div
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg max-h-[85vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="bg-amber-100 dark:bg-amber-900/40 rounded-lg p-1.5">
                  <Shield className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                </div>
                <h3 className="font-bold text-gray-900 dark:text-gray-100 text-base">Gerenciar Cookies</h3>
              </div>
              <button
                onClick={fecharModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Conteúdo */}
            <div className="overflow-y-auto flex-1 px-5 py-4">
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                {descricaoGerenciamento}
              </p>

              <div className="space-y-3">
                {categorias.map(cat => (
                  <div
                    key={cat.chave}
                    className="border border-gray-100 dark:border-gray-800 rounded-xl overflow-hidden"
                  >
                    <div className="flex items-center justify-between p-3.5 bg-gray-50/50 dark:bg-gray-800/50">
                      <button
                        onClick={() => setExpandedCategoria(expandedCategoria === cat.chave ? null : cat.chave)}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        {expandedCategoria === cat.chave
                          ? <ChevronUp className="h-4 w-4 text-gray-400 flex-shrink-0" />
                          : <ChevronDown className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        }
                        <span className="text-sm font-medium text-gray-800 dark:text-gray-200">{cat.nome}</span>
                        {cat.obrigatorio && (
                          <span className="text-xs bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium ml-1">
                            Necessário
                          </span>
                        )}
                      </button>

                      {/* Toggle */}
                      <button
                        onClick={() => toggleCategoria(cat.chave)}
                        disabled={cat.obrigatorio}
                        className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors flex-shrink-0 ml-3 ${
                          cat.obrigatorio
                            ? 'cursor-not-allowed opacity-60'
                            : 'cursor-pointer'
                        } ${
                          preferences[cat.chave]
                            ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                            : 'bg-gray-200 dark:bg-gray-700'
                        }`}
                        aria-label={`${preferences[cat.chave] ? 'Desativar' : 'Ativar'} ${cat.nome}`}
                      >
                        <span
                          className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow transition-transform ${
                            preferences[cat.chave] ? 'translate-x-4' : 'translate-x-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {expandedCategoria === cat.chave && (
                      <div className="px-4 pb-3.5 pt-2.5 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                        {cat.descricao}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-gray-800 flex-shrink-0">
              <button
                onClick={handleRejeitarTodos}
                className="flex-1 px-3 py-2.5 text-sm font-medium rounded-xl border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
              >
                {btnRejeitar}
              </button>
              <button
                onClick={handleSalvarPersonalizados}
                className="flex-1 px-3 py-2.5 text-sm font-semibold rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-md transition-all"
              >
                Salvar Preferências
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CookieBanner;
