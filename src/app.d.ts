import 'vite-plugin-pwa/info';
import 'vite-plugin-pwa/pwa-assets';
import 'vite-plugin-pwa/svelte';

declare global {
  declare const __DATE__: string;
  declare const __RELOAD_SW__: boolean;
  namespace App {
    interface Locals {
      userid: string;
      buildDate: string;
      periodicUpdates: boolean;
    }
  }
}

export {};
