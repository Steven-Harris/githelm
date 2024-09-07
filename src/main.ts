import { Firebase } from './modules/firebase.ts';
import { initSite } from './modules/ui.js';
import { initPWA } from './pwa.ts'
import './style.css'

const firebase = new Firebase();
document.addEventListener("DOMContentLoaded", async function () {
    await initSite(firebase);
    initPWA(document.getElementById('app')!);
});
