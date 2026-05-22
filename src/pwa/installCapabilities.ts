// Detecção de OS / browser e cálculo da estratégia de instalação do PWA.
//
// Cada combinação OS+browser exige uma UX diferente:
//
//   - Android Chrome / Edge / Samsung Internet → prompt programático via
//     beforeinstallprompt (estratégia 'auto')
//   - Android Firefox → menu do browser; precisamos instruir manualmente
//     ('android-firefox')
//   - iOS / iPadOS Safari → SEM beforeinstallprompt; precisa modal com
//     "Toque em Compartilhar → Adicionar à Tela de Início" ('ios-safari')
//   - iOS Chrome / Firefox / Edge → todos rodam sobre WebKit e não podem
//     instalar PWA; precisamos redirecionar pro Safari ('ios-other-browser')
//   - macOS Safari (17+) → "Arquivo → Adicionar ao Dock" ('macos-safari')
//   - macOS Chrome / Edge → prompt programático ('auto')
//   - macOS Firefox → não suporta PWA instalável ('unsupported')
//   - Windows / Linux Chrome / Edge → prompt programático ('auto')
//   - Windows / Linux Firefox → não suporta ('unsupported')
//
// Específico do alya: hosts de DEMO (alya.fercarvalho.com, *.github.io) NÃO
// mostram banner — são vitrine com dados de mock, instalar lá enganaria o
// visitante. Estratégia 'demo' é retornada nesses casos pra esconder a UI.
//
// Detecção de "já instalado":
//   - display-mode: standalone (PWA aberto via ícone)
//   - navigator.standalone === true (iOS Safari standalone)
//   - document.referrer começa com 'android-app://' (TWA)

import { isDemoHost } from './registerSW'

export type Platform = 'ios' | 'ipados' | 'android' | 'macos' | 'windows' | 'linux' | 'other'
export type Browser  = 'safari' | 'chrome' | 'edge' | 'firefox' | 'samsung' | 'other'

export type InstallStrategy =
  | 'installed'             // PWA já instalado / rodando standalone
  | 'demo'                  // host de demo — não mostra banner
  | 'auto'                  // beforeinstallprompt disponível
  | 'ios-safari'            // iOS/iPadOS Safari — modal Share → Adicionar à Tela
  | 'macos-safari'          // macOS Safari — modal Arquivo → Adicionar ao Dock
  | 'ios-other-browser'     // iOS Chrome/FF/Edge — instruir abrir no Safari
  | 'android-firefox'       // Android Firefox — instruir menu do browser
  | 'unsupported'           // Firefox desktop — não suporta install
  | 'unknown'               // não conseguiu detectar

export interface InstallCapabilities {
  platform: Platform
  browser: Browser
  isStandalone: boolean
  isDemo: boolean
  strategy: InstallStrategy
}

function detectPlatform(): Platform {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent || ''
  const platform = navigator.platform || ''
  const maxTouchPoints = navigator.maxTouchPoints || 0

  // iPadOS 13+ se identifica como Mac no userAgent — distingue por touch.
  if (platform === 'MacIntel' && maxTouchPoints > 1) return 'ipados'
  if (/iPad/.test(ua)) return 'ipados'
  if (/iPhone|iPod/.test(ua)) return 'ios'
  if (/Android/i.test(ua)) return 'android'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'macos'
  if (/Windows/i.test(ua)) return 'windows'
  if (/Linux/i.test(ua)) return 'linux'
  return 'other'
}

function detectBrowser(): Browser {
  if (typeof navigator === 'undefined') return 'other'
  const ua = navigator.userAgent || ''
  // Ordem importa — Edge contém "Chrome", Samsung contém "Chrome", etc.
  if (/Edg\//i.test(ua)) return 'edge'
  if (/SamsungBrowser/i.test(ua)) return 'samsung'
  if (/FxiOS|Firefox/i.test(ua)) return 'firefox'
  if (/CriOS/i.test(ua)) return 'chrome' // Chrome no iOS (WebKit, mas é "Chrome")
  if (/Chrome/i.test(ua) && !/OPR\//i.test(ua)) return 'chrome'
  if (/Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|Edg\//i.test(ua)) return 'safari'
  return 'other'
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (window.matchMedia?.('(display-mode: standalone)').matches) return true
  } catch { /* matchMedia indisponível */ }
  const navStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone
  if (navStandalone === true) return true
  if (document.referrer?.startsWith('android-app://')) return true
  return false
}

function deriveStrategy(
  platform: Platform,
  browser: Browser,
  isStandalone: boolean,
  isDemo: boolean
): InstallStrategy {
  if (isStandalone) return 'installed'
  // Demo: não mostra banner. Visitante de vitrine não precisa instalar mock.
  if (isDemo) return 'demo'

  // iOS / iPadOS: SÓ Safari real consegue instalar. Outros browsers no iOS
  // rodam sobre WebKit (sem APIs de install) e precisam abrir no Safari.
  if (platform === 'ios' || platform === 'ipados') {
    return browser === 'safari' ? 'ios-safari' : 'ios-other-browser'
  }

  if (platform === 'macos' && browser === 'safari') return 'macos-safari'
  if (platform === 'android' && browser === 'firefox') return 'android-firefox'

  if (browser === 'firefox' && (platform === 'macos' || platform === 'windows' || platform === 'linux')) {
    return 'unsupported'
  }

  if (browser === 'chrome' || browser === 'edge' || browser === 'samsung') {
    return 'auto'
  }

  return 'unknown'
}

export function detectInstallCapabilities(): InstallCapabilities {
  const platform = detectPlatform()
  const browser = detectBrowser()
  const isStandalone = detectStandalone()
  const isDemo = isDemoHost()
  const strategy = deriveStrategy(platform, browser, isStandalone, isDemo)
  return { platform, browser, isStandalone, isDemo, strategy }
}
