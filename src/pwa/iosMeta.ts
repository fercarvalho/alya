// iOS Safari ignora boa parte do manifest.webmanifest e exige meta tags
// próprias pra suportar PWA decente: capacidade standalone, status bar style,
// nome curto na home screen, ícone touch e splash screens por device.
//
// alya é single-origin, então o conteúdo aqui é estático ("Alya" sempre).
// Ícones ficam em /icons/ na raiz.

const APP_TITLE = 'Alya'
const THEME_COLOR = '#f59e0b' // amber-500 (marca alya)
const ICON_DIR = '/icons'

const SPLASH_SIZES: Array<{ w: number; h: number; ratio: number }> = [
  { w: 750,  h: 1334, ratio: 2 },   // iPhone 8 / SE 2
  { w: 1125, h: 2436, ratio: 3 },   // iPhone X / XS / 11 Pro
  { w: 1242, h: 2688, ratio: 3 },   // iPhone XS Max / 11 Pro Max
  { w: 1170, h: 2532, ratio: 3 },   // iPhone 12-15
  { w: 1290, h: 2796, ratio: 3 },   // iPhone 14/15 Pro Max
  { w: 1668, h: 2388, ratio: 2 },   // iPad Pro 11
]

function setMeta(name: string, content: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.name = name
    document.head.appendChild(el)
  }
  el.content = content
}

function setLink(rel: string, href: string, attrs: Record<string, string> = {}): void {
  const selector = Object.entries(attrs).reduce(
    (acc, [k, v]) => `${acc}[${k}="${v}"]`,
    `link[rel="${rel}"]`
  )
  let el = document.head.querySelector<HTMLLinkElement>(selector)
  if (!el) {
    el = document.createElement('link')
    el.rel = rel
    for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v)
    document.head.appendChild(el)
  }
  el.href = href
}

export function injectIosMeta(): void {
  if (typeof document === 'undefined') return

  // Algumas dessas já existem no index.html — setMeta é idempotente, só
  // atualiza/cria. Garante consistência se index.html mudar no futuro.
  setMeta('apple-mobile-web-app-capable', 'yes')
  setMeta('mobile-web-app-capable', 'yes')
  setMeta('apple-mobile-web-app-status-bar-style', 'black-translucent')
  setMeta('apple-mobile-web-app-title', APP_TITLE)
  setMeta('theme-color', THEME_COLOR)

  setLink('apple-touch-icon', `${ICON_DIR}/apple-touch-icon-180.png`, { sizes: '180x180' })

  for (const { w, h, ratio } of SPLASH_SIZES) {
    const orientation = w < h ? 'portrait' : 'landscape'
    const media = `(device-width: ${Math.round(w / ratio)}px) and (device-height: ${Math.round(h / ratio)}px) and (-webkit-device-pixel-ratio: ${ratio}) and (orientation: ${orientation})`
    setLink('apple-touch-startup-image', `${ICON_DIR}/splash-${w}x${h}.png`, { media })
  }
}
