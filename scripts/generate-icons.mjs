#!/usr/bin/env node
// Gera todos os PNGs de PWA do alya a partir de public/logo_pwa.png.
// Determinístico — committar a saída.
//
// Uso:  node scripts/generate-icons.mjs   (ou: npm run pwa:icons)
// Requer: sharp (devDependency); logo_pwa.png em public/ (idealmente
//         quadrado, 1024×1024+; senão fica com padding extra).
//
// Outputs em public/icons/:
//   icon-192.png            — manifest, purpose: any
//   icon-512.png            — manifest, purpose: any
//   maskable-192.png        — purpose: maskable (safe zone ~18%)
//   maskable-512.png        — purpose: maskable
//   apple-touch-icon-180.png — iOS home screen (NÃO maskable)
//   splash-{6 sizes}.png    — iOS apple-touch-startup-image
//
// Se logo_pwa.png não existir ainda, o script avisa e pula sem erro
// (CI continua passando até o asset estar disponível).

import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import sharp from 'sharp'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(__dirname, '..')
const PUBLIC_DIR = path.join(ROOT, 'public')

const SOURCE = path.join(PUBLIC_DIR, 'logo_pwa.png')
const OUT_DIR = path.join(PUBLIC_DIR, 'icons')

// Marca alya: amber-500 #f59e0b, background warm #fffbeb.
const BG_LIGHT = '#ffffff'      // ícones "any" (fundo neutro pra OS escolher)
const BG_BRAND = '#f59e0b'      // maskable (fundo de marca pra preencher safe zone)
const SPLASH_BG = '#fffbeb'     // splash iOS (combina com background_color do manifest)

const ICON_SIZES = [192, 512]
const APPLE_TOUCH_SIZE = 180
const SPLASH_SIZES = [
  { w: 750,  h: 1334 },
  { w: 1125, h: 2436 },
  { w: 1242, h: 2688 },
  { w: 1170, h: 2532 },
  { w: 1290, h: 2796 },
  { w: 1668, h: 2388 },
]

async function ensureDir(dir) {
  await fs.mkdir(dir, { recursive: true })
}

function hexToRgb(hex) {
  const m = hex.replace('#', '')
  const n = parseInt(m, 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}

async function loadSource(src) {
  return sharp(src).png().toBuffer()
}

async function renderIcon({ srcBuffer, size, bg, padding = 0.1 }) {
  const inner = Math.round(size * (1 - padding * 2))
  const offset = Math.round((size - inner) / 2)
  const fg = await sharp(srcBuffer)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  const { r, g, b } = hexToRgb(bg)
  return sharp({ create: { width: size, height: size, channels: 4, background: { r, g, b, alpha: 1 } } })
    .composite([{ input: fg, top: offset, left: offset }])
    .png()
    .toBuffer()
}

async function renderTransparentIcon({ srcBuffer, size }) {
  // apple-touch-icon prefere ícone sem transparência mas com aspect square.
  return sharp(srcBuffer)
    .resize(size, size, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png()
    .toBuffer()
}

async function renderSplash({ srcBuffer, w, h, bg }) {
  const inner = Math.round(Math.min(w, h) * 0.35)
  const fg = await sharp(srcBuffer)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer()
  const { r, g, b } = hexToRgb(bg)
  const left = Math.round((w - inner) / 2)
  const top = Math.round((h - inner) / 2)
  return sharp({ create: { width: w, height: h, channels: 4, background: { r, g, b, alpha: 1 } } })
    .composite([{ input: fg, top, left }])
    .png()
    .toBuffer()
}

async function main() {
  try {
    await fs.access(SOURCE)
  } catch {
    console.warn(`[skip] fonte não encontrada: ${SOURCE}`)
    console.warn('       crie public/logo_pwa.png (quadrado, idealmente 1024+×1024+) e rode de novo.')
    return
  }

  await ensureDir(OUT_DIR)
  const srcBuffer = await loadSource(SOURCE)

  console.log(`[alya] gerando ícones em ${OUT_DIR}`)

  // any: fundo branco, padding mínimo (5%)
  for (const size of ICON_SIZES) {
    const icon = await renderIcon({ srcBuffer, size, bg: BG_LIGHT, padding: 0.05 })
    await fs.writeFile(path.join(OUT_DIR, `icon-${size}.png`), icon)
  }

  // maskable: fundo amber (marca), padding maior (18%) pra respeitar safe zone
  for (const size of ICON_SIZES) {
    const maskable = await renderIcon({ srcBuffer, size, bg: BG_BRAND, padding: 0.18 })
    await fs.writeFile(path.join(OUT_DIR, `maskable-${size}.png`), maskable)
  }

  // apple-touch-icon: sem máscara, fundo branco
  const apple = await renderTransparentIcon({ srcBuffer, size: APPLE_TOUCH_SIZE })
  await fs.writeFile(path.join(OUT_DIR, `apple-touch-icon-180.png`), apple)

  // splash iOS: fundo warm (#fffbeb), logo centralizado a 35% do menor lado
  for (const { w, h } of SPLASH_SIZES) {
    const splash = await renderSplash({ srcBuffer, w, h, bg: SPLASH_BG })
    await fs.writeFile(path.join(OUT_DIR, `splash-${w}x${h}.png`), splash)
  }

  console.log(`✓ ${ICON_SIZES.length * 2 + 1 + SPLASH_SIZES.length} arquivos gerados.`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
