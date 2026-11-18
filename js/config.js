/**
 * Frontend Configuration & Runtime Settings
 * Abstracted for seamless deployment across local development, LAN Wi-Fi, and production cloud domains.
 */
window.APP_CONFIG = {
    // Dynamically resolves backend API base URL
    API_BASE: (() => {
        if (typeof window !== 'undefined' && window.location) {
            const proto = window.location.protocol;
            if (proto === 'http:' || proto === 'https:') {
                return window.location.origin;
            }
        }
        return 'http://localhost:8000';
    })(),

    VERSION: '3.0.0',
    APP_NAME: 'Dai Ichi Academy JFT-Basic CBT & Prometric Simulator',
    
    // Default timeouts & retries
    API_TIMEOUT_MS: 30000,
    
    // Default audio pause duration between dialogue turns
    DEFAULT_DIALOGUE_GAP_SEC: 0.6
};

console.log(`[JFT App] Config initialized. Backend API base: ${window.APP_CONFIG.API_BASE}`);
