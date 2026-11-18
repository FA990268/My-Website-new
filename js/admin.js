/**
 * Admin Dashboard, Question Creators, & Submissions Monitor
 * Unified CBT builder, audio generator, submission exports, and hero slider management.
 */

// --- ADMIN SLIDER IMAGE MANAGER ---
        function renderAdminSliderManager() {
            const list = document.getElementById('admin-slides-list');
            const countEl = document.getElementById('admin-slide-count');
            if(countEl) countEl.innerText = homeSlides.length;
            if(!list) return;

            list.innerHTML = homeSlides.map((slide, idx) => `
                <div class="bg-black/40 rounded-xl overflow-hidden border border-white/10 flex flex-col justify-between group">
                    <div class="h-24 w-full overflow-hidden bg-black/60 relative">
                        <img src="${slide.url}" alt="${slide.title}" class="w-full h-full object-cover group-hover:scale-105 transition">
                        <span class="absolute top-1.5 left-1.5 bg-black/70 text-cyan-300 text-[9px] font-mono px-2 py-0.5 rounded">#${idx+1}</span>
                    </div>
                    <div class="p-3 space-y-1">
                        <div class="text-[11px] font-bold text-white truncate" title="${slide.title}">${slide.title}</div>
                        <div class="text-[9px] text-gray-400 truncate" title="${slide.subtitle}">${slide.subtitle || ''}</div>
                        <div class="pt-2">
                            <button onclick="deleteCustomSliderImage(${idx})" class="w-full bg-rose-600/30 hover:bg-rose-600 text-rose-200 hover:text-white py-1 rounded text-[10px] font-bold transition">
                                Delete Slide
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }

        function addSliderSlideFromAdmin() {
            const fileInput = document.getElementById('admin-slide-file');
            const urlInput = document.getElementById('admin-slide-url');
            const titleInput = document.getElementById('admin-slide-title');
            const subInput = document.getElementById('admin-slide-sub');

            const title = titleInput.value.trim() || "Dai Ichi Academy Khulna";
            const subtitle = subInput.value.trim() || "Japanese Language & Visa Consultancy";

            const file = fileInput.files[0];
            if(file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    homeSlides.push({
                        url: e.target.result,
                        title: title,
                        subtitle: subtitle,
                        badge: "DAI ICHI ACADEMY"
                    });
                    saveSlidesToStorage();
                    fileInput.value = "";
                    urlInput.value = "";
                    titleInput.value = "";
                    subInput.value = "";
                    renderAdminSliderManager();
                    renderHomeSlider();
                    alert("Slide added successfully to Home Carousel!");
                };
                reader.readAsDataURL(file);
                return;
            }

            const url = urlInput.value.trim();
            if(!url) {
                alert("Please upload an image file or enter an image URL.");
                return;
            }

            homeSlides.push({
                url: url,
                title: title,
                subtitle: subtitle,
                badge: "DAI ICHI ACADEMY"
            });
            saveSlidesToStorage();
            urlInput.value = "";
            titleInput.value = "";
            subInput.value = "";
            renderAdminSliderManager();
            renderHomeSlider();
            alert("Slide added successfully to Home Carousel!");
        }

        function deleteCustomSliderImage(idx) {
            if(!confirm(`Delete slide #${idx+1}?`)) return;
            homeSlides.splice(idx, 1);
            if(homeSlides.length === 0) {
                homeSlides = [...DEFAULT_HERO_SLIDES];
            }
            if(currentSlideIdx >= homeSlides.length) currentSlideIdx = 0;
            saveSlidesToStorage();
            renderAdminSliderManager();
            renderHomeSlider();
        }

        function resetDefaultSlides() {
            if(!confirm("Reset Home Carousel to the 4 default slides?")) return;
            homeSlides = [...DEFAULT_HERO_SLIDES];
            currentSlideIdx = 0;
            saveSlidesToStorage();
            renderAdminSliderManager();
            renderHomeSlider();
        }

        function saveSlidesToStorage() {
            try {
                localStorage.setItem('daiichi_slider_images', JSON.stringify(homeSlides));
            } catch(e) {
                console.warn("Storage quota exceeded or error saving slides:", e);
            }
        }

// --- ADMIN TABS NAVIGATION (4 Clean Integrated Tabs) ---
        function switchAdminTab(tab) {
            ['cbt', 'model', 'settings', 'subs'].forEach(t => {
                const el = document.getElementById(`view-admin-${t}`);
                const btn = document.getElementById(`admin-tab-${t}`);
                if(el) el.classList.add('hidden');
                if(btn) btn.className = "px-4 py-2.5 rounded-xl font-bold text-xs md:text-sm bg-white/10 text-gray-300 hover:bg-white/20 transition";
            });
            const activeEl = document.getElementById(`view-admin-${tab}`);
            const activeBtn = document.getElementById(`admin-tab-${tab}`);
            if(activeEl) activeEl.classList.remove('hidden');
            if(activeBtn) activeBtn.className = "px-5 py-2.5 rounded-xl font-black text-xs md:text-sm bg-cyan-600 text-white transition shadow-lg shadow-cyan-600/30";
            if(tab === 'subs') fetchSubmissions();
            if(tab === 'settings') {
                renderActiveGroupsChips();
                renderAdminSliderManager();
            }
            if(tab === 'model') renderGroupOptions();
        }

        async function loadDemoUnifiedCbtExam() {
            const statusEl = document.getElementById('cbt-json-status');
            if(statusEl) statusEl.innerHTML = `<span class="text-cyan-400 font-bold">Loading 40Q demo from server...</span>`;
            try {
                const res = await fetch(`${API_BASE}/data/jft_40q_unified_cbt_with_dialogues.json`);
                if(!res.ok) throw new Error("Could not load unified test file from server");
                const data = await res.json();
                processUnifiedCbtData(data, "jft_40q_unified_cbt_with_dialogues.json");
            } catch(e) {
                alert("Error loading demo unified CBT exam: " + e.message);
                if(statusEl) statusEl.innerHTML = `<span class="text-rose-400">Failed to load demo exam</span>`;
            }
        }

        function handleUnifiedCbtUpload(input) {
            const file = input.files[0];
            const statusEl = document.getElementById('cbt-json-status');
            if(!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const raw = JSON.parse(e.target.result);
                    processUnifiedCbtData(raw, file.name);
                } catch(err) {
                    alert("Invalid JSON CBT Exam file: " + err.message);
                    if(statusEl) statusEl.innerHTML = `<span class="text-rose-400">Invalid JSON: ${err.message}</span>`;
                }
            };
            reader.readAsText(file);
        }

        function processUnifiedCbtData(raw, sourceName) {
            let qs = [];
            if(Array.isArray(raw)) qs = raw;
            else if(raw && Array.isArray(raw.questions)) qs = raw.questions;
            else if(raw && Array.isArray(raw.scripts)) {
                qs = raw.scripts.map((s, idx) => ({
                    section: "Section 3: Listening (聴解)",
                    instruction: "かいわを きいて、ただしい こたえを えらんでください。",
                    passage: s.title || `会話 ${idx+1}`,
                    question: "しつもんに こたえてください。",
                    options: ["選択肢 1", "選択肢 2", "選択肢 3", "選択肢 4"],
                    correct: 1,
                    mark: 6,
                    audio: s.targetAudio || `audio_${idx+1}.mp3`,
                    dialogues: s.dialogues
                }));
            }

            if(qs.length === 0) throw new Error("No questions array found in JSON file");

            const title = raw.title || (sourceName ? sourceName.replace('.json', '') : "JFT-Basic Model CBT Test (40 Questions)");
            const passMark = raw.passMark || 200;
            const duration = raw.duration || 60;

            pendingAdminCbtJson = {
                title: title,
                passMark: passMark,
                duration: duration,
                questions: qs
            };

            const titleInput = document.getElementById('cbt-exam-title');
            const passInput = document.getElementById('cbt-pass-mark');
            const durationInput = document.getElementById('cbt-exam-duration');
            if(titleInput) titleInput.value = title;
            if(passInput) passInput.value = passMark;
            if(durationInput) durationInput.value = duration;

            // Extract all dialogue scripts from questions or root
            let extractedScripts = [];
            qs.forEach((q, qIdx) => {
                const rawTurns = q.dialogues || q.dialogue || q.turns || q.lines || [];
                if(rawTurns.length > 0) {
                    const sId = q.dialogueId || q.audio || `q_${qIdx+1}`;
                    const sTitle = q.passage ? `${q.section || 'Question ' + (qIdx+1)}: ${q.passage.split('\n')[0]}` : (q.section || `Question ${qIdx+1}`);
                    const targetAudio = q.audio || (String(sId).endsWith('.mp3') ? sId : `${sId}.mp3`);
                    extractedScripts.push({
                        id: sId,
                        dialogueId: sId,
                        qIndex: qIdx,
                        title: sTitle,
                        targetAudio: targetAudio,
                        dialogues: rawTurns.map((t, tIdx) => ({
                            id: t.id || `${sId}_t${tIdx+1}`,
                            speaker: String(t.speaker || t.role || "Speaker").trim(),
                            text: String(t.text || t.dialogue || "").trim(),
                            voice: t.voice,
                            rate: t.rate || 1.0,
                            pitch: t.pitch || 0
                        }))
                    });
                }
            });

            if(raw.scripts && Array.isArray(raw.scripts)) {
                raw.scripts.forEach((s, sIdx) => {
                    if(!extractedScripts.find(x => x.id === s.id || x.targetAudio === s.targetAudio)) {
                        extractedScripts.push({
                            id: s.id || `script_${sIdx+1}`,
                            dialogueId: s.dialogueId || s.id || `script_${sIdx+1}`,
                            qIndex: -1,
                            title: s.title || `Script #${sIdx+1}`,
                            targetAudio: s.targetAudio || `${s.id || 'script_' + (sIdx+1)}.mp3`,
                            dialogues: (s.dialogues || []).map((t, tIdx) => ({
                                id: t.id || `${s.id}_t${tIdx+1}`,
                                speaker: String(t.speaker || t.role || "Speaker").trim(),
                                text: String(t.text || t.dialogue || "").trim(),
                                voice: t.voice,
                                rate: t.rate || 1.0,
                                pitch: t.pitch || 0
                            }))
                        });
                    }
                });
            }

            parsedScripts = extractedScripts;

            // Detect unique speakers
            speakerVoiceMap = {};
            parsedScripts.forEach(s => {
                s.dialogues.forEach(t => {
                    if(!speakerVoiceMap[t.speaker]) {
                        speakerVoiceMap[t.speaker] = detectSpeakerVoice(t.speaker);
                    }
                });
            });

            renderCbtOverviewBadges(qs.length, parsedScripts.length, Object.keys(speakerVoiceMap).length);
            renderSpeakerMappingChips();
            renderParsedScriptsView();

            const statusEl = document.getElementById('cbt-json-status');
            if(statusEl) {
                statusEl.innerHTML = `<span class="text-emerald-400 font-bold">✓ Successfully parsed ${qs.length} questions, images, and ${parsedScripts.length} dialogue scripts!</span>`;
            }
        }

        function renderCbtOverviewBadges(totalQ, totalScripts, totalSpeakers) {
            const badgesBox = document.getElementById('cbt-overview-badges');
            if(!badgesBox) return;
            badgesBox.classList.remove('hidden');
            const bQ = document.getElementById('badge-total-q');
            const bD = document.getElementById('badge-dialogue-count');
            const bS = document.getElementById('badge-speakers-count');
            if(bQ) bQ.innerText = `${totalQ} Questions`;
            if(bD) bD.innerText = `${totalScripts} Dialogue Scripts`;
            if(bS) bS.innerText = `${totalSpeakers} Speakers Detected`;
        }

