import { useMemo, useState } from 'react';
import * as LucideIcons from 'lucide-react';
import { LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import MenuUsuario from '../components/MenuUsuario';
import NotificationBell from '../components/NotificationBell';
import ImpersonationBanner from '../components/ImpersonationBanner';
import Footer from '../components/Footer';
import FeedbackButton from '../components/FeedbackButton';
import {
  SUBSYSTEMS,
  buildSubsystemUrl,
  supportsSubdomainNavigation,
  userCanAccessSubsystem,
  type SubsystemDefinition,
} from './manifest';
import { useCurrentSubsystem } from './useCurrentSubsystem';

/**
 * Tela inicial pós-login no domínio raiz.
 *
 * Layout:
 *   - ImpersonationBanner (quando ativo) acima de tudo.
 *   - Header com a mesma identidade visual do header principal do alya:
 *     fundo creme translúcido + borda âmbar + logo Alya + título gradient
 *     âmbar→laranja + MenuUsuario + Sair vermelho. SEM barra de módulos
 *     (esse é o ponto da tela — escolher antes de ver).
 *   - Fundo: gradient âmbar/laranja/amarelo claro, espelhando o body do
 *     AppContent.
 *   - Conteúdo: grid de cards (1 col mobile, 2 col tablet, 3 col desktop)
 *     com paleta de cor própria por subsistema.
 *
 * Comportamento:
 *   - Click num card → spinner local + window.location.href (subdomínio)
 *     ou setSubsystem(slug) (localhost via sessionStorage).
 *   - Múltiplos clicks ignorados durante navegação.
 */
export default function SubsystemPicker() {
  const { user, logout } = useAuth();
  const { setSubsystem } = useCurrentSubsystem();
  const canUseSubdomain = useMemo(() => supportsSubdomainNavigation(), []);
  const [enteringSlug, setEnteringSlug] = useState<string | null>(null);

  // Mesmo critério usado em AppContent (mantido inline para não acoplar
  // a uma exportação só pra isso). Em prod normal isDemoMode é false.
  const isDemoMode =
    typeof window !== 'undefined' &&
    (import.meta.env.VITE_DEMO_MODE === 'true' ||
      window.location.hostname === 'alya.fercarvalho.com' ||
      window.location.hostname.includes('github.io') ||
      window.location.hostname.includes('demo'));

  const visibleSubsystems = useMemo<SubsystemDefinition[]>(
    () => SUBSYSTEMS.filter(sub => userCanAccessSubsystem(user, sub)),
    [user]
  );

  const handleSelect = (sub: SubsystemDefinition) => {
    if (enteringSlug) return;
    setEnteringSlug(sub.slug);
    if (canUseSubdomain) {
      window.location.href = buildSubsystemUrl(sub.slug);
    } else {
      // localhost: só re-renderiza, sem F5 — por isso não pintamos loading muito.
      setSubsystem(sub.slug);
    }
  };

  const renderIcon = (iconName: string, sizeClass = 'h-7 w-7') => {
    const Icon = (LucideIcons as unknown as Record<string, React.ElementType>)[iconName]
      ?? LucideIcons.Layers;
    return <Icon className={sizeClass} aria-hidden="true" />;
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <ImpersonationBanner />

      {/* Header idêntico ao do AppContent (mesma identidade visual da Alya):
          fundo creme translúcido com blur, borda âmbar, logo + título
          gradient âmbar→laranja. Sem botão de "voltar pro Picker" aqui — já
          ESTAMOS no Picker. */}
      <header className="bg-white/95 backdrop-blur-md shadow-sm border-b border-amber-200 dark:bg-gray-900/95 dark:border-amber-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-3 overflow-x-auto scrollbar-hide">
            <div className="flex items-center min-w-max flex-shrink-0">
              <img
                src={isDemoMode ? '/app/alya-logo.png' : '/alya-logo.png'}
                alt="Alya Velas Logo"
                className="w-10 h-10 mr-3 rounded-lg shadow-sm object-contain"
              />
              <div className="min-w-0 flex-shrink">
                <h1 className="text-xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent whitespace-nowrap">
                  Alya Velas
                </h1>
                <p className="text-sm text-amber-600/70 font-medium break-words">
                  Sistema de Gestão Inteligente
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 min-w-max flex-shrink-0 ml-4">
              <NotificationBell />
              <MenuUsuario />
              <button
                onClick={logout}
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm whitespace-nowrap"
                title="Sair"
              >
                <LogOut className="w-4 h-4" />
                <span className="text-sm font-medium">Sair</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 min-h-screen max-w-5xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-12">
        <header className="mb-8 sm:mb-10">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2">
            Escolha um Subsistema
          </h1>
          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-2xl">
            {canUseSubdomain
              ? 'Cada subsistema vive em seu próprio subdomínio. Você pode trocar a qualquer momento pelo dropdown de subsistema no header.'
              : 'Em desenvolvimento local sem subdomínios — a escolha fica nesta aba do navegador. Em produção, cada subsistema terá seu próprio subdomínio.'}
          </p>
        </header>

        {visibleSubsystems.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-10 text-center shadow-sm">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 mb-4">
              <LucideIcons.Lock className="h-7 w-7 text-gray-400 dark:text-gray-500" aria-hidden="true" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Nenhum subsistema disponível
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 max-w-md mx-auto">
              O seu perfil ainda não tem acesso a nenhum subsistema. Fale com um administrador
              se precisa de acesso.
            </p>
          </div>
        ) : (
          <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
            {visibleSubsystems.map(sub => {
              const isEntering = enteringSlug === sub.slug;
              const isAnyEntering = enteringSlug !== null;
              const palette = sub.palette;

              const cardClasses = [
                'group w-full h-full text-left bg-white dark:bg-gray-800 rounded-xl shadow-sm transition-all duration-150',
                'border border-gray-200 dark:border-gray-700',
                'border-l-4', palette.accentBorder,
                'p-5 sm:p-6 flex items-start gap-4',
                'focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-gray-900',
                isEntering
                  ? `${palette.activeBorder} ${palette.activeRing} cursor-wait`
                  : isAnyEntering
                    ? 'opacity-50 cursor-not-allowed'
                    : `${palette.hoverBorder} ${palette.hoverRing} hover:ring-4 hover:shadow-md`,
              ].join(' ');

              return (
                <li key={sub.key} className="h-full">
                  <button
                    onClick={() => handleSelect(sub)}
                    type="button"
                    disabled={isAnyEntering}
                    className={cardClasses}
                  >
                    <div className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center ${palette.iconBg} ${palette.iconText}`}>
                      {isEntering
                        ? <LucideIcons.Loader2 className="h-7 w-7 animate-spin" aria-hidden="true" />
                        : renderIcon(sub.iconName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-base">
                          {sub.name}
                        </h3>
                        <span className="text-[11px] font-mono text-gray-400 dark:text-gray-500 whitespace-nowrap">
                          {sub.moduleKeys.length} módulo{sub.moduleKeys.length === 1 ? '' : 's'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                        {isEntering ? `Entrando em ${sub.name}…` : sub.description}
                      </p>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className="mt-8 text-xs text-gray-400 dark:text-gray-500 text-center">
          {visibleSubsystems.length > 0 && (
            <>Logado como <span className="font-medium text-gray-600 dark:text-gray-300">{user?.firstName ?? user?.username}</span> ({user?.role}).</>
          )}
        </p>
      </main>

      <Footer />

      <FeedbackButton paginaAtual="escolher_modulo" />
    </div>
  );
}
