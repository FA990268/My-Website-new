/**
 * Main Application Controller, Navigation, Router & UI State
 * Capsule navbar glider, hero slider, background/theme controls, and system initialization.
 */

// Global State & API Configuration
        const API_BASE = (window.location.protocol === 'http:' || window.location.protocol === 'https:')
            ? ''
            : 'http://localhost:8000';

        function resolveAudioUrl(rawUrl) {
            if(!rawUrl || typeof rawUrl !== 'string') return '';
            let url = rawUrl.trim().replace(/\\/g, '/');
            if(url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
                return url;
            }
            const fn = url.split('/').pop().trim();

            // 1. Stock single-letter audio (a.mp3 through i.mp3) physically stored as A.mp3 in assets/
            if(/^[a-iA-I]\.mp3$/i.test(fn)) {
                return `assets/${fn.toUpperCase()}`;
            }

            // 2. Dedicated API audio route (/api/audio/...)
            if(url.startsWith('/api/audio/') || url.startsWith('api/audio/')) {
                const clean = url.startsWith('/') ? url : `/${url}`;
                return `${API_BASE}${clean}`;
            }

            // 3. Audio routes (/audio/...)
            if(url.startsWith('/audio/') || url.startsWith('audio/')) {
                return `${API_BASE}/audio/${fn}`;
            }

            // 4. Unique turn audio files (turn_<id>_<hash>.mp3)
            if(fn.startsWith('turn_')) {
                return `${API_BASE}/api/audio/${fn}`;
            }

            // 5. Assets directory (/assets/...)
            if(url.startsWith('/assets/') || url.startsWith('assets/')) {
                return url.startsWith('/') ? url.slice(1) : url;
            }

            // 6. General fallback
            return `assets/${url.startsWith('/') ? url.slice(1) : url}`;
        }

        let allCbtExams = [];
        let activeCbtExam = null;
        let cbtQuestions = [];
        let cbtCurrentIdx = 0;
        let cbtAnswers = {};
        let cbtFlags = {};
        let cbtAudioPlays = {};
        let cbtTimerInterval = null;
        let time = 3600;

        // Dialogue Script & TTS State
        let parsedScripts = [];
        let speakerVoiceMap = {};
        let synthesizedScripts = [];
        let availableVoices = [];
        let currentPlayingTurnId = null;

        // Network State
        let networkInfo = { primary_lan_url: window.location.origin, all_lan_urls: [] };

        // Model Test Builder State
        let config = [], userAnswers = {}, audioData = {};
        let groups = ["JFT", "JLPT", "General"];
        let allExams = [];

        // Session Persistence Keys
        const CBT_SESSION_KEY = 'jft_cbt_active_session_v1';
        const MODEL_SESSION_KEY = 'jft_model_active_session_v1';

        async function initSystem() {
            if(window.location.protocol === 'file:') {
                const warn = document.getElementById('file-protocol-warning');
                if(warn) warn.classList.remove('hidden');
            }
            try {
                const savedGroups = localStorage.getItem('exam_groups');
                if(savedGroups) groups = JSON.parse(savedGroups);
            } catch(e) {}

            try {
                const savedExams = localStorage.getItem('jft_exam_db');
                if(savedExams) allExams = JSON.parse(savedExams);
            } catch(e) {}

            try { renderGroupOptions(); } catch(e) {}
            try { renderAdminModelList(); } catch(e) {}
            try { checkStoredBg(); } catch(e) {}
            try { await fetchNetworkInfo(); } catch(e) { console.warn("Network info fetch warning:", e); }
            try { await fetchVoices(); } catch(e) { console.warn("Voice catalog fetch warning:", e); }
            try { await loadCbtExams(); } catch(e) { console.warn("CBT exam load warning:", e); }
            try { renderHomeExams(); } catch(e) {}
            try { renderStudentCbtList(); } catch(e) {}

            // Auto-restore active exam session if browser reloaded / switched to desktop mode
            const cbtRestored = tryRestoreCbtSession();
            let modelRestored = false;
            if(!cbtRestored) {
                modelRestored = tryRestoreModelSession();
            }
            if(!cbtRestored && !modelRestored) {
                navigateTo('home');
            }
            initHomeSlider();
            initThreeDotCollapseListener();

            // Restore auto-download preference for Admin
            const autoDlSaved = localStorage.getItem('admin_auto_download') === 'true';
            const autoDlToggle = document.getElementById('auto-download-toggle');
            if(autoDlToggle) {
                autoDlToggle.checked = autoDlSaved;
                toggleAutoDownload(autoDlSaved);
            }
            const autoDlFmt = localStorage.getItem('admin_auto_download_fmt');
            if(autoDlFmt && document.getElementById('auto-download-format')) {
                document.getElementById('auto-download-format').value = autoDlFmt;
            }

            // Save session before unload (handles mobile browser desktop toggle, rotation, tab switch)
            window.addEventListener('beforeunload', () => {
                saveCbtSession();
                saveModelSession();
            });

            window.addEventListener('resize', () => {
                const activeBtn = document.querySelector('.nav-capsule-btn.active');
                const glider = document.getElementById('capsule-nav-glider');
                if(activeBtn && glider) {
                    glider.style.left = activeBtn.offsetLeft + 'px';
                    glider.style.width = activeBtn.offsetWidth + 'px';
                }
            });
            window.addEventListener('pagehide', () => {
                saveCbtSession();
                saveModelSession();
            });
        }

        async function fetchNetworkInfo() {
            try {
                const res = await fetch(`${API_BASE}/api/network-info`);
                if(res.ok) {
                    networkInfo = await res.json();
                    const lanDisplay = networkInfo.primary_lan_url || window.location.origin;
                    const ipEl = document.getElementById('current-lan-ip');
                    if(ipEl) ipEl.innerText = lanDisplay.replace('http://', '');
                    const modalEl = document.getElementById('modal-lan-url');
                    if(modalEl) modalEl.innerText = lanDisplay;
                }
            } catch(e) {
                const ipEl = document.getElementById('current-lan-ip');
                if(ipEl) ipEl.innerText = window.location.host || '127.0.0.1:8000';
                const modalEl = document.getElementById('modal-lan-url');
                if(modalEl) modalEl.innerText = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:8000';
            }
        }

        async function fetchVoices() {
            try {
                const res = await fetch(`${API_BASE}/api/voices`);
                if(res.ok) {
                    availableVoices = await res.json();
                }
            } catch(e) {
                console.warn("Could not fetch voice catalog:", e);
            }
        }

        async function loadCbtExams() {
            try {
                const res = await fetch(`${API_BASE}/api/exams`);
                if(res.ok) {
                    allCbtExams = await res.json();
                    try { localStorage.setItem('jft_cbt_db', JSON.stringify(allCbtExams)); } catch(err) {}
                }
            } catch(e) {
                console.warn("Fallback to localStorage for CBT exams:", e);
                const local = localStorage.getItem('jft_cbt_db');
                if(local) {
                    try { allCbtExams = JSON.parse(local); } catch(err) {}
                }
            }
            try { renderStudentCbtList(); } catch(e) {}
            try { renderAdminCbtList(); } catch(e) {}
            try { renderHomeExams(); } catch(e) {}
            try { if(typeof renderMockTestsView === 'function') renderMockTestsView(currentMockFilter || 'all'); } catch(e) {}
            if(allCbtExams.length > 0 && !pendingAdminCbtJson) {
                try {
                    processUnifiedCbtData(allCbtExams[0]);
                } catch(e) {}
            }
        }

        function showNetworkModal() { document.getElementById('network-modal').classList.remove('hidden'); }
        function closeNetworkModal() { document.getElementById('network-modal').classList.add('hidden'); }
        function copyLanUrl() {
            const url = networkInfo.primary_lan_url || window.location.origin;
            navigator.clipboard.writeText(url).then(() => {
                alert(`Exam Link Copied: ${url}\nShare this with any candidate on the same Wi-Fi!`);
            });
        }

        // --- CAPSULE NAVIGATION & LANDING VIEWS CONTROLLER ---
        let threeDotIdleTimer = null;

        function navigateTo(viewName) {
            const views = {
                'home': document.getElementById('view-home'),
                'mock': document.getElementById('view-mock'),
                'about': document.getElementById('view-about'),
                'courses': document.getElementById('view-courses'),
                'login': document.getElementById('login-sec')
            };

            closeThreeDotMenu();

            // Guard against navigating away if active CBT or Model exam is ongoing
            const isCbtActive = !document.getElementById('cbt-exam-ui')?.classList.contains('hidden');
            const isModelActive = !document.getElementById('exam-ui')?.classList.contains('hidden');

            if((isCbtActive || isModelActive) && (viewName === 'home' || viewName === 'about' || viewName === 'courses' || viewName === 'mock')) {
                if(!confirm("An exam is currently in progress. Do you wish to leave the test screen? Your progress is saved in this browser.")) {
                    return;
                }
            }

            // Hide intermediate flow sections & modal screens unconditionally
            const flowSecs = [
                'portal-choice-sec', 'cbt-selection-sec', 'cbt-start-sec',
                'selection-sec', 'start-page-sec', 'cbt-exam-ui', 'exam-ui',
                'admin-panel-sec', 'result-ui', 'admin-answers-modal',
                'network-modal', 'admin-submissions-modal'
            ];
            flowSecs.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.classList.add('hidden');
            });

            // Toggle target view
            Object.keys(views).forEach(k => {
                if(views[k]) {
                    if(k === viewName || (viewName === 'register' && k === 'login')) {
                        views[k].classList.remove('hidden');
                    } else {
                        views[k].classList.add('hidden');
                    }
                }
            });

            // Update capsule navbar active classes
            document.querySelectorAll('.nav-capsule-btn').forEach(btn => {
                if(btn.dataset.view === viewName) {
                    btn.classList.add('active');
                } else {
                    btn.classList.remove('active');
                }
            });

            // Update sliding glider indicator
            const activeBtn = document.querySelector(`.nav-capsule-btn[data-view="${viewName}"]`);
            const glider = document.getElementById('capsule-nav-glider');
            if(activeBtn && glider) {
                glider.style.opacity = '1';
                glider.style.left = activeBtn.offsetLeft + 'px';
                glider.style.width = activeBtn.offsetWidth + 'px';
            } else if(glider) {
                glider.style.opacity = '0';
            }

            // Ensure top nav bar is visible
            const nav = document.getElementById('top-nav-bar');
            if(nav) nav.classList.remove('hidden');

            // Floating Live Chat visibility toggle
            const floatingChat = document.getElementById('floating-live-chat');
            if(floatingChat) {
                if(viewName === 'home' || viewName === 'mock' || viewName === 'courses' || viewName === 'about' || viewName === 'login') {
                    floatingChat.classList.remove('hidden');
                } else {
                    floatingChat.classList.add('hidden');
                }
            }

            if(viewName === 'home') {
                renderHomeSlider();
                renderHomeExams();
            }

            if(viewName === 'mock') {
                renderMockTestsView('all');
            }

            if(viewName === 'login' || viewName === 'register') {
                setTimeout(() => {
                    const inp = document.getElementById('s-name');
                    if(inp) inp.focus();
                }, 100);
            }

            window.scrollTo({ top: 0, behavior: 'instant' });
            document.documentElement.scrollTop = 0;
            document.body.scrollTop = 0;
        }

        // --- THREE-DOT SLIDING MENU (AUTO-COLLAPSING) ---
        function toggleThreeDotMenu(e) {
            if(e) e.stopPropagation();
            const menu = document.getElementById('three-dot-menu');
            if(!menu) return;
            const isHidden = menu.classList.contains('hidden');
            if(isHidden) {
                menu.classList.remove('hidden');
                resetThreeDotIdleTimer();
            } else {
                closeThreeDotMenu();
            }
        }

        function closeThreeDotMenu() {
            const menu = document.getElementById('three-dot-menu');
            if(menu) menu.classList.add('hidden');
            if(threeDotIdleTimer) {
                clearTimeout(threeDotIdleTimer);
                threeDotIdleTimer = null;
            }
        }

        function resetThreeDotIdleTimer() {
            if(threeDotIdleTimer) clearTimeout(threeDotIdleTimer);
            threeDotIdleTimer = setTimeout(() => {
                closeThreeDotMenu();
            }, 6000); // Auto-collapse after 6s idle
        }

        function initThreeDotCollapseListener() {
            document.addEventListener('click', (e) => {
                const menu = document.getElementById('three-dot-menu');
                const btn = document.getElementById('three-dot-btn');
                if(!menu || menu.classList.contains('hidden')) return;
                if(!menu.contains(e.target) && !btn.contains(e.target)) {
                    closeThreeDotMenu();
                }
            });
            const menu = document.getElementById('three-dot-menu');
            if(menu) {
                menu.addEventListener('mouseenter', resetThreeDotIdleTimer);
                menu.addEventListener('mousemove', resetThreeDotIdleTimer);
            }
        }

        // --- DYNAMIC GLASS HERO IMAGE SLIDER ---
        const DEFAULT_HERO_SLIDES = [
            {
                url: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80",
                title: "Welcome to Dai Ichi Academy Khulna",
                subtitle: "Premier Japanese Language & Visa Consultancy in Shiromoni, Khulna",
                badge: "CAMPUS & CONSULTANCY"
            },
            {
                url: "https://images.unsplash.com/photo-1528164344705-475426879c0d?auto=format&fit=crop&w=1200&q=80",
                title: "Master JFT-Basic A2 & JLPT with Expert Trainers",
                subtitle: "Comprehensive grammar, vocabulary, reading, and listening drills designed for high pass rates",
                badge: "LANGUAGE MASTERY"
            },
            {
                url: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&w=1200&q=80",
                title: "Official Prometric CBT Examination Simulator",
                subtitle: "Full 40-question mock exams with multi-speaker neural audio and authentic Prometric interface",
                badge: "CBT COMPUTER LAB"
            },
            {
                url: "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80",
                title: "Specified Skilled Worker (SSW) & Student Visa Success",
                subtitle: "End-to-end guidance for Tokutei Ginou placement, university admissions, and visa documentation",
                badge: "VISA & JOB PLACEMENT"
            }
        ];

        let homeSlides = [];
        let currentSlideIdx = 0;
        let sliderAutoplayInterval = null;

        function initHomeSlider() {
            try {
                const stored = localStorage.getItem('daiichi_slider_images');
                if(stored) {
                    homeSlides = JSON.parse(stored);
                }
            } catch(e) {}
            if(!homeSlides || homeSlides.length === 0) {
                homeSlides = [...DEFAULT_HERO_SLIDES];
            }
            renderHomeSlider();
            startSliderAutoplay();

            const wrap = document.getElementById('home-slider-wrap');
            if(wrap) {
                wrap.addEventListener('mouseenter', stopSliderAutoplay);
                wrap.addEventListener('mouseleave', startSliderAutoplay);
            }
        }

        function updateSlideRatio() {
            if(!homeSlides || homeSlides.length === 0) return;
            const active = homeSlides[currentSlideIdx];
            const viewport = document.getElementById('home-slider-viewport');
            if(!viewport || !active) return;

            if(active._aspectRatio) {
                viewport.style.aspectRatio = active._aspectRatio;
                return;
            }

            const img = new Image();
            img.src = active.url;
            const setRatio = () => {
                if(img.naturalWidth && img.naturalHeight) {
                    active._aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
                    viewport.style.aspectRatio = active._aspectRatio;
                }
            };
            if(img.complete && img.naturalWidth) {
                setRatio();
            } else {
                img.onload = setRatio;
            }
        }

        function renderHomeSlider() {
            const track = document.getElementById('home-slider-track');
            const indicators = document.getElementById('slider-indicators');
            if(!track || homeSlides.length === 0) return;

            // Pre-calculate image natural ratios for adaptive slider framing
            homeSlides.forEach((slide) => {
                if(!slide._aspectRatio) {
                    const testImg = new Image();
                    testImg.src = slide.url;
                    testImg.onload = () => {
                        slide._aspectRatio = `${testImg.naturalWidth} / ${testImg.naturalHeight}`;
                        const active = homeSlides[currentSlideIdx];
                        if(active && active.url === slide.url) {
                            updateSlideRatio();
                        }
                    };
                }
            });

            // Render each slide preserving 100% natural aspect ratio without cropping
            track.innerHTML = homeSlides.map((slide, idx) => `
                <div class="min-w-full w-full h-full flex-shrink-0 relative overflow-hidden bg-transparent flex items-center justify-center">
                    <img src="${slide.url}" alt="${slide.title || 'Dai Ichi Slide'}" class="w-full h-full object-contain object-center select-none">
                </div>
            `).join('');

            // Set track position for current slide
            track.style.transform = `translateX(-${currentSlideIdx * 100}%)`;

            if(indicators) {
                indicators.innerHTML = homeSlides.map((_, idx) => `
                    <button onclick="goToSlide(${idx})" class="h-2 rounded-full transition-all duration-300 ${idx === currentSlideIdx ? 'w-8 bg-cyan-400 shadow-md shadow-cyan-400/50' : 'w-2.5 bg-white/40 hover:bg-white/70'}" title="Slide ${idx+1}"></button>
                `).join('');
            }

            updateSlideCaption();
            updateSlideRatio();
        }

        function updateSlidePosition() {
            const track = document.getElementById('home-slider-track');
            if(track) {
                track.style.transform = `translateX(-${currentSlideIdx * 100}%)`;
            }
            updateSlideCaption();
            updateSlideRatio();
        }

        function updateSlideCaption() {
            if(!homeSlides || homeSlides.length === 0) return;
            const active = homeSlides[currentSlideIdx];
            const titleEl = document.getElementById('slide-title');
            const subEl = document.getElementById('slide-subtitle');
            const badgeEl = document.getElementById('slide-badge');
            const dateEl = document.getElementById('slide-date');
            if(titleEl) titleEl.innerText = active.title || "Dai Ichi Academy Khulna";
            if(subEl) subEl.innerText = active.subtitle || "Japanese Language & Visa Consultancy";
            if(badgeEl) badgeEl.innerText = active.badge || "DAI ICHI ACADEMY";
            if(dateEl) {
                const todayFormatted = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                dateEl.innerText = active.date || todayFormatted;
            }

            // Update indicators
            const indicators = document.getElementById('slider-indicators');
            if(indicators) {
                const btns = indicators.querySelectorAll('button');
                btns.forEach((btn, idx) => {
                    if(idx === currentSlideIdx) {
                        btn.className = "h-2 rounded-full transition-all duration-300 w-8 bg-cyan-400 shadow-md shadow-cyan-400/50";
                    } else {
                        btn.className = "h-2 rounded-full transition-all duration-300 w-2.5 bg-white/40 hover:bg-white/70";
                    }
                });
            }
        }

        function nextSlide() {
            if(homeSlides.length === 0) return;
            currentSlideIdx = (currentSlideIdx + 1) % homeSlides.length;
            updateSlidePosition();
        }

        function prevSlide() {
            if(homeSlides.length === 0) return;
            currentSlideIdx = (currentSlideIdx - 1 + homeSlides.length) % homeSlides.length;
            updateSlidePosition();
        }

        function goToSlide(idx) {
            if(idx < 0 || idx >= homeSlides.length || idx === currentSlideIdx) return;
            currentSlideIdx = idx;
            updateSlidePosition();
        }

        function startSliderAutoplay() {
            stopSliderAutoplay();
            sliderAutoplayInterval = setInterval(() => {
                nextSlide();
            }, 4500);
        }

        function stopSliderAutoplay() {
            if(sliderAutoplayInterval) {
                clearInterval(sliderAutoplayInterval);
                sliderAutoplayInterval = null;
            }
        }

        // --- MOCK TESTS VIEW RENDERING ---
        let currentMockFilter = 'all';

        function renderMockTestsView(filter = 'all') {
            currentMockFilter = filter;
            const container = document.getElementById('mock-cards-container');
            if(!container) return;

            // Highlight tab pills
            ['all', 'cbt', 'model'].forEach(f => {
                const tab = document.getElementById(`mock-tab-${f}`);
                if(tab) {
                    if(f === filter) {
                        tab.className = "px-4 py-2 rounded-full text-xs font-bold transition glass-panel bg-white/25 text-white border border-white/40 shadow-sm";
                    } else {
                        tab.className = "px-4 py-2 rounded-full text-xs font-bold transition glass-panel text-gray-300 hover:text-white hover:bg-white/10";
                    }
                }
            });

            let cardsHtml = "";

            // Render CBT Exams
            if(filter === 'all' || filter === 'cbt') {
                const visibleCbt = allCbtExams.filter(e => e.isActive !== false);
                visibleCbt.forEach(exam => {
                    const qCount = (exam.data && exam.data.questions) ? exam.data.questions.length : 40;
                    cardsHtml += `
                        <div class="glass-card p-6 border-2 border-cyan-500/30 flex flex-col justify-between relative overflow-hidden group">
                            <div class="absolute -right-12 -top-12 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition"></div>
                            <div>
                                <div class="flex justify-between items-start gap-2 mb-3">
                                    <span class="bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                                        🖥️ Official Prometric CBT
                                    </span>
                                    <span class="text-[11px] text-gray-400 font-mono">${exam.data?.duration || 60}m</span>
                                </div>
                                <h3 class="text-base font-bold text-white mb-2 leading-snug group-hover:text-cyan-300 transition">
                                    ${exam.title}
                                </h3>
                                <p class="text-xs text-gray-400 mb-4">
                                    Official Prometric computer-based format with 4 sections (Vocabulary, Conversation, Grammar, Listening).
                                </p>
                                <div class="grid grid-cols-2 gap-2 text-[11px] bg-black/30 p-3 rounded-xl border border-white/10 mb-4">
                                    <div class="text-gray-300"><span class="text-gray-500 block text-[9px] uppercase">Questions</span><b>${qCount} Items</b></div>
                                    <div class="text-gray-300"><span class="text-gray-500 block text-[9px] uppercase">Pass Score</span><b class="text-emerald-400">${exam.data?.passMark || 200}/250</b></div>
                                </div>
                            </div>
                            <button onclick="launchCbtFromCard('${exam.id}')" class="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-3 rounded-xl font-black text-xs transition shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2">
                                <span>START CBT EXAM</span>
                                <span>→</span>
                            </button>
                        </div>
                    `;
                });
            }

            // Render PDF Model Tests
            if(filter === 'all' || filter === 'model') {
                allExams.forEach((exam, idx) => {
                    if(exam.isActive === false) return;
                    const mTitle = exam.modelName || exam.name || `Model Test #${idx + 1}`;
                    const qCount = (exam.examData && exam.examData.length) || (exam.items && exam.items.length) || (exam.questions && exam.questions.length) || 0;
                    const mDur = exam.duration || 60;
                    const mPass = exam.passMark || 200;
                    cardsHtml += `
                        <div class="glass-card p-6 border-2 border-purple-500/30 flex flex-col justify-between relative overflow-hidden group">
                            <div class="absolute -right-12 -top-12 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition"></div>
                            <div>
                                <div class="flex justify-between items-start gap-2 mb-3">
                                    <span class="bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                                        📄 Model Test (${exam.group || 'General'})
                                    </span>
                                    <span class="text-[11px] text-gray-400 font-mono">${mDur}m</span>
                                </div>
                                <h3 class="text-base font-bold text-white mb-2 leading-snug group-hover:text-purple-300 transition">
                                    ${mTitle}
                                </h3>
                                <p class="text-xs text-gray-400 mb-4">
                                    Standard question builder model assessment with customizable questions and evaluation.
                                </p>
                                <div class="grid grid-cols-2 gap-2 text-[11px] bg-black/30 p-3 rounded-xl border border-white/10 mb-4">
                                    <div class="text-gray-300"><span class="text-gray-500 block text-[9px] uppercase">Questions</span><b>${qCount} Items</b></div>
                                    <div class="text-gray-300"><span class="text-gray-500 block text-[9px] uppercase">Group / Pass</span><b class="text-purple-300">${exam.group || 'N/A'} (${mPass})</b></div>
                                </div>
                            </div>
                            <button onclick="launchModelFromCard('${exam.group}', ${idx})" class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-3 rounded-xl font-black text-xs transition shadow-md shadow-purple-500/20 flex items-center justify-center gap-2">
                                <span>START MODEL TEST</span>
                                <span>→</span>
                            </button>
                        </div>
                    `;
                });
            }

            if(cardsHtml === "") {
                cardsHtml = `
                    <div class="col-span-full glass-panel p-12 text-center text-gray-400 space-y-3">
                        <div class="text-3xl">📭</div>
                        <div class="font-bold text-sm text-gray-300">No mock tests available in this category yet.</div>
                        <p class="text-xs">The instructor can upload and activate new tests from the Admin Control Panel.</p>
                        <button onclick="openAdmin()" class="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition">
                            Open Admin Panel
                        </button>
                    </div>
                `;
            }

            container.innerHTML = cardsHtml;
        }

        
        let currentHomeFilter = 'all';

        function filterHomeExams(filter) {
            currentHomeFilter = filter;
            renderHomeExams(filter);
        }

        function renderHomeExams(filter = currentHomeFilter) {
            const container = document.getElementById('home-exams-container');
            if(!container) return;

            // Highlight Home filter tabs
            ['all', 'cbt', 'model'].forEach(f => {
                const tab = document.getElementById(`home-tab-${f}`);
                if(tab) {
                    if(f === filter) {
                        tab.className = "px-4 py-2 rounded-full text-xs font-bold transition glass-panel bg-white/25 text-white border border-white/40 shadow-sm";
                    } else {
                        tab.className = "px-4 py-2 rounded-full text-xs font-bold transition glass-panel text-gray-300 hover:text-white hover:bg-white/10";
                    }
                }
            });

            let cardsHtml = "";

            // Render CBT Exams
            if(filter === 'all' || filter === 'cbt') {
                const visibleCbt = (allCbtExams || []).filter(e => e.isActive !== false);
                visibleCbt.forEach(exam => {
                    const qCount = (exam.data && exam.data.questions) ? exam.data.questions.length : (exam.questions ? exam.questions.length : 40);
                    const dur = exam.duration || exam.data?.duration || 60;
                    const pass = exam.passMark || exam.data?.passMark || 200;
                    cardsHtml += `
                        <div class="glass-card p-6 border-2 border-cyan-500/30 flex flex-col justify-between relative overflow-hidden group hover:border-cyan-400 transition-all">
                            <div class="absolute -right-12 -top-12 w-28 h-28 bg-cyan-500/10 rounded-full blur-2xl group-hover:bg-cyan-500/20 transition"></div>
                            <div>
                                <div class="flex justify-between items-start gap-2 mb-3">
                                    <span class="bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                                        🖥️ Official Prometric CBT
                                    </span>
                                    <span class="text-[11px] text-gray-400 font-mono">${dur}m</span>
                                </div>
                                <h3 class="text-base font-bold text-white mb-2 leading-snug group-hover:text-cyan-300 transition">
                                    ${exam.title}
                                </h3>
                                <p class="text-xs text-gray-400 mb-4">
                                    Official Prometric computer-based format with 4 sections (Vocabulary, Conversation, Grammar, Listening).
                                </p>
                                <div class="grid grid-cols-2 gap-2 text-[11px] bg-black/30 p-3 rounded-xl border border-white/10 mb-4">
                                    <div class="text-gray-300"><span class="text-gray-500 block text-[9px] uppercase">Questions</span><b>${qCount} Items</b></div>
                                    <div class="text-gray-300"><span class="text-gray-500 block text-[9px] uppercase">Pass Score</span><b class="text-emerald-400">${pass}/250</b></div>
                                </div>
                            </div>
                            <button onclick="launchCbtFromCard('${exam.id}')" class="w-full bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white py-3 rounded-xl font-black text-xs transition shadow-md shadow-cyan-500/20 flex items-center justify-center gap-2">
                                <span>START CBT EXAM</span>
                                <span>→</span>
                            </button>
                        </div>
                    `;
                });
            }

            // Render PDF Model Tests
            if(filter === 'all' || filter === 'model') {
                (allExams || []).forEach((exam, idx) => {
                    if(exam.isActive === false) return;
                    const mTitle = exam.modelName || exam.name || `Model Test #${idx + 1}`;
                    const qCount = (exam.examData && exam.examData.length) || (exam.items && exam.items.length) || (exam.questions && exam.questions.length) || 0;
                    const mDur = exam.duration || 60;
                    const mPass = exam.passMark || 200;
                    cardsHtml += `
                        <div class="glass-card p-6 border-2 border-purple-500/30 flex flex-col justify-between relative overflow-hidden group hover:border-purple-400 transition-all">
                            <div class="absolute -right-12 -top-12 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition"></div>
                            <div>
                                <div class="flex justify-between items-start gap-2 mb-3">
                                    <span class="bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                                        📄 Model Test (${exam.group || 'General'})
                                    </span>
                                    <span class="text-[11px] text-gray-400 font-mono">${mDur}m</span>
                                </div>
                                <h3 class="text-base font-bold text-white mb-2 leading-snug group-hover:text-purple-300 transition">
                                    ${mTitle}
                                </h3>
                                <p class="text-xs text-gray-400 mb-4">
                                    Standard question builder model assessment with customizable questions and evaluation.
                                </p>
                                <div class="grid grid-cols-2 gap-2 text-[11px] bg-black/30 p-3 rounded-xl border border-white/10 mb-4">
                                    <div class="text-gray-300"><span class="text-gray-500 block text-[9px] uppercase">Questions</span><b>${qCount} Items</b></div>
                                    <div class="text-gray-300"><span class="text-gray-500 block text-[9px] uppercase">Group / Pass</span><b class="text-purple-300">${exam.group || 'N/A'} (${mPass})</b></div>
                                </div>
                            </div>
                            <button onclick="launchModelFromCard('${exam.group}', ${idx})" class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-3 rounded-xl font-black text-xs transition shadow-md shadow-purple-500/20 flex items-center justify-center gap-2">
                                <span>START MODEL TEST</span>
                                <span>→</span>
                            </button>
                        </div>
                    `;
                });
            }

            if(cardsHtml === "") {
                cardsHtml = `
                    <div class="col-span-full glass-panel p-10 text-center text-gray-400 space-y-3">
                        <div class="text-3xl">📭</div>
                        <div class="font-bold text-sm text-gray-300">No active practice exams loaded yet.</div>
                        <p class="text-xs">Exams and Model questions published from Admin Control Center will automatically appear here.</p>
                        <button onclick="openAdmin()" class="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition shadow-md shadow-cyan-600/30">
                            ⚙️ Open Admin Control Center
                        </button>
                    </div>
                `;
            }

            container.innerHTML = cardsHtml;
        }

        let pendingExamLaunch = null;

        function launchCbtFromCard(examId) {
            const name = document.getElementById('s-name')?.value.trim();
            if(!name) {
                pendingExamLaunch = { type: 'cbt', id: examId };
                navigateTo('login');
                const targetExam = (allCbtExams || []).find(e => e.id === examId);
                const hint = document.getElementById('login-pending-hint');
                if(hint) {
                    hint.innerHTML = `<span>🎯 Target Exam: <b>${targetExam ? targetExam.title : 'Selected CBT Exam'}</b> — Enter candidate name to begin!</span>`;
                    hint.classList.remove('hidden');
                }
                const inp = document.getElementById('s-name');
                if(inp) inp.focus();
                return;
            }
            selectCbtExam(examId);
        }

        function launchModelFromCard(group, idx) {
            const name = document.getElementById('s-name')?.value.trim();
            if(!name) {
                pendingExamLaunch = { type: 'model', group: group, idx: idx };
                navigateTo('login');
                const hint = document.getElementById('login-pending-hint');
                if(hint) {
                    hint.innerHTML = `<span>📄 Target Test: <b>Model Test (${group} #${idx + 1})</b> — Enter candidate name to begin!</span>`;
                    hint.classList.remove('hidden');
                }
                const inp = document.getElementById('s-name');
                if(inp) inp.focus();
                return;
            }
            openExam(group, idx);
        }