// --- SUBMISSIONS MONITOR & POSTGRESQL ANSWER SHEET VIEWER (ADMIN) ---
        let autoDownloadInterval = null;
        let lastSeenSubmissionId = 0;

        async function fetchSubmissions() {
            const tbody = document.getElementById('submissions-table-body');
            tbody.innerHTML = '<tr><td colspan="7" class="p-4 text-center text-gray-400">Loading submissions from PostgreSQL...</td></tr>';
            try {
                const res = await fetch(`${API_BASE}/api/submissions`);
                const subs = await res.json();
                if(subs.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-gray-400">No candidate submissions recorded in PostgreSQL yet.</td></tr>';
                    return;
                }

                // Update highest seen ID for polling
                if(subs.length > 0 && subs[0].id) {
                    lastSeenSubmissionId = Math.max(lastSeenSubmissionId, subs[0].id);
                }

                tbody.innerHTML = subs.map(s => {
                    const candId = s.candidate_id || s.regNo || `#${s.id}`;
                    const candName = s.candidate_name || s.studentName || 'Candidate';
                    const score = s.total_score !== undefined ? s.total_score : (s.totalScore || 0);
                    const totalQ = s.total_questions || (s.questions ? s.questions.length : 60);
                    const correctCount = s.total_correct !== undefined ? s.total_correct : '-';
                    const wrongCount = s.total_wrong !== undefined ? s.total_wrong : '-';
                    const dateStr = s.submitted_at || s.date || 'Recent';

                    return `
                    <tr class="hover:bg-white/5 transition">
                        <td class="p-3 font-mono font-bold text-gray-400">#${s.id}</td>
                        <td class="p-3 font-mono font-bold text-cyan-300">${candId}</td>
                        <td class="p-3 font-bold text-white">${candName}</td>
                        <td class="p-3 font-black text-sm text-sky-400">${score} Pts</td>
                        <td class="p-3">
                            <span class="text-xs">
                                <b class="text-emerald-400">✅ ${correctCount}</b> / <b class="text-rose-400">❌ ${wrongCount}</b>
                                <span class="text-[10px] text-gray-400 block">${totalQ} Total Qs</span>
                            </span>
                        </td>
                        <td class="p-3 text-xs text-gray-300 font-mono">${dateStr}</td>
                        <td class="p-3 text-right">
                            <div class="flex items-center justify-end gap-1.5">
                                <button onclick="viewAnswerSheet(${s.id})" class="bg-emerald-600/30 hover:bg-emerald-600 text-emerald-200 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-bold border border-emerald-400/30 transition flex items-center gap-1 shadow-sm">
                                    <span>👁️ View Sheet</span>
                                </button>
                                <a href="${API_BASE}/api/submissions/${s.id}/download?format=json" download class="bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 hover:text-white px-2 py-1 rounded-lg text-[11px] font-bold border border-cyan-400/30 transition shadow-sm" title="Download raw JSON report">
                                    📥 JSON
                                </a>
                                <a href="${API_BASE}/api/submissions/${s.id}/download?format=csv" download class="bg-sky-600/30 hover:bg-sky-600 text-sky-200 hover:text-white px-2 py-1 rounded-lg text-[11px] font-bold border border-sky-400/30 transition shadow-sm" title="Download Excel/CSV sheet">
                                    📊 CSV
                                </a>
                            </div>
                        </td>
                    </tr>
                    `;
                }).join('');
            } catch(e) {
                tbody.innerHTML = `<tr><td colspan="7" class="p-4 text-center text-rose-400">Error loading submissions: ${e.message}</td></tr>`;
            }
        }

        async function viewAnswerSheet(submissionId) {
            const modal = document.getElementById('admin-answersheet-modal');
            const tbody = document.getElementById('modal-answers-tbody');
            if(!modal || !tbody) return;

            tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-gray-400">Loading detailed question breakdown from PostgreSQL...</td></tr>';
            modal.classList.remove('hidden');

            try {
                const res = await fetch(`${API_BASE}/api/submissions/${submissionId}`);
                if(!res.ok) throw new Error("Could not load submission details");
                const sub = await res.json();

                document.getElementById('modal-sub-id').innerText = `#${sub.id}`;
                document.getElementById('modal-sub-name').innerText = sub.candidate_name || "Candidate";
                document.getElementById('modal-sub-cand-id').innerText = sub.candidate_id || "-";
                document.getElementById('modal-sub-time').innerText = sub.submitted_at || "-";
                document.getElementById('modal-sub-total-q').innerText = sub.total_questions || (sub.answers ? sub.answers.length : 60);
                document.getElementById('modal-sub-correct').innerText = sub.total_correct !== undefined ? sub.total_correct : 0;
                document.getElementById('modal-sub-wrong').innerText = sub.total_wrong !== undefined ? sub.total_wrong : 0;
                document.getElementById('modal-sub-score').innerText = sub.total_score !== undefined ? sub.total_score : 0;

                // Wire modal download buttons
                const btnJson = document.getElementById('modal-btn-dl-json');
                if(btnJson) {
                    btnJson.onclick = () => window.open(`${API_BASE}/api/submissions/${submissionId}/download?format=json`);
                }
                const btnCsv = document.getElementById('modal-btn-dl-csv');
                if(btnCsv) {
                    btnCsv.onclick = () => window.open(`${API_BASE}/api/submissions/${submissionId}/download?format=csv`);
                }

                const answers = sub.answers || [];
                if(answers.length === 0) {
                    tbody.innerHTML = '<tr><td colspan="7" class="p-6 text-center text-gray-400">No question breakdown records found for this submission.</td></tr>';
                    return;
                }

                tbody.innerHTML = answers.map(ans => {
                    const isRight = ans.is_correct === true;
                    return `
                    <tr class="${isRight ? 'bg-emerald-500/5 hover:bg-emerald-500/10' : 'bg-rose-500/5 hover:bg-rose-500/10'} transition">
                        <td class="p-2.5 font-bold font-mono text-cyan-300">Q-${ans.question_number}</td>
                        <td class="p-2.5 text-gray-400 font-semibold text-[11px]">${ans.section_name || ''}</td>
                        <td class="p-2.5 font-medium text-white max-w-[280px]">${ans.question_text || ''}</td>
                        <td class="p-2.5 font-bold ${isRight ? 'text-emerald-300' : 'text-rose-300'}">${ans.selected_option || 'Unanswered'}</td>
                        <td class="p-2.5 font-bold text-gray-200">${ans.correct_option || ''}</td>
                        <td class="p-2.5 text-center">
                            ${isRight 
                                ? '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">✅ Correct</span>' 
                                : '<span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">❌ Wrong</span>'}
                        </td>
                        <td class="p-2.5 text-right font-black text-cyan-300">+${ans.marks_awarded || 0}</td>
                    </tr>
                    `;
                }).join('');
            } catch(e) {
                tbody.innerHTML = `<tr><td colspan="7" class="p-6 text-center text-rose-400">Error: ${e.message}</td></tr>`;
            }
        }

        function closeAnswerSheetModal() {
            const modal = document.getElementById('admin-answersheet-modal');
            if(modal) modal.classList.add('hidden');
        }

        // --- AUTO-DOWNLOAD ENGINE (ADMIN DASHBOARD) ---
        function toggleAutoDownload(enabled) {
            localStorage.setItem('admin_auto_download', enabled ? 'true' : 'false');
            const statusEl = document.getElementById('auto-download-status');
            const bannerEl = document.getElementById('auto-download-banner');
            
            if(enabled) {
                if(statusEl) {
                    statusEl.innerText = "ON (LISTENING)";
                    statusEl.className = "text-[10px] text-emerald-400 font-mono font-bold animate-pulse";
                }
                if(bannerEl) bannerEl.classList.remove('hidden');
                startAutoDownloadPolling();
            } else {
                if(statusEl) {
                    statusEl.innerText = "OFF";
                    statusEl.className = "text-[10px] text-gray-400 font-mono font-bold";
                }
                if(bannerEl) bannerEl.classList.add('hidden');
                if(autoDownloadInterval) {
                    clearInterval(autoDownloadInterval);
                    autoDownloadInterval = null;
                }
            }
        }

        function startAutoDownloadPolling() {
            if(autoDownloadInterval) clearInterval(autoDownloadInterval);
            
            // Initial poll to set baseline
            pollForNewSubmissions();

            autoDownloadInterval = setInterval(() => {
                pollForNewSubmissions();
            }, 5000);
        }

        async function pollForNewSubmissions() {
            try {
                const res = await fetch(`${API_BASE}/api/submissions/latest`);
                if(!res.ok) return;
                const data = await res.json();
                
                if(data.latest_id && data.latest_id > 0) {
                    // Check if new submission arrived
                    if(lastSeenSubmissionId > 0 && data.latest_id > lastSeenSubmissionId) {
                        const fmt = document.getElementById('auto-download-format')?.value || 'json';
                        const dlUrl = `${API_BASE}/api/submissions/${data.latest_id}/download?format=${fmt}`;
                        const candClean = (data.candidate_id || "Cand").replace(/[^a-zA-Z0-9_-]/g, "");
                        const fileName = `JFT_Submission_${candClean}_${data.latest_id}.${fmt}`;
                        
                        triggerBrowserDownload(dlUrl, fileName);

                        const bannerLast = document.getElementById('auto-download-last-file');
                        if(bannerLast) bannerLast.innerText = `Auto-downloaded: ${data.candidate_id} (${data.candidate_name}) #${data.latest_id}`;

                        // Refresh table
                        fetchSubmissions();
                    }
                    lastSeenSubmissionId = Math.max(lastSeenSubmissionId, data.latest_id);
                }
            } catch(e) {
                console.warn("Auto-download polling check failed:", e);
            }
        }

        function triggerBrowserDownload(url, filename) {
            const a = document.createElement('a');
            a.href = url;
            a.download = filename || '';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        }

        // --- CBT EXAM ADMIN MANAGEMENT ---
        let pendingAdminCbtJson = null;

        function previewCbtJson(input) {
            const file = input.files[0];
            const statusEl = document.getElementById('cbt-json-status');
            if(!file) return;

            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const raw = JSON.parse(e.target.result);
                    let qs = [];
                    if(Array.isArray(raw)) qs = raw;
                    else if(raw && Array.isArray(raw.questions)) qs = raw.questions;

                    if(qs.length === 0) throw new Error("No questions array found");

                    pendingAdminCbtJson = {
                        title: raw.title || file.name.replace('.json', ''),
                        passMark: raw.passMark || 200,
                        duration: raw.duration || 60,
                        questions: qs
                    };
                    document.getElementById('cbt-exam-title').value = pendingAdminCbtJson.title;
                    document.getElementById('cbt-pass-mark').value = pendingAdminCbtJson.passMark;
                    document.getElementById('cbt-exam-duration').value = pendingAdminCbtJson.duration;
                    statusEl.innerHTML = `<span class="text-emerald-400 font-bold">✓ Loaded ${qs.length} questions from "${file.name}"</span>`;
                } catch(err) {
                    statusEl.innerHTML = `<span class="text-red-400 font-bold">Error: ${err.message}</span>`;
                }
            };
            reader.readAsText(file);
        }

        async function saveCbtExamToDB() {
            const title = document.getElementById('cbt-exam-title').value.trim();
            const passMark = parseInt(document.getElementById('cbt-pass-mark').value, 10) || 200;
            const duration = parseInt(document.getElementById('cbt-exam-duration').value, 10) || 60;

            if(!title) return alert("Please enter an exam title");
            const qs = pendingAdminCbtJson ? pendingAdminCbtJson.questions : (allCbtExams[0] ? allCbtExams[0].questions : []);
            if(!qs || qs.length === 0) return alert("Please upload a valid CBT JSON file first");

            const newExam = {
                id: "cbt_" + Date.now(),
                title: title,
                passMark: passMark,
                duration: duration,
                questions: qs
            };

            try {
                const res = await fetch(`${API_BASE}/api/exams`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(newExam)
                });
                if(!res.ok) {
                    const errJson = await res.json().catch(() => ({}));
                    const detailMsg = (typeof errJson.detail === 'string') 
                        ? errJson.detail 
                        : (Array.isArray(errJson.detail) ? errJson.detail.map(d => (d.loc ? d.loc.join('.') + ': ' : '') + d.msg).join(', ') : "Failed to save on server");
                    throw new Error(detailMsg);
                }
                await loadCbtExams();
                alert(`Success: CBT Exam "${title}" saved and published to all students!`);
            } catch(e) {
                alert("Error saving exam: " + e.message);
            }
        }

        function renderAdminCbtList() {
            const container = document.getElementById('admin-cbt-list');
            if(!container) return;
            if(allCbtExams.length === 0) {
                container.innerHTML = '<span class="text-xs text-gray-400">No CBT exams saved.</span>';
                return;
            }
            container.innerHTML = allCbtExams.map(ex => {
                const isActive = ex.isActive !== false;
                return `
                <div class="p-3 bg-white/5 border ${isActive ? 'border-cyan-400/30' : 'border-white/10 opacity-70'} rounded-xl flex flex-wrap justify-between items-center gap-3">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="font-bold text-cyan-200 text-sm">${ex.title}</span>
                            ${isActive
                                ? '<span class="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">🟢 Active (Visible)</span>'
                                : '<span class="text-[10px] bg-slate-500/20 text-slate-400 border border-slate-500/40 px-2 py-0.5 rounded font-bold">⚪ Inactive (Hidden)</span>'
                            }
                        </div>
                        <div class="text-[11px] text-gray-400 mt-1">
                            ${ex.questions ? ex.questions.length : 0} Questions • ${ex.duration || 60} Min • Pass: ${ex.passMark || 200}/250
                        </div>
                    </div>
                    <div class="flex items-center gap-2">
                        <button onclick="toggleCbtExamActive('${ex.id}')" class="px-3 py-1.5 rounded-lg text-xs font-bold border transition ${isActive ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'}">
                            ${isActive ? '👁️ Hide' : '👁️ Show'}
                        </button>
                        <button onclick="deleteCbtExam('${ex.id}', '${encodeURIComponent(ex.title)}')" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition">
                            🗑️ Delete
                        </button>
                    </div>
                </div>
            `;
            }).join('');
        }

        async function toggleCbtExamActive(examId) {
            try {
                const res = await fetch(`${API_BASE}/api/exams/${encodeURIComponent(examId)}/toggle-active`, {
                    method: 'POST'
                });
                if(!res.ok) throw new Error("Failed to toggle exam status on server");
                const data = await res.json();
                const ex = allCbtExams.find(x => x.id === examId);
                if(ex) ex.isActive = data.isActive;
                renderStudentCbtList();
                renderAdminCbtList();
            } catch(e) {
                const ex = allCbtExams.find(x => x.id === examId);
                if(ex) {
                    ex.isActive = (ex.isActive === false) ? true : false;
                    localStorage.setItem('jft_cbt_db', JSON.stringify(allCbtExams));
                    renderStudentCbtList();
                    renderAdminCbtList();
                }
            }
        }

        async function deleteCbtExam(examId, title) {
            const decodedTitle = decodeURIComponent(title || examId);
            if(!confirm(`Are you sure you want to delete CBT Exam:\n"${decodedTitle}"?\n\nThis cannot be undone.`)) return;
            try {
                const res = await fetch(`${API_BASE}/api/exams/${encodeURIComponent(examId)}`, {
                    method: 'DELETE'
                });
                if(!res.ok) throw new Error("Failed to delete exam from server");
                await loadCbtExams();
            } catch(e) {
                allCbtExams = allCbtExams.filter(x => x.id !== examId);
                localStorage.setItem('jft_cbt_db', JSON.stringify(allCbtExams));
                renderStudentCbtList();
                renderAdminCbtList();
            }
        }

        function downloadSampleScriptJson() {
            const sample = {
                "title": "JFT-Basic Listening Dialogue Scripts (a.mp3 to j.mp3)",
                "scripts": [
                    {
                        "id": "a.mp3",
                        "dialogueId": "dialogue_a_q21",
                        "title": "Question 21: コンビニでの買い物",
                        "targetAudio": "a.mp3",
                        "dialogues": [
                            { "id": 1, "speaker": "男 (Man)", "text": "すみません、このコーヒーと、このヨーグルトをください。" },
                            { "id": 2, "speaker": "店員 (Female)", "text": "はい、かしこまりました。420円になります。" }
                        ]
                    }
                ]
            };
            const blob = new Blob([JSON.stringify(sample, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = "sample_dialogue_scripts.json";
            a.click();
            URL.revokeObjectURL(url);
        }

        function downloadSampleCbtJson() {
            window.open('/data/jft_40q_unified_cbt_with_dialogues.json', '_blank');
        }

        function buildRow(n, g, t) {
            const p = t > 0 ? (g / t) * 100 : 0;
            return `<div class="flex items-center gap-4 mb-2"><div class="w-1/3 text-[11px] font-bold text-gray-700">${n}</div><div class="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden border"><div class="h-full bg-blue-600" style="width: ${p}%"></div></div><div class="w-12 text-right text-[11px] font-bold">${Math.round(p)}%</div></div>`;
        }

        function downloadPDF() {
            const element = document.getElementById('cert-area');
            html2pdf().from(element).set({
                margin: 0,
                filename: 'JFT_CBT_Result_' + (document.getElementById('s-name').value || 'Candidate') + '.pdf',
                html2canvas: { scale: 3 },
                jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
            }).save();
        }

        // --- RESULT SCREEN NAVIGATION & RETEST LOGIC ---
        function returnToCbtSelectionFromResult() {
            // Hide result certificate screen
            const resEl = document.getElementById('result-ui');
            if(resEl) resEl.classList.add('hidden');

            // Clear any lingering session keys
            clearCbtSession();
            clearModelSession();

            // Stop any active timer
            if(cbtTimerInterval) {
                clearInterval(cbtTimerInterval);
                cbtTimerInterval = null;
            }
            if(timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }

            // Reset active exam state variables
            activeCbtExam = null;
            cbtQuestions = [];
            cbtAnswers = {};
            cbtFlags = {};
            cbtAudioPlays = {};

            // Ensure top nav bar is visible
            const nav = document.getElementById('top-nav-bar');
            if(nav) nav.classList.remove('hidden');

            // Hide other screens
            const hideIds = ['view-home', 'view-mock', 'view-about', 'view-courses', 'login-sec', 'portal-choice-sec', 'cbt-start-sec', 'selection-sec', 'start-page-sec', 'cbt-exam-ui', 'exam-ui', 'admin-panel-sec'];
            hideIds.forEach(id => {
                const el = document.getElementById(id);
                if(el) el.classList.add('hidden');
            });

            // Open CBT Exam Selection view directly
            const cbtSec = document.getElementById('cbt-selection-sec');
            if(cbtSec) cbtSec.classList.remove('hidden');

            // Refresh student CBT list to show all active exams
            renderStudentCbtList();

            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        function returnToHomeFromResult() {
            const resEl = document.getElementById('result-ui');
            if(resEl) resEl.classList.add('hidden');

            clearCbtSession();
            clearModelSession();

            if(cbtTimerInterval) {
                clearInterval(cbtTimerInterval);
                cbtTimerInterval = null;
            }
            if(timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }

            activeCbtExam = null;
            cbtQuestions = [];
            cbtAnswers = {};
            cbtFlags = {};
            cbtAudioPlays = {};

            navigateTo('home');
        }

        function retryCurrentCbtExam() {
            const resEl = document.getElementById('result-ui');
            if(resEl) resEl.classList.add('hidden');

            clearCbtSession();

            if(cbtTimerInterval) {
                clearInterval(cbtTimerInterval);
                cbtTimerInterval = null;
            }

            cbtAnswers = {};
            cbtFlags = {};
            cbtAudioPlays = {};
            cbtCurrentIdx = 0;

            if(activeCbtExam) {
                selectCbtExam(activeCbtExam.id);
            } else {
                returnToCbtSelectionFromResult();
            }
        }

        function openAdmin() {
            const key = prompt("Admin Key:");
            if(key === "9902") {
                document.getElementById('admin-panel').classList.remove('hidden');
                switchAdminTab('cbt');
            }
        }
        function closeAdmin() { document.getElementById('admin-panel').classList.add('hidden'); }

        function checkStoredBg() {
            const savedBg = localStorage.getItem('exam_global_bg');
            if(savedBg) document.body.style.backgroundImage = `url('${savedBg}')`;
            const savedGlass = localStorage.getItem('exam_glass_opacity');
            if(savedGlass) updateGlassOpacity(savedGlass);
        }

// --- PDF MODEL TEST BUILDER & CATEGORIES ENGINE ---
        function renderGroupOptions() {
            const select = document.getElementById('model-group-select');
            if(select) {
                select.innerHTML = groups.map(g => `<option value="${g}">${g}</option>`).join('');
            }
            
            const container = document.getElementById('group-container');
            if(container) {
                container.innerHTML = groups.map((g, i) => `
                    <div onclick="showModels(groups[${i}])" class="group-card glass-panel p-8 text-center">
                        <h3 class="text-2xl font-bold text-blue-300 uppercase">${g}</h3>
                        <p class="text-[10px] mt-2 text-gray-400">View Question Models</p>
                    </div>
                `).join('');
            }
            renderActiveGroupsChips();
        }

        function renderActiveGroupsChips() {
            const container = document.getElementById('active-groups-list');
            if(!container) return;
            container.innerHTML = groups.map(g => `
                <span class="bg-blue-500/20 text-blue-300 border border-blue-400/30 px-3 py-1 rounded-lg text-xs font-bold">${g}</span>
            `).join('');
        }

        function addNewGroup() {
            const nameInput = document.getElementById('new-group-name');
            const name = nameInput.value.trim();
            if(!name) return alert("Please enter a group name");
            
            if(!groups.includes(name)) {
                groups.push(name);
                localStorage.setItem('exam_groups', JSON.stringify(groups));
                renderGroupOptions();
                nameInput.value = "";
                alert("Success: Group '" + name + "' added to categories!");
            } else {
                alert("Group already exists!");
            }
        }

        function addObj(type, data = null) {
            const builder = document.getElementById('builder');
            const hint = document.getElementById('builder-empty-hint');
            if(hint) hint.remove();

            const div = document.createElement('div');
            const id = data ? data.id : "q_" + Date.now();
            if(type === 's') {
                div.className = "section-item glass-panel p-4 flex flex-wrap gap-4 items-center border-l-8 border-orange-500";
                div.dataset.type = "s";
                div.innerHTML = `
                    <input type="text" placeholder="Section Title (e.g. Vocabulary)" class="glass-input p-2.5 flex-1 font-bold text-xs rounded-xl min-w-[180px]">
                    <div class="flex items-center gap-2">
                        <span class="text-xs text-gray-300 font-bold">Pts:</span>
                        <input type="number" placeholder="Pts" class="sec-mark w-16 glass-input p-2 text-center font-bold text-xs rounded-xl" value="1">
                        <button onclick="if(confirm('Delete this section?')) { this.closest('.section-item').remove(); updateCounters(); }" class="bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/40 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1">
                            🗑️ Delete Section
                        </button>
                    </div>
                `;
            } else {
                div.className = "question-item glass-panel p-4 flex flex-col gap-2 border-l-8 border-blue-500 ml-4 md:ml-10";
                div.dataset.type = "q"; div.dataset.id = id;
                div.innerHTML = `
                    <div class="flex flex-wrap justify-between items-center gap-2">
                        <span class="q-no q-badge">Q-?</span>
                        <div class="flex flex-wrap gap-2 items-center">
                            <span class="text-[10px] text-gray-400 font-bold">Correct Ans:</span>
                            <select class="ans-val glass-input p-1.5 text-xs rounded-lg">${[1,2,3,4].map(n => `<option value="${n}">${n}</option>`).join('')}</select>
                            <button onclick="this.closest('.question-item').remove(); updateCounters();" class="bg-rose-500/20 hover:bg-rose-500/40 text-rose-300 border border-rose-500/40 px-2.5 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1">
                                🗑️ Delete Question
                            </button>
                        </div>
                    </div>
                    <div class="flex items-center gap-2 pt-1">
                        <span class="text-[10px] text-gray-400">Audio (Optional):</span>
                        <input type="file" accept="audio/*" onchange="uploadAudio(this, '${id}')" class="text-[10px] text-gray-300">
                    </div>
                `;
            }
            builder.appendChild(div);
            updateCounters();
        }

        function updateCounters() {
            const qCount = document.querySelectorAll('.question-item').length;
            const counterEl = document.getElementById('count-q');
            const counterBadge = document.getElementById('count-q-badge');
            if(counterEl) counterEl.innerText = qCount;
            if(counterBadge) counterBadge.innerText = qCount;
            document.querySelectorAll('.question-item').forEach((item, index) => {
                const badge = item.querySelector('.q-no');
                if(badge) badge.innerText = `Q-${index + 1}`;
            });
        }

        function uploadAudio(input, id) {
            const reader = new FileReader();
            reader.onload = (e) => audioData[id] = e.target.result;
            reader.readAsDataURL(input.files[0]);
        }

        function saveExamToDB() {
            const mName = document.getElementById('model-name').value.trim();
            const mGroup = document.getElementById('model-group-select').value;
            if(!mName) return alert("Error: Please provide a Model Name");

            const items = document.querySelectorAll('#builder > div');
            if(items.length === 0) return alert("Add some questions first using '+ Add Section' or '+ Add Question'!");

            const examData = Array.from(items).map(el => ({
                type: el.dataset.type,
                id: el.dataset.id,
                title: el.querySelector('input')?.value || "",
                fixedMark: el.querySelector('.sec-mark')?.value || 1,
                correct: el.querySelector('.ans-val')?.value || 1,
                audio: el.dataset.id ? audioData[el.dataset.id] : null
            }));

            const payload = { 
                group: mGroup,
                modelName: mName, 
                passMark: document.getElementById('pass-mark').value, 
                duration: document.getElementById('exam-duration').value, 
                examData: examData,
                isActive: true
            };

            allExams.push(payload);
            localStorage.setItem('jft_exam_db', JSON.stringify(allExams));
            alert("Success: Exam model saved under '" + mGroup + "' group!");
            renderGroupOptions();
            renderAdminModelList();
            renderHomeExams();
            if(typeof renderMockTestsView === 'function') renderMockTestsView(currentMockFilter || 'all');
        }

        function renderAdminModelList() {
            const container = document.getElementById('admin-model-list');
            if(!container) return;
            if(allExams.length === 0) {
                container.innerHTML = '<div class="p-4 bg-white/5 border border-white/10 rounded-xl text-center text-xs text-gray-400">No PDF Model Tests saved in browser database.</div>';
                return;
            }
            container.innerHTML = allExams.map((ex, idx) => {
                const isActive = ex.isActive !== false;
                const qCount = ex.examData ? ex.examData.filter(i => i.type === 'q').length : 0;
                return `
                    <div class="p-3 bg-white/5 border ${isActive ? 'border-blue-500/30' : 'border-white/10 opacity-70'} rounded-xl flex flex-wrap justify-between items-center gap-3">
                        <div>
                            <div class="flex items-center gap-2">
                                <span class="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded font-bold uppercase">${ex.group || 'GENERAL'}</span>
                                <span class="text-xs font-black text-white">${ex.modelName}</span>
                                ${isActive 
                                    ? '<span class="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">🟢 Active (Visible)</span>'
                                    : '<span class="text-[10px] bg-slate-500/20 text-slate-400 border border-slate-500/40 px-2 py-0.5 rounded font-bold">⚪ Inactive (Hidden)</span>'
                                }
                            </div>
                            <div class="text-[11px] text-gray-400 mt-1">${qCount} Questions • Duration: ${ex.duration || 60} min • Pass: ${ex.passMark || 200}</div>
                        </div>
                        <div class="flex items-center gap-2">
                            <button onclick="toggleModelExamActive(${idx})" class="px-3 py-1.5 rounded-lg text-xs font-bold border transition ${isActive ? 'bg-amber-500/20 text-amber-300 border-amber-500/30 hover:bg-amber-500/30' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/30'}">
                                ${isActive ? '👁️ Hide' : '👁️ Show'}
                            </button>
                            <button onclick="deleteModelExam(${idx})" class="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30 transition">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function toggleModelExamActive(idx) {
            if(idx >= 0 && idx < allExams.length) {
                allExams[idx].isActive = (allExams[idx].isActive === false) ? true : false;
                localStorage.setItem('jft_exam_db', JSON.stringify(allExams));
                renderAdminModelList();
                renderHomeExams();
                if(typeof renderMockTestsView === 'function') renderMockTestsView(currentMockFilter || 'all');
            }
        }

        function deleteModelExam(idx) {
            if(idx >= 0 && idx < allExams.length) {
                const item = allExams[idx];
                if(!confirm(`Are you sure you want to delete PDF Model Test "${item.modelName}"?\n\nThis will remove it from saved tests.`)) return;
                allExams.splice(idx, 1);
                localStorage.setItem('jft_exam_db', JSON.stringify(allExams));
                renderAdminModelList();
            }
        }

        function showModels(groupName) {
            const filtered = allExams.filter(ex => ex.group === groupName && ex.isActive !== false);
            const btnArea = document.getElementById('model-buttons');
            document.getElementById('selected-group-title').innerText = groupName + " Models";
            btnArea.innerHTML = "";
            
            if(filtered.length === 0) {
                btnArea.innerHTML = "<p class='text-gray-500 text-center py-6 border border-dashed border-white/10 rounded-xl'>No active exam models found in this category.</p>";
            } else {
                filtered.forEach(ex => {
                    const btn = document.createElement('button');
                    btn.className = "bg-white/5 p-5 rounded-2xl border border-white/10 hover:bg-blue-600 text-left font-bold transition flex justify-between items-center group";
                    btn.innerHTML = `<span>${ex.modelName}</span><span class="text-[10px] bg-white/10 px-2 py-1 rounded group-hover:bg-black/20">${ex.duration} MIN</span>`;
                    btn.onclick = () => {
                        config = ex.examData;
                        time = ex.duration * 60;
                        document.getElementById('confirm-model-name').innerText = ex.modelName;
                        document.getElementById('selection-sec').classList.add('hidden');
                        document.getElementById('start-page-sec').classList.remove('hidden');
                    };
                    btnArea.appendChild(btn);
                });
            }
            document.getElementById('model-list-area').classList.remove('hidden');
            window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
        }

        function hideModels() {
            document.getElementById('model-list-area').classList.add('hidden');
        }
