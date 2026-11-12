import react from '@vitejs/plugin-react'
import { createHash } from 'node:crypto'
import { defineConfig, type Plugin } from 'vite'

/**
 * Skapar en liten service worker som cachar alla byggda filer,
 * så att appen fungerar utan täckning vid planen.
 */
function offline(): Plugin {
  return {
    name: 'wik-offline',
    apply: 'build',
    generateBundle(_opts, bundle) {
      const files = ['./', ...Object.keys(bundle).filter((f) => !f.endsWith('.map')), 'manifest.webmanifest', 'crest.png', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png']
      const version = createHash('sha1').update(files.join('|')).digest('hex').slice(0, 10)
      const source = `const CACHE = 'wik-${version}'
const FILES = ${JSON.stringify(files)}
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()))
})
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('wik-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  )
})
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== self.location.origin) return
  e.respondWith(
    caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || fetch(e.request).catch(() => caches.match('./'))),
  )
})
`
      this.emitFile({ type: 'asset', fileName: 'sw.js', source })
    },
  }
}

// Relativ bas så att appen fungerar under valfri adress, t.ex. GitHub Pages.
export default defineConfig({
  base: './',
  plugins: [react(), offline()],
})