// --- NAVIGATION FLOW ---
        function goToPortalChoice() {
            const nameInput = document.getElementById('s-name');
            let name = nameInput ? nameInput.value.trim() : "";
            if(!name) {
                name = "Candidate " + Math.floor(100 + Math.random()*900);
                if(nameInput) nameInput.value = name;
            }
            document.getElementById('login-sec').classList.add('hidden');
            const hint = document.getElementById('login-pending-hint');
            if(hint) hint.classList.add('hidden');

            if(pendingExamLaunch) {
                const target = pendingExamLaunch;
                pendingExamLaunch = null;
                if(target.type === 'cbt') {
                    selectCbtExam(target.id);
                    return;
                } else if(target.type === 'model') {
                    openExam(target.group, target.idx);
                    return;
                }
            }

            document.getElementById('portal-choice-sec').classList.remove('hidden');
        }

        function backToPortalChoice() {
            document.getElementById('cbt-selection-sec').classList.add('hidden');
            document.getElementById('selection-sec').classList.add('hidden');
            document.getElementById('portal-choice-sec').classList.remove('hidden');
        }

        function openCbtSelection() {
            document.getElementById('portal-choice-sec').classList.add('hidden');
            document.getElementById('cbt-selection-sec').classList.remove('hidden');
            renderStudentCbtList();
        }

        function backToCbtList() {
            document.getElementById('cbt-start-sec').classList.add('hidden');
            document.getElementById('cbt-selection-sec').classList.remove('hidden');
        }

        function openModelTestSelection() {
            document.getElementById('portal-choice-sec').classList.add('hidden');
            document.getElementById('selection-sec').classList.remove('hidden');
        }

// --- BACKGROUND & GLASS TRANSPARENCY CONTROLS ---
        function updateGlobalBg(input) {
            const file = input.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.body.style.backgroundImage = `url('${e.target.result}')`;
                    localStorage.setItem('exam_global_bg', e.target.result);
                };
                reader.readAsDataURL(file);
            }
        }

        function resetGlobalBg() {
            document.body.style.backgroundImage = "radial-gradient(circle at top right, #1e293b, #0f172a)";
            localStorage.removeItem('exam_global_bg');
        }

        function updateGlassOpacity(val) {
            document.documentElement.style.setProperty('--glass-opacity', val);
            localStorage.setItem('exam_glass_opacity', val);
            const slider = document.getElementById('admin-glass-slider');
            const textEl = document.getElementById('admin-glass-val');
            if(slider) slider.value = val;
            if(textEl) textEl.innerText = Math.round(val * 100) + "%";
        }
