// Banner que convida o usuário a instalar o PWA do Alya.
//
// Comportamento:
//   - Não aparece se o PWA já está instalado (display-mode: standalone, etc.)
//   - Não aparece se foi instalado nesta sessão (appinstalled event)
//   - Não aparece se foi dispensado recentemente (TTL 7 dias em localStorage)
//   - Não aparece em hosts de demo (alya.fercarvalho.com, github.io)
//   - Não aparece se a estratégia é 'unknown'
//   - Não aparece se o usuário não está autenticado (gating via installPrompt)
//   - Botão de ação muda conforme OS/browser:
//       * 'auto'              → "Instalar app" (dispara prompt nativo)
//       * 'ios-safari'        → "Como instalar no iPhone" (abre modal)
//       * 'macos-safari'      → "Como instalar no Mac" (abre modal)
//       * 'ios-other-browser' → "Como instalar no iPhone" (abre modal explicando Safari)
//       * 'android-firefox'   → "Como instalar" (abre modal)
//       * 'unsupported'       → "Saiba mais" (abre modal com sugestão de browser)
//
// Cancelar no prompt nativo NÃO conta como dispensa permanente — apenas
// "agora não". Dispensa de 7 dias só ocorre via clique explícito no X.

import React, { useMemo, useState } from 'react'
import { Download, Smartphone, Monitor, X } from 'lucide-react'
import {
  detectInstallCapabilities,
  type InstallCapabilities,
  type InstallStrategy,
} from '../pwa/installCapabilities'
import { promptInstall, useCanInstall, useWasJustInstalled } from '../pwa/installPrompt'
import PwaInstallHowToModal from './PwaInstallHowToModal'

const DISMISS_KEY = 'pwa-install-banner-dismissed-at'
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7 dias

function isRecentlyDismissed(): boolean {
  try {
    const raw = localStorage.getItem(DISMISS_KEY)
    if (!raw) return false
    const ts = Number(raw)
    if (!Number.isFinite(ts)) return false
    return (Date.now() - ts) < DISMISS_TTL_MS
  } catch {
    return false
  }
}

function dismissNow(): void {
  try { localStorage.setItem(DISMISS_KEY, String(Date.now())) } catch { /* storage bloqueado */ }
}

interface ButtonConfig {
  label: string
  icon: React.ReactNode
  /** true → dispara prompt programático; false → abre modal de instruções. */
  isProgrammatic: boolean
}

function getButtonConfig(strategy: InstallStrategy): ButtonConfig | null {
  switch (strategy) {
    case 'auto':
      return { label: 'Instalar app', icon: <Download className="w-4 h-4" />, isProgrammatic: true }
    case 'ios-safari':
      return { label: 'Como instalar no iPhone', icon: <Smartphone className="w-4 h-4" />, isProgrammatic: false }
    case 'macos-safari':
      return { label: 'Como instalar no Mac', icon: <Monitor className="w-4 h-4" />, isProgrammatic: false }
    case 'ios-other-browser':
      return { label: 'Como instalar no iPhone', icon: <Smartphone className="w-4 h-4" />, isProgrammatic: false }
    case 'android-firefox':
      return { label: 'Como instalar', icon: <Smartphone className="w-4 h-4" />, isProgrammatic: false }
    case 'unsupported':
      return { label: 'Saiba mais', icon: <Monitor className="w-4 h-4" />, isProgrammatic: false }
    default:
      return null
  }
}

const PwaInstallBanner: React.FC = () => {
  // Capacidades não mudam em runtime (depende só do device/browser).
  const caps: InstallCapabilities = useMemo(() => detectInstallCapabilities(), [])
  const canInstallProgrammatic = useCanInstall()
  const wasJustInstalled = useWasJustInstalled()
  const [dismissed, setDismissed] = useState<boolean>(() => isRecentlyDismissed())
  const [showHowTo, setShowHowTo] = useState(false)

  // Atalho silencioso: roda standalone, é demo, foi dispensado, ou já instalou.
  if (caps.isStandalone || wasJustInstalled || dismissed) return null
  if (caps.strategy === 'installed' || caps.strategy === 'demo' || caps.strategy === 'unknown') return null

  const button = getButtonConfig(caps.strategy)
  if (!button) return null

  // 'auto' depende do beforeinstallprompt ter sido capturado pelo browser E
  // do usuário estar autenticado (gating em installPrompt.ts). Se ainda não,
  // não escondemos o banner — só mostramos o botão desabilitado com label
  // "Preparando…" até ficar pronto.
  const programmaticReady = caps.strategy === 'auto' ? canInstallProgrammatic : true

  const handleClick = async () => {
    if (button.isProgrammatic) {
      await promptInstall()
      // Não tratamos 'dismissed' como dispensa permanente — usuário pode ter
      // clicado em Cancelar por engano. O banner continua aparecendo (com
      // botão "Preparando…" até o browser re-disparar beforeinstallprompt
      // na próxima carga da página). Dispensa "definitiva" (7 dias) só
      // acontece quando o usuário clica explicitamente no X.
    } else {
      setShowHowTo(true)
    }
  }

  const handleDismiss = () => {
    dismissNow()
    setDismissed(true)
  }

  return (
    <>
      <div
        className="mb-6 rounded-xl border border-amber-200 dark:border-amber-800/60 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/40 dark:to-orange-950/40 px-4 py-3 sm:px-5 sm:py-4 flex items-start gap-3 sm:gap-4 shadow-sm"
        role="region"
        aria-label="Convite para instalar o aplicativo"
      >
        <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-amber-500 dark:bg-amber-600 text-white flex items-center justify-center">
          <Download className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm sm:text-base font-semibold text-gray-900 dark:text-gray-100">
            Instale o Alya como aplicativo
          </p>
          <p className="mt-0.5 text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
            Acesso rápido pela tela inicial, abre em janela própria e funciona melhor offline.
          </p>
        </div>

        <div className="flex-shrink-0 flex items-center gap-2">
          <button
            onClick={handleClick}
            disabled={!programmaticReady}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg bg-amber-500 hover:bg-amber-600 disabled:bg-amber-300 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-medium shadow-sm transition-colors"
          >
            {button.icon}
            <span className="hidden sm:inline">{programmaticReady ? button.label : 'Preparando…'}</span>
            <span className="sm:hidden">{programmaticReady ? 'Instalar' : '…'}</span>
          </button>
          <button
            onClick={handleDismiss}
            className="p-1.5 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-white/60 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-800/60"
            aria-label="Dispensar por 7 dias"
            title="Dispensar por 7 dias"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <PwaInstallHowToModal
        isOpen={showHowTo}
        strategy={caps.strategy}
        onClose={() => setShowHowTo(false)}
      />
    </>
  )
}

export default PwaInstallBanner
