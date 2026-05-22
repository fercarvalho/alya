// Captura e gating do prompt nativo de instalação do PWA.
//
// O evento 'beforeinstallprompt' dispara só uma vez e precisa de
// preventDefault() imediato pra ser usado depois. Capturamos no boot,
// guardamos, e disponibilizamos via API.
//
// Política do alya: prompt SÓ liberado pós-login. Sem usuário autenticado,
// canPromptNow() retorna false (espelha o padrão usado no tc-public do impgeo).
// Como alya é single-origin e o login é obrigatório, sem isso o banner
// apareceria já na tela de login — preferimos só convidar depois.

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

let deferredPrompt: BeforeInstallPromptEvent | null = null
let isAuthenticated = false

const PWA_INSTALL_EVENT = 'pwa-install-eligible'
const PWA_INSTALLED_EVENT = 'pwa-installed'
const PWA_PROMPT_RESOLVED_EVENT = 'pwa-prompt-resolved'

export function setupInstallPrompt(): void {
  if (typeof window === 'undefined') return

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e as BeforeInstallPromptEvent
    if (canPromptNow()) {
      window.dispatchEvent(new Event(PWA_INSTALL_EVENT))
    }
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    window.dispatchEvent(new Event(PWA_INSTALLED_EVENT))
  })
}

/** Chamado pelo AuthContext quando o usuário loga/desloga. */
export function setAuthState(authenticated: boolean): void {
  const wasAuth = isAuthenticated
  isAuthenticated = authenticated
  if (!wasAuth && authenticated && deferredPrompt && canPromptNow()) {
    window.dispatchEvent(new Event(PWA_INSTALL_EVENT))
  }
}

function canPromptNow(): boolean {
  return isAuthenticated
}

export function canInstall(): boolean {
  return deferredPrompt !== null && canPromptNow()
}

export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  if (!deferredPrompt || !canPromptNow()) return 'unavailable'
  try {
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    deferredPrompt = null
    window.dispatchEvent(new Event(PWA_PROMPT_RESOLVED_EVENT))
    return choice.outcome
  } catch {
    return 'unavailable'
  }
}

export const PWA_EVENTS = {
  installEligible: PWA_INSTALL_EVENT,
  installed: PWA_INSTALLED_EVENT,
  promptResolved: PWA_PROMPT_RESOLVED_EVENT,
} as const

/**
 * Hook reativo — retorna true quando há prompt programático disponível
 * (beforeinstallprompt capturado E usuário autenticado). Re-renderiza
 * quando o evento chega depois da montagem, quando o app é instalado, ou
 * quando o usuário confirma/dispensa o prompt.
 */
export function useCanInstall(): boolean {
  const [can, setCan] = useState<boolean>(() => canInstall())
  useEffect(() => {
    const refresh = () => setCan(canInstall())
    window.addEventListener(PWA_INSTALL_EVENT, refresh)
    window.addEventListener(PWA_INSTALLED_EVENT, refresh)
    window.addEventListener(PWA_PROMPT_RESOLVED_EVENT, refresh)
    return () => {
      window.removeEventListener(PWA_INSTALL_EVENT, refresh)
      window.removeEventListener(PWA_INSTALLED_EVENT, refresh)
      window.removeEventListener(PWA_PROMPT_RESOLVED_EVENT, refresh)
    }
  }, [])
  return can
}

/** Hook reativo — true quando appinstalled disparou nesta sessão. */
export function useWasJustInstalled(): boolean {
  const [installed, setInstalled] = useState(false)
  useEffect(() => {
    const onInstalled = () => setInstalled(true)
    window.addEventListener(PWA_INSTALLED_EVENT, onInstalled)
    return () => window.removeEventListener(PWA_INSTALLED_EVENT, onInstalled)
  }, [])
  return installed
}
