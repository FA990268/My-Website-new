import re

file_path = r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add Featured Exams section into #view-home (after Image slider section, before Feature Highlights)
home_exams_html = """
        <!-- ACTIVE CBT EXAMS & MODEL TESTS DIRECTORY ON HOME PAGE -->
        <section class="space-y-6" id="home-featured-exams-sec">
            <div class="glass-panel p-6 sm:p-8 border border-white/20 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
                <div>
                    <div class="inline-flex items-center gap-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-400/40 text-[10px] sm:text-xs font-bold px-3.5 py-1 rounded-full uppercase tracking-wider mb-2 shadow-sm">
                        <span>🎯</span>
                        <span>AVAILABLE CBT &amp; MODEL EXAMS</span>
                    </div>
                    <h2 class="text-2xl sm:text-3xl font-black text-white">LIVE EXAMS &amp; MODEL PAPERS</h2>
                    <p class="text-xs sm:text-sm text-gray-300 mt-1">Practice authentic Prometric CBT examinations and chapter-wise model tests with multi-speaker neural audio and instant scoring.</p>
                </div>
                <!-- Quick Filter / Action Buttons -->
                <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                    <button onclick="filterHomeExams('all')" id="home-tab-all" class="px-4 py-2 rounded-full text-xs font-bold transition glass-panel bg-white/25 text-white border border-white/40 shadow-sm">
                        All Tests
                    </button>
                    <button onclick="filterHomeExams('cbt')" id="home-tab-cbt" class="px-4 py-2 rounded-full text-xs font-bold transition glass-panel text-gray-300 hover:text-white hover:bg-white/10">
                        CBT Exams
                    </button>
                    <button onclick="filterHomeExams('model')" id="home-tab-model" class="px-4 py-2 rounded-full text-xs font-bold transition glass-panel text-gray-300 hover:text-white hover:bg-white/10">
                        Model Tests
                    </button>
                    <button onclick="navigateTo('mock')" class="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-5 py-2 rounded-full font-black text-xs transition shadow-md shadow-cyan-500/20 flex items-center gap-1.5 ml-1">
                        <span>All Mock Tests</span>
                        <span>→</span>
                    </button>
                </div>
            </div>

            <!-- Dynamic Grid of Exams on Home Page -->
            <div id="home-exams-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 w-full">
                <!-- Dynamically populated by renderHomeExams() -->
            </div>
        </section>
"""

marker = '</section>\n\n        <!-- Feature Highlights Grid -->'
if marker in content:
    content = content.replace(marker, '</section>\n' + home_exams_html + '\n        <!-- Feature Highlights Grid -->', 1)
    print("Added home_exams_html to #view-home successfully!")
else:
    print("Marker not found for home_exams_html!")

# 2. Update renderMockTestsView to properly handle exam.modelName and exam.examData
old_mock_render = """            // Render PDF Model Tests
            if(filter === 'all' || filter === 'model') {
                allExams.forEach((exam, idx) => {
                    cardsHtml += `
                        <div class="glass-card p-6 border-2 border-purple-500/30 flex flex-col justify-between relative overflow-hidden group">
                            <div class="absolute -right-12 -top-12 w-28 h-28 bg-purple-500/10 rounded-full blur-2xl group-hover:bg-purple-500/20 transition"></div>
                            <div>
                                <div class="flex justify-between items-start gap-2 mb-3">
                                    <span class="bg-purple-500/20 text-purple-300 border border-purple-400/30 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase">
                                        📄 Model Test (${exam.group})
                                    </span>
                                    <span class="text-[11px] text-gray-400 font-mono">60m</span>
                                </div>
                                <h3 class="text-base font-bold text-white mb-2 leading-snug group-hover:text-purple-300 transition">
                                    ${exam.name}
                                </h3>
                                <p class="text-xs text-gray-400 mb-4">
                                    Standard question builder model assessment with customizable questions and evaluation.
                                </p>
                                <div class="grid grid-cols-2 gap-2 text-[11px] bg-black/30 p-3 rounded-xl border border-white/10 mb-4">
                                    <div class="text-gray-300"><span class="text-gray-500 block text-[9px] uppercase">Questions</span><b>${exam.items ? exam.items.length : 0} Items</b></div>
                                    <div class="text-gray-300"><span class="text-gray-500 block text-[9px] uppercase">Group</span><b class="text-purple-300">${exam.group}</b></div>
                                </div>
                            </div>
                            <button onclick="launchModelFromCard('${exam.group}', ${idx})" class="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white py-3 rounded-xl font-black text-xs transition shadow-md shadow-purple-500/20 flex items-center justify-center gap-2">
                                <span>START MODEL TEST</span>
                                <span>→</span>
                            </button>
                        </div>
                    `;
                });
            }"""

new_mock_render = """            // Render PDF Model Tests
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
            }"""

if old_mock_render in content:
    content = content.replace(old_mock_render, new_mock_render)
    print("Replaced old_mock_render successfully!")
else:
    print("old_mock_render not found for exact replacement!")

# 3. Add renderHomeExams & filterHomeExams implementation
home_exams_js = """
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
"""

# Place renderHomeExams right after renderMockTestsView
target_str = "let pendingExamLaunch = null;"
if target_str in content:
    content = content.replace(target_str, home_exams_js + '\n        ' + target_str, 1)
    print("Added home_exams_js successfully!")

# Hook renderHomeExams into navigateTo('home')
old_nav_home = """            if(viewName === 'home') {
                renderHomeSlider();
            }"""
new_nav_home = """            if(viewName === 'home') {
                renderHomeSlider();
                renderHomeExams();
            }"""
if old_nav_home in content:
    content = content.replace(old_nav_home, new_nav_home)
    print("Hooked renderHomeExams in navigateTo('home')!")

# Hook renderHomeExams into initSystem()
old_init_load = """            await loadCbtExams();"""
new_init_load = """            await loadCbtExams();
            renderHomeExams();"""
if old_init_load in content:
    content = content.replace(old_init_load, new_init_load, 1)
    print("Hooked renderHomeExams in initSystem!")

# Hook renderHomeExams into loadCbtExams()
old_load_cbt = """                    if(currentMockFilter) renderMockTestsView(currentMockFilter);"""
new_load_cbt = """                    if(currentMockFilter) renderMockTestsView(currentMockFilter);
                    renderHomeExams();"""
if old_load_cbt in content:
    content = content.replace(old_load_cbt, new_load_cbt, 1)
    print("Hooked renderHomeExams in loadCbtExams!")

# Hook renderHomeExams into saveExamToDB()
old_save_model = """            renderAdminModelList();
        }"""
new_save_model = """            renderAdminModelList();
            renderHomeExams();
            if(typeof renderMockTestsView === 'function') renderMockTestsView(currentMockFilter || 'all');
        }"""
if old_save_model in content:
    content = content.replace(old_save_model, new_save_model, 1)
    print("Hooked renderHomeExams in saveExamToDB!")

# Hook renderHomeExams into toggleModelTestActive & deleteModelTest
old_toggle_model = """                renderAdminModelList();
            }
        }"""
new_toggle_model = """                renderAdminModelList();
                renderHomeExams();
                if(typeof renderMockTestsView === 'function') renderMockTestsView(currentMockFilter || 'all');
            }
        }"""
if old_toggle_model in content:
    content = content.replace(old_toggle_model, new_toggle_model, 1)
    print("Hooked renderHomeExams in toggleModelTestActive!")

# Write file
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved static/index.html successfully!")
