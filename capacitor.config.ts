import type { CapacitorConfig } from '@capacitor/cli';

// APK de test uniquement : si BD_LIVE_URL est défini au moment du « cap sync », l'appli charge le jeu depuis
// cette adresse (version en ligne protégée par un code) et se met donc à jour toute seule.
// Sans cette variable (Play Store, build local), le jeu est embarqué dans l'appli comme avant.
const liveUrl = process.env.BD_LIVE_URL;
// Clé secrète que l'appli de test présente au site pour entrer sans code à taper (voir middleware.ts).
const appKey = process.env.BD_APP_KEY;

const config: CapacitorConfig = {
  appId: 'fr.solvelab.bistrodonjon',
  appName: 'Bistro Donjon',
  webDir: 'dist',
  android: { backgroundColor: '#000000' },
  ...(liveUrl ? { server: { url: liveUrl } } : {}),
  ...(liveUrl && appKey ? { appendUserAgent: ` BistroDonjonApp/${appKey}` } : {}),
};

export default config;
