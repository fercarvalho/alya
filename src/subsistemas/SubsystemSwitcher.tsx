import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as LucideIcons from 'lucide-react';
import { Layers, ChevronDown, ArrowLeft, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import {
  SUBSYSTEMS,
  buildSubsystemUrl,
  supportsSubdomainNavigation,
  getRootUrl,
  setSubsystemOverride,
  clearSubsystemOverride,
  userCanAccessSubsystem,
  type SubsystemDefinition,
} from './manifest';

interface Props {
  current: SubsystemDefinition;
}

/**
 * Dropdown de troca de módulo (espelho do impgeo).
 *
 * Comportamento:
 *   - Botão pai exibe o módulo atual com ícone, nome e chevron.
 *   - Click → dropdown com lista dos outros módulos acessíveis +
 *     indicador do atual + item "Trocar de módulo" (vermelho discreto).
 *   - Fechamento: click fora, ESC, ou ao escolher um item.
 *   - Em ambiente com subdomínio: window.location.href = buildSubsystemUrl(slug)
 *   - Em localhost puro: setSubsystemOverride(slug) + custom event.
 */
export default function SubsystemSwitcher({ current }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [navigatingTo, setNavigatingTo] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  // Ref para o dropdown portalizado — fora da árvore de containerRef. Sem
  // isso o handler de click-fora abaixo fecharia o menu ao clicar nele.
  const menuRef = useRef<HTMLDivElement>(null);
  // Posição absoluta na viewport para o dropdown portalizado (ver comentário
  // junto ao createPortal abaixo). Recalculada ao abrir, e em scroll/resize
  // pra acompanhar o botão se o usuário rolar a página com o menu aberto.
  const [menuRect, setMenuRect] = useState<{ top: number; right: number } | null>(null);

  const updateRect = useCallback(() => {
    if (!buttonRef.current) return;
    const r = buttonRef.current.getBoundingClientRect();
    setMenuRect({
      top: r.bottom + 8, // 8px = mt-2 equivalente
      right: window.innerWidth - r.right,
    });
  }, []);

  useEffect(() => {
    if (!open) {
      setMenuRect(null);
      return;
    }
    updateRect();
    window.addEventListener('scroll', updateRect, true);
    window.addEventListener('resize', updateRect);
    return () => {
      window.removeEventListener('scroll', updateRect, true);
      window.removeEventListener('resize', updateRect);
    };
  }, [open, updateRect]);

  const accessible = useMemo<SubsystemDefinition[]>(
    () => SUBSYSTEMS.filter(sub => userCanAccessSubsystem(user, sub)),
    [user]
  );

  const others = useMemo(
    () => accessible.filter(s => s.key !== current.key),
    [accessible, current.key]
  );

  // Click fora fecha — considera container (botão) E menu portalizado.
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inMenu = menuRef.current?.contains(target);
      if (!inContainer && !inMenu) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  // ESC fecha + retorna foco para o botão
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  const goTo = useCallback((sub: SubsystemDefinition) => {
    if (navigatingTo) return;
    setNavigatingTo(sub.slug);
    if (supportsSubdomainNavigation()) {
      window.location.href = buildSubsystemUrl(sub.slug);
    } else {
      setSubsystemOverride(sub.slug);
      window.dispatchEvent(new CustomEvent('subsystem:override-changed'));
      setOpen(false);
    }
  }, [navigatingTo]);

  const goBack = useCallback(() => {
    if (navigatingTo) return;
    setNavigatingTo('__root__');
    if (supportsSubdomainNavigation()) {
      window.location.href = getRootUrl();
    } else {
      clearSubsystemOverride();
      window.dispatchEvent(new CustomEvent('subsystem:override-changed'));
      setOpen(false);
    }
  }, [navigatingTo]);

  const renderIcon = (iconName: string, sizeClass = 'h-5 w-5') => {
    const Icon = (LucideIcons as unknown as Record<string, React.ElementType>)[iconName]
      ?? LucideIcons.Layers;
    return <Icon className={sizeClass} aria-hidden="true" />;
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        onClick={() => setOpen(o => !o)}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        title={`Trocar subsistema (atual: ${current.name})`}
        className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors border whitespace-nowrap
          ${open
            ? 'bg-amber-100 border-amber-300 text-amber-900 dark:bg-amber-900/40 dark:border-amber-700 dark:text-amber-100'
            : 'bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 hover:border-amber-300 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/40'}
          focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-1`}
      >
        <Layers className="h-4 w-4" aria-hidden="true" />
        <span className="hidden sm:inline text-sm font-medium">{current.name}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {/* Dropdown via portal — o header do alya tem `overflow-x-auto`
          (necessário pra rolagem horizontal de menus em viewports estreitos),
          que cria contexto de clipping também no eixo Y e cortaria o menu
          por baixo. Portalizando pra document.body o dropdown escapa
          qualquer parent com overflow/transform/contain. Posição é
          recomputada via getBoundingClientRect em updateRect(). */}
      {open && menuRect && createPortal(
        <div
          ref={menuRef}
          role="menu"
          style={{ position: 'fixed', top: menuRect.top, right: menuRect.right }}
          className="w-80 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-[10050] overflow-hidden"
        >
          {others.length > 0 && (
            <>
              <div className="px-4 pt-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Outros subsistemas
              </div>
              <ul className="pb-1">
                {others.map(sub => {
                  const isNav = navigatingTo === sub.slug;
                  return (
                    <li key={sub.key}>
                      <button
                        role="menuitem"
                        type="button"
                        onClick={() => goTo(sub)}
                        disabled={navigatingTo !== null}
                        className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors
                          ${isNav
                            ? 'bg-blue-50 dark:bg-blue-900/20 cursor-wait'
                            : navigatingTo
                              ? 'opacity-50 cursor-not-allowed'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}
                      >
                        <div className={`flex-shrink-0 w-9 h-9 rounded-md flex items-center justify-center ${sub.palette.iconBg} ${sub.palette.iconText}`}>
                          {isNav
                            ? <LucideIcons.Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                            : renderIcon(sub.iconName)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                            {sub.name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">
                            {isNav ? `Entrando em ${sub.name}…` : sub.description}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
              <div className="border-t border-gray-200 dark:border-gray-700" />
            </>
          )}

          {/* Indicador do módulo atual */}
          <div className="px-4 py-2 flex items-center gap-3 bg-gray-50 dark:bg-gray-900/40">
            <div className={`flex-shrink-0 w-7 h-7 rounded-md flex items-center justify-center ${current.palette.iconBg} ${current.palette.iconText}`}>
              {renderIcon(current.iconName, 'h-4 w-4')}
            </div>
            <div className="flex-1 min-w-0 text-xs text-gray-600 dark:text-gray-400">
              Você está em <span className="font-semibold text-gray-800 dark:text-gray-200">{current.name}</span>
            </div>
            <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          </div>

          <div className="border-t border-gray-200 dark:border-gray-700" />

          <button
            role="menuitem"
            type="button"
            onClick={goBack}
            disabled={navigatingTo !== null}
            className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors group
              ${navigatingTo === '__root__'
                ? 'bg-red-50 dark:bg-red-900/20 cursor-wait'
                : navigatingTo
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-red-50 dark:hover:bg-red-900/20'}`}
          >
            <div
              className={`flex-shrink-0 w-9 h-9 rounded-md flex items-center justify-center transition-colors
                bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300
                group-hover:bg-red-100 dark:group-hover:bg-red-900/50`}
            >
              {navigatingTo === '__root__'
                ? <LucideIcons.Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                : <ArrowLeft className="h-5 w-5" aria-hidden="true" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-red-700 dark:text-red-400">
                {navigatingTo === '__root__' ? 'Voltando…' : 'Trocar de subsistema'}
              </div>
              <div className="text-xs text-red-600 dark:text-red-300 line-clamp-1">
                {navigatingTo === '__root__'
                  ? 'Levando você de volta à tela de escolha'
                  : 'Voltar para a tela de escolha de subsistema'}
              </div>
            </div>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
}
