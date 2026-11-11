import { defineConfig } from 'vite';

// Identifiant de cette construction du jeu. Il est écrit dans le code ET dans version.json :
// l'appli compare les deux pour savoir si une version plus récente est en ligne (voir src/core/update.ts).
const now = new Date();
const BUILD_ID = String(now.getTime());
const BUILD_LABEL = new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })
  .format(now)
  .replace(',', '');

export default defineConfig({
  base: './',
  build: { chunkSizeWarningLimit: 2000 },
  define: { __BUILD_ID__: JSON.stringify(BUILD_ID), __BUILD_LABEL__: JSON.stringify(BUILD_LABEL) },
  plugins: [
    {
      name: 'bistro-version',
      generateBundle() {
        this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify({ id: BUILD_ID, label: BUILD_LABEL }) });
      },
    },
  ],
});
