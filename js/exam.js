/**
 * Examination Engines (Prometric CBT Simulation & Model Tests)
 * Question rendering, timer management, score calculation, session persistence, and submission handling.
 */

// --- CBT EXAM ENGINE ---
        function renderStudentCbtList() {
            const container = document.getElementById('cbt-list-container');
            if(!container) return;
            const visibleExams = allCbtExams.filter(ex => ex.isActive !== false);
            if(visibleExams.length === 0) {
                container.innerHTML = '<div class="col-span-2 glass-panel p-8 text-center text-gray-400">No active CBT Exams available right now. Please ask the instructor to activate an exam.</div>';
                return;
            }
            container.innerHTML = visibleExams.map(ex => `
                <div onclick="selectCbtExam('${ex.id}')" class="group-card glass-panel p-6 border border-cyan-500/30 hover:border-cyan-400 flex justify-between items-center cursor-pointer transition">
                    <div>
                        <div class="flex items-center gap-2">
                            <span class="text-[10px] bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded font-bold uppercase">JFT-Basic CBT Simulation</span>
                            <span class="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-bold">Active</span>
                        </div>
                        <h3 class="text-xl font-black text-white mt-2">${ex.title}</h3>
                        <p class="text-xs text-gray-400 mt-1">${ex.questions.length} Questions • Pass Score: ${ex.passMark}/250</p>
                    </div>
                    <div class="text-right">
                        <div class="text-sm font-black text-cyan-300">${ex.duration} MIN</div>
                        <div class="text-[10px] text-gray-400 mt-1">Start Exam →</div>
                    </div>
                </div>
            `).join('');
        }

        function selectCbtExam(id) {
            const found = allCbtExams.find(x => x.id === id);
            if(!found) return;
            activeCbtExam = found;
            document.getElementById('confirm-cbt-name').innerText = found.title;
            document.getElementById('confirm-cbt-duration').innerText = found.duration;
            document.getElementById('confirm-cbt-pass').innerText = found.passMark;
            document.getElementById('confirm-cbt-qcount').innerText = found.questions.length;

            document.getElementById('cbt-selection-sec').classList.add('hidden');
            document.getElementById('cbt-start-sec').classList.remove('hidden');
        }

        function launchCbtExam() {
            if(!activeCbtExam) return;
            document.getElementById('cbt-start-sec').classList.add('hidden');
            document.getElementById('top-nav-bar').classList.add('hidden');
            document.getElementById('cbt-exam-ui').classList.remove('hidden');

            const photo = document.getElementById('s-photo').files[0];
            if(photo) {
                const reader = new FileReader();
                reader.onload = (e) => document.getElementById('res-photo').src = e.target.result;
                reader.readAsDataURL(photo);
            }

            cbtQuestions = activeCbtExam.questions;
            cbtCurrentIdx = 0;
            cbtAnswers = {};
            cbtFlags = {};
            cbtAudioPlays = {};
            time = (parseInt(activeCbtExam.duration, 10) || 60) * 60;

            document.getElementById('cbt-header-title').innerText = activeCbtExam.title;
            document.getElementById('cbt-candidate-name').innerText = document.getElementById('s-name').value || "CANDIDATE";

            renderCbtQuestion();
            startCbtTimer();
            saveCbtSession();
        }

        // --- CBT Session Persistence (Prevents session loss on desktop site toggle / reload) ---
        function saveCbtSession() {
            if(!activeCbtExam || !cbtQuestions || cbtQuestions.length === 0) return;
            try {
                const payload = {
                    activeCbtExam: activeCbtExam,
                    cbtQuestions: cbtQuestions,
                    cbtCurrentIdx: cbtCurrentIdx,
                    cbtAnswers: cbtAnswers,
                    cbtFlags: cbtFlags,
                    cbtAudioPlays: cbtAudioPlays,
                    time: time,
                    savedAt: Date.now(),
                    candidateName: document.getElementById('s-name')?.value || "CANDIDATE",
                    candidateReg: document.getElementById('s-reg')?.value || "JFT-TEST",
                    candidateDob: document.getElementById('s-dob')?.value || "",
                    candidateLoc: document.getElementById('s-loc')?.value || ""
                };
                localStorage.setItem(CBT_SESSION_KEY, JSON.stringify(payload));
            } catch(e) {
                console.warn("Could not save CBT session:", e);
            }
        }

        function clearCbtSession() {
            try {
                localStorage.removeItem(CBT_SESSION_KEY);
            } catch(e) {}
        }

        function tryRestoreCbtSession() {
            try {
                const raw = localStorage.getItem(CBT_SESSION_KEY);
                if(!raw) return false;
                const session = JSON.parse(raw);
                if(!session || !session.activeCbtExam || !session.cbtQuestions) return false;

                const elapsedSec = Math.floor((Date.now() - session.savedAt) / 1000);
                const remainingTime = (session.time || 3600) - elapsedSec;
                if(remainingTime <= 0) {
                    clearCbtSession();
                    return false;
                }

                activeCbtExam = session.activeCbtExam;
                cbtQuestions = session.cbtQuestions;
                cbtCurrentIdx = session.cbtCurrentIdx || 0;
                cbtAnswers = session.cbtAnswers || {};
                cbtFlags = session.cbtFlags || {};
                cbtAudioPlays = session.cbtAudioPlays || {};
                time = remainingTime;

                if(document.getElementById('s-name') && session.candidateName) document.getElementById('s-name').value = session.candidateName;
                if(document.getElementById('s-reg') && session.candidateReg) document.getElementById('s-reg').value = session.candidateReg;
                if(document.getElementById('s-dob') && session.candidateDob) document.getElementById('s-dob').value = session.candidateDob;
                if(document.getElementById('s-loc') && session.candidateLoc) document.getElementById('s-loc').value = session.candidateLoc;

                document.getElementById('login-sec')?.classList.add('hidden');
                document.getElementById('portal-choice-sec')?.classList.add('hidden');
                document.getElementById('cbt-selection-sec')?.classList.add('hidden');
                document.getElementById('cbt-start-sec')?.classList.add('hidden');
                document.getElementById('top-nav-bar')?.classList.add('hidden');
                document.getElementById('cbt-exam-ui')?.classList.remove('hidden');

                document.getElementById('cbt-header-title').innerText = activeCbtExam.title;
                document.getElementById('cbt-candidate-name').innerText = session.candidateName || "CANDIDATE";

                renderCbtQuestion();
                startCbtTimer();
                console.log("CBT active exam session successfully restored!");
                return true;
            } catch(e) {
                console.error("Failed to restore CBT session:", e);
                return false;
            }
        }

        function renderCbtSectionTabs() {
            const sections = [...new Set(cbtQuestions.map(q => q.section))];
            const currentSec = cbtQuestions[cbtCurrentIdx] ? cbtQuestions[cbtCurrentIdx].section : "";
            const tabContainer = document.getElementById('cbt-section-tabs');
            tabContainer.innerHTML = "";
            sections.forEach(sec => {
                const tab = document.createElement('div');
                tab.className = "cbt-sec-tab " + (sec === currentSec ? "active" : "");
                tab.innerText = sec;
                tab.onclick = () => jumpToCbtSection(sec);
                tabContainer.appendChild(tab);
            });
        }

        function jumpToCbtSection(secName) {
            const idx = cbtQuestions.findIndex(q => q.section === secName);
            if(idx !== -1) {
                navigateCbtQuestion(idx);
            }
        }

        function renderCbtPalette() {
            const grid = document.getElementById('cbt-q-grid');
            grid.innerHTML = cbtQuestions.map((q, idx) => {
                const qKey = q.id || `q_${idx}`;
                const isAns = cbtAnswers[qKey] !== undefined;
                const isCurr = idx === cbtCurrentIdx;
                const isFlag = cbtFlags[qKey];
                return `<div onclick="jumpToCbtQuestion(${idx})" class="cbt-q-nav-btn ${isAns ? 'answered' : ''} ${isCurr ? 'current' : ''} ${isFlag ? 'flagged' : ''}">${idx + 1}</div>`;
            }).join('');

            const ansCount = Object.keys(cbtAnswers).length;
            document.getElementById('cbt-progress-text').innerText = `${ansCount} / ${cbtQuestions.length} Answered`;
        }

        function toggleCbtPalette() {
            document.getElementById('cbt-palette-drawer').classList.toggle('hidden');
        }

        function jumpToCbtQuestion(idx) {
            navigateCbtQuestion(idx);
        }

        function toggleCbtFlag() {
            const q = cbtQuestions[cbtCurrentIdx];
            if(!q) return;
            const qKey = q.id || `q_${cbtCurrentIdx}`;
            cbtFlags[qKey] = !cbtFlags[qKey];
            renderCbtQuestion();
            saveCbtSession();
        }

        function renderCbtQuestion() {
            const q = cbtQuestions[cbtCurrentIdx];
            if(!q) return;
            const qKey = q.id || `q_${cbtCurrentIdx}`;

            renderCbtSectionTabs();
            renderCbtPalette();

            document.getElementById('cbt-sec-badge').innerText = q.section;
            document.getElementById('cbt-q-counter').innerText = `Question ${cbtCurrentIdx + 1} of ${cbtQuestions.length}`;
            document.getElementById('cbt-instruction-box').innerText = q.instruction || "つぎの もんだいを よんで、いちばん いいものを ひとつ えらんでください。";

            const flagBtn = document.getElementById('cbt-flag-btn');
            const flagTxt = document.getElementById('cbt-flag-text');
            if(cbtFlags[qKey]) {
                flagBtn.className = "px-3 py-1 rounded text-xs font-bold border border-red-500 bg-red-50 text-red-700 flex items-center gap-1.5 shadow-sm";
                flagTxt.innerText = "Flagged (見直し中)";
            } else {
                flagBtn.className = "px-3 py-1 rounded text-xs font-bold border border-gray-400 bg-white hover:bg-gray-100 text-gray-800 flex items-center gap-1.5 shadow-sm";
                flagTxt.innerText = "Flag for Review (後で見直す)";
            }

            // Passage
            const passageBox = document.getElementById('cbt-passage-box');
            if(q.passage && q.passage.trim() !== "") {
                passageBox.innerText = q.passage;
                passageBox.classList.remove('hidden');
            } else {
                passageBox.classList.add('hidden');
            }

            // Image
            const imgBox = document.getElementById('cbt-image-box');
            const imgEl = document.getElementById('cbt-q-image');
            if(q.image && q.image.trim() !== "") {
                imgEl.src = q.image;
                imgBox.classList.remove('hidden');
            } else {
                imgBox.classList.add('hidden');
            }

            // Audio Player with Prometric 2-plays limit
            const audioBox = document.getElementById('cbt-audio-box');
            const audioPlayer = document.getElementById('cbt-audio-player');
            if(q.audio && q.audio.trim() !== "") {
                audioBox.classList.remove('hidden');
                const resolvedAudio = resolveAudioUrl(q.audio.startsWith('/') || q.audio.startsWith('http') ? q.audio : `/audio/${q.audio}`);
                audioPlayer.src = resolvedAudio;
                
                const plays = cbtAudioPlays[qKey] || 0;
                document.getElementById('cbt-audio-plays').innerText = `Played: ${plays} / 2`;
                audioPlayer.onplay = () => {
                    if((cbtAudioPlays[qKey] || 0) >= 2) {
                        audioPlayer.pause();
                        alert("In JFT-Basic CBT rules, listening audio can only be played up to 2 times.");
                    }
                };
                audioPlayer.onended = () => {
                    cbtAudioPlays[qKey] = (cbtAudioPlays[qKey] || 0) + 1;
                    document.getElementById('cbt-audio-plays').innerText = `Played: ${cbtAudioPlays[qKey]} / 2`;
                    saveCbtSession();
                };
            } else {
                audioPlayer.pause();
                audioPlayer.src = "";
                audioBox.classList.add('hidden');
            }

            document.getElementById('cbt-question-text').innerText = q.question;
            const optsContainer = document.getElementById('cbt-options-container');
            optsContainer.innerHTML = "";
            const labels = ["A", "B", "C", "D"];
            q.options.forEach((optText, idx) => {
                const choiceNum = idx + 1;
                const isSelected = cbtAnswers[qKey] === choiceNum;
                const box = document.createElement('div');
                box.className = "cbt-option-box " + (isSelected ? "selected" : "");
                box.onclick = () => selectCbtOption(qKey, choiceNum);
                box.innerHTML = `
                    <div class="cbt-option-radio">${labels[idx] || choiceNum}</div>
                    <div class="flex-1">${optText}</div>
                `;
                optsContainer.appendChild(box);
            });

            document.getElementById('cbt-prev-btn').disabled = (cbtCurrentIdx === 0);
            document.getElementById('cbt-prev-btn').style.opacity = (cbtCurrentIdx === 0) ? "0.4" : "1";
            document.getElementById('cbt-next-btn').innerText = (cbtCurrentIdx === cbtQuestions.length - 1) ? "Finish Review ▶" : "Next (次へ) ▶";
        }

        function selectCbtOption(qKey, choiceNum) {
            cbtAnswers[qKey] = choiceNum;
            renderCbtQuestion();
            saveCbtSession();
        }

        function cbtStepQuestion(step) {
            navigateCbtQuestion(cbtCurrentIdx + step);
        }

        // --- SECTION NAVIGATION & CONFIRMATION WARNING MODAL ---
        let pendingTargetIdx = null;

        function navigateCbtQuestion(targetIdx) {
            if(targetIdx < 0) return;
            if(targetIdx >= cbtQuestions.length) {
                confirmFinishCbt();
                return;
            }
            const currentQ = cbtQuestions[cbtCurrentIdx];
            const targetQ = cbtQuestions[targetIdx];
            if(currentQ && targetQ && currentQ.section && targetQ.section && currentQ.section !== targetQ.section) {
                showSectionWarningModal(currentQ.section, targetQ.section, targetIdx);
                return;
            }
            cbtCurrentIdx = targetIdx;
            renderCbtQuestion();
            saveCbtSession();
        }

        function showSectionWarningModal(currentSec, targetSec, targetIdx) {
            pendingTargetIdx = targetIdx;
            const secQuestions = cbtQuestions.filter(q => q.section === currentSec);
            const total = secQuestions.length;
            let answered = 0;
            let flagged = 0;
            secQuestions.forEach(q => {
                const idxInAll = cbtQuestions.indexOf(q);
                const qKey = q.id || `q_${idxInAll}`;
                if(cbtAnswers[qKey] !== undefined) answered++;
                if(cbtFlags[qKey]) flagged++;
            });
            const unanswered = total - answered;
            const pct = total > 0 ? Math.round((answered / total) * 100) : 0;

            const curEl = document.getElementById('sec-warn-current-name');
            if(curEl) curEl.innerText = currentSec;
            const tgtEl = document.getElementById('sec-warn-target-name');
            if(tgtEl) tgtEl.innerText = targetSec;
            const totEl = document.getElementById('sec-warn-total');
            if(totEl) totEl.innerText = total;
            const ansEl = document.getElementById('sec-warn-answered');
            if(ansEl) ansEl.innerText = answered;
            const unEl = document.getElementById('sec-warn-unanswered');
            if(unEl) unEl.innerText = unanswered;
            const barEl = document.getElementById('sec-warn-bar');
            if(barEl) barEl.style.width = `${pct}%`;

            const flagInfo = document.getElementById('sec-warn-flag-info');
            const flagTxt = document.getElementById('sec-warn-flag-text');
            if(flagInfo && flagTxt) {
                if(flagged > 0) {
                    flagInfo.classList.remove('hidden');
                    flagTxt.innerText = `${flagged} question${flagged > 1 ? 's' : ''} flagged for review in this section`;
                } else {
                    flagInfo.classList.add('hidden');
                }
            }

            const modal = document.getElementById('cbt-sec-warning-modal');
            if(modal) modal.classList.remove('hidden');
        }

        function confirmSectionNavigation() {
            const modal = document.getElementById('cbt-sec-warning-modal');
            if(modal) modal.classList.add('hidden');
            if(pendingTargetIdx !== null) {
                cbtCurrentIdx = pendingTargetIdx;
                pendingTargetIdx = null;
                renderCbtQuestion();
                saveCbtSession();
            }
        }

        function cancelSectionNavigation() {
            const modal = document.getElementById('cbt-sec-warning-modal');
            if(modal) modal.classList.add('hidden');
            pendingTargetIdx = null;
        }

        function startCbtTimer() {
            if(cbtTimerInterval) clearInterval(cbtTimerInterval);
            cbtTimerInterval = setInterval(() => {
                if(time <= 0) {
                    clearInterval(cbtTimerInterval);
                    finishCbtExam();
                    return;
                }
                let m = Math.floor(time / 60), s = time % 60;
                document.getElementById('cbt-timer').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
                time--;
                if(time % 5 === 0) saveCbtSession();
            }, 1000);
        }

        function confirmFinishCbt() {
            const answered = Object.keys(cbtAnswers).length;
            const total = cbtQuestions.length;
            const msg = answered < total
                ? `You have answered ${answered} of ${total} questions. Are you sure you want to finish the exam now?`
                : `Are you sure you want to submit your CBT exam?`;
            if(confirm(msg)) {
                finishCbtExam();
            }
        }

        async function finishCbtExam() {
            clearCbtSession();
            if(cbtTimerInterval) clearInterval(cbtTimerInterval);
            const audioPlayer = document.getElementById('cbt-audio-player');
            if(audioPlayer) audioPlayer.pause();

            let grandTotal = 0, userScore = 0;
            const secStats = {};

            cbtQuestions.forEach((q, idx) => {
                const qKey = q.id || `q_${idx}`;
                const m = parseInt(q.mark, 10) || 6;
                grandTotal += m;
                if(!secStats[q.section]) secStats[q.section] = { user: 0, possible: 0 };
                secStats[q.section].possible += m;

                if(cbtAnswers[qKey] == q.correct) {
                    userScore += m;
                    secStats[q.section].user += m;
                }
            });

            let sectionHTML = "";
            const sectionListForSub = [];
            Object.keys(secStats).forEach(secName => {
                sectionHTML += buildRow(secName, secStats[secName].user, secStats[secName].possible);
                sectionListForSub.push({
                    name: secName,
                    score: secStats[secName].user,
                    total: secStats[secName].possible,
                    percent: Math.round((secStats[secName].user / (secStats[secName].possible || 1)) * 100)
                });
            });

            const passMarkVal = parseInt(activeCbtExam ? activeCbtExam.passMark : 200, 10) || 200;
            const scaled = Math.round((userScore / (grandTotal || 1)) * 250);
            const isPassed = scaled >= passMarkVal;

            document.getElementById('res-total').innerText = scaled;
            document.getElementById('res-name').innerText = document.getElementById('s-name').value;
            document.getElementById('res-reg').innerText = document.getElementById('s-reg').value;
            document.getElementById('res-dob').innerText = document.getElementById('s-dob').value;
            document.getElementById('res-loc').innerText = document.getElementById('s-loc').value;
            document.getElementById('res-date').innerText = new Date().toLocaleDateString();
            document.getElementById('total-score-fill').style.width = (scaled / 250 * 100) + "%";
            document.getElementById('total-marker').innerText = scaled;

            const msg = document.getElementById('result-message');
            msg.innerHTML = isPassed ? "RESULT: PASSED (合格)" : "RESULT: FAILED (不合格)";
            msg.className = isPassed ? "p-4 border rounded bg-green-50 text-green-800 font-bold mb-8 text-center" : "p-4 border rounded bg-red-50 text-red-800 font-bold mb-8 text-center";
            document.getElementById('res-breakdown').innerHTML = sectionHTML;

            // Submit exam results to PostgreSQL backend (users, exam_submissions, submission_answers)
            try {
                const submissionQuestions = cbtQuestions.map((q, idx) => {
                    const qKey = q.id || `q_${idx}`;
                    const selectedVal = cbtAnswers[qKey];
                    return {
                        question_number: idx + 1,
                        section_name: q.section || "General",
                        question_text: q.question,
                        options: q.options || [],
                        selected_option: selectedVal !== undefined ? selectedVal : null,
                        correct_option: q.correct,
                        mark: parseInt(q.mark, 10) || 6
                    };
                });

                const subPayload = {
                    candidate_id: (document.getElementById('s-reg').value || "").trim() || ("JFT-" + Math.floor(1000 + Math.random()*9000)),
                    full_name: (document.getElementById('s-name').value || "").trim() || "Candidate",
                    password: "password",
                    dob: document.getElementById('s-dob')?.value || "",
                    location: document.getElementById('s-loc')?.value || "",
                    examTitle: activeCbtExam ? activeCbtExam.title : "JFT-Basic CBT Exam",
                    total_questions: cbtQuestions.length,
                    totalScore: scaled,
                    maxScore: 250,
                    passMark: passMarkVal,
                    isPassed: isPassed,
                    sections: sectionListForSub,
                    questions: submissionQuestions,
                    date: new Date().toLocaleString()
                };

                const subRes = await fetch(`${API_BASE}/api/submit-exam`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(subPayload)
                });
                const subData = await subRes.json();
                console.log("Exam successfully saved to PostgreSQL database:", subData);
            } catch(subErr) {
                console.warn("Could not submit score to PostgreSQL server:", subErr);
            }

            document.getElementById('cbt-exam-ui').classList.add('hidden');
            document.getElementById('top-nav-bar').classList.remove('hidden');
            document.getElementById('result-ui').classList.remove('hidden');
        }

// --- MODEL TEST EXAM ENGINE & SESSION PERSISTENCE ---
        function saveModelSession() {
            if(!config || config.length === 0 || document.getElementById('exam-ui')?.classList.contains('hidden')) return;
            try {
                const payload = {
                    config: config,
                    time: time,
                    userAnswers: userAnswers,
                    savedAt: Date.now(),
                    candidateName: document.getElementById('s-name')?.value || "Candidate",
                    passMark: document.getElementById('pass-mark')?.value || 200
                };
                localStorage.setItem(MODEL_SESSION_KEY, JSON.stringify(payload));
            } catch(e) {}
        }

        function clearModelSession() {
            try { localStorage.removeItem(MODEL_SESSION_KEY); } catch(e) {}
        }

        function tryRestoreModelSession() {
            try {
                const raw = localStorage.getItem(MODEL_SESSION_KEY);
                if(!raw) return false;
                const session = JSON.parse(raw);
                if(!session || !session.config || session.config.length === 0) return false;

                const elapsedSec = Math.floor((Date.now() - session.savedAt) / 1000);
                const remainingTime = (session.time || 3600) - elapsedSec;
                if(remainingTime <= 0) {
                    clearModelSession();
                    return false;
                }

                config = session.config;
                userAnswers = session.userAnswers || {};
                time = remainingTime;

                document.getElementById('login-sec')?.classList.add('hidden');
                document.getElementById('portal-choice-sec')?.classList.add('hidden');
                document.getElementById('selection-sec')?.classList.add('hidden');
                document.getElementById('start-page-sec')?.classList.add('hidden');
                document.getElementById('top-nav-bar')?.classList.add('hidden');
                document.getElementById('exam-ui')?.classList.remove('hidden');
                document.getElementById('user-display').innerText = "CANDIDATE: " + (session.candidateName || "Candidate");

                renderQuestions();
                startTimer();
                console.log("Model test session restored successfully!");
                return true;
            } catch(e) {
                return false;
            }
        }

        function confirmExitModelExam() {
            if(confirm("Are you sure you want to exit the exam? Your current progress will be lost.")) {
                clearModelSession();
                location.reload();
            }
        }

        function startExam() {
            document.getElementById('start-page-sec').classList.add('hidden');
            document.getElementById('top-nav-bar').classList.add('hidden');
            document.getElementById('exam-ui').classList.remove('hidden');
            document.getElementById('user-display').innerText = "CANDIDATE: " + (document.getElementById('s-name').value || "Candidate");
            
            const pdfFile = document.getElementById('pdf-input').files[0];
            if(pdfFile) document.getElementById('pdf-view').src = URL.createObjectURL(pdfFile);
            
            const photo = document.getElementById('s-photo').files[0];
            if(photo) {
                const reader = new FileReader();
                reader.onload = (e) => document.getElementById('res-photo').src = e.target.result;
                reader.readAsDataURL(photo);
            }
            renderQuestions();
            startTimer();
            saveModelSession();
        }

        function renderQuestions() {
            const container = document.getElementById('quest-list');
            container.innerHTML = "";
            let currentMark = 1;
            let qIdx = 1;
            config.forEach((item) => {
                if(item.type === 's') {
                    currentMark = item.fixedMark;
                    container.innerHTML += `<div class="p-3 bg-blue-600/40 rounded-lg border border-blue-400 text-xs font-bold uppercase mb-2">${item.title}</div>`;
                } else {
                    item.assignedMark = currentMark;
                    const isSelected = userAnswers[item.id];
                    container.innerHTML += `
                        <div class="p-5 glass-panel border-l-4 border-blue-500">
                            <div class="flex justify-between text-[10px] mb-3 font-bold text-blue-300">
                                <span>Question ${qIdx++}</span>
                                <span>${item.assignedMark} Pts</span>
                            </div>
                            ${item.audio ? `<audio src="${item.audio}" controls class="w-full h-8 mb-3 opacity-80"></audio>` : ''}
                            <div class="flex justify-between gap-2">
                                ${[1,2,3,4].map(n => `
                                    <button onclick="record('${item.id}', ${n}, this)" class="option-btn border border-white/20 p-2 flex-1 rounded-xl glass-input font-bold hover:bg-white/10 transition ${isSelected == n ? 'selected-ans' : ''}">
                                        ${n}
                                    </button>
                                `).join('')}
                            </div>
                        </div>
                    `;
                }
            });
        }

        function record(id, n, btn) {
            userAnswers[id] = n;
            btn.parentElement.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected-ans'));
            btn.classList.add('selected-ans');
            saveModelSession();
        }

        function startTimer() {
            const timerInt = setInterval(() => {
                if(time <= 0) { clearInterval(timerInt); finishExam(); return; }
                let m = Math.floor(time/60), s = time%60;
                document.getElementById('timer').innerText = `${m}:${s < 10 ? '0' : ''}${s}`;
                time--;
                if(time % 5 === 0) saveModelSession();
            }, 1000);
        }

        function finishExam() {
            clearModelSession();
            let grandTotal = 0, userScore = 0, sectionHTML = "";
            let curName = "", curPossible = 0, curUser = 0;
            const passMarkVal = parseInt(document.getElementById('pass-mark').value) || 200;
            config.forEach((item, index) => {
                if(item.type === 's') {
                    if(curName !== "") sectionHTML += buildRow(curName, curUser, curPossible);
                    curName = item.title; curPossible = 0; curUser = 0;
                } else {
                    let m = parseInt(item.assignedMark);
                    curPossible += m; grandTotal += m;
                    if(userAnswers[item.id] == item.correct) { curUser += m; userScore += m; }
                }
                if(index === config.length - 1) sectionHTML += buildRow(curName, curUser, curPossible);
            });
            let scaled = Math.round((userScore / (grandTotal || 1)) * 250);
            document.getElementById('res-total').innerText = scaled;
            document.getElementById('res-name').innerText = document.getElementById('s-name').value;
            document.getElementById('res-reg').innerText = document.getElementById('s-reg').value;
            document.getElementById('res-dob').innerText = document.getElementById('s-dob').value;
            document.getElementById('res-loc').innerText = document.getElementById('s-loc').value;
            document.getElementById('res-date').innerText = new Date().toLocaleDateString();
            document.getElementById('total-score-fill').style.width = (scaled/250 * 100) + "%";
            document.getElementById('total-marker').innerText = scaled;
            const msg = document.getElementById('result-message');
            msg.innerHTML = scaled >= passMarkVal ? "RESULT: PASSED (合格)" : "RESULT: FAILED (不合格)";
            msg.className = scaled >= passMarkVal ? "p-4 border rounded bg-green-50 text-green-800 font-bold mb-8 text-center" : "p-4 border rounded bg-red-50 text-red-800 font-bold mb-8 text-center";
            document.getElementById('res-breakdown').innerHTML = sectionHTML;

            // Save Model Test submission to PostgreSQL backend
            try {
                const modelSubmissionQuestions = [];
                let qNum = 1;
                config.forEach(item => {
                    if(item.type === 'q') {
                        const sel = userAnswers[item.id];
                        modelSubmissionQuestions.push({
                            question_number: qNum++,
                            section_name: item.sectionTitle || curName || "Model Test",
                            question_text: `Question ${qNum - 1}`,
                            options: ["1", "2", "3", "4"],
                            selected_option: sel !== undefined ? sel : null,
                            correct_option: item.correct,
                            mark: parseInt(item.assignedMark, 10) || 1
                        });
                    }
                });

                const subPayload = {
                    candidate_id: (document.getElementById('s-reg')?.value || "").trim() || ("MOD-" + Math.floor(1000 + Math.random()*9000)),
                    full_name: (document.getElementById('s-name')?.value || "").trim() || "Candidate",
                    password: "password",
                    dob: document.getElementById('s-dob')?.value || "",
                    location: document.getElementById('s-loc')?.value || "",
                    examTitle: document.getElementById('confirm-model-name')?.innerText || "PDF Model Test",
                    total_questions: modelSubmissionQuestions.length,
                    totalScore: scaled,
                    maxScore: 250,
                    passMark: passMarkVal,
                    isPassed: scaled >= passMarkVal,
                    questions: modelSubmissionQuestions,
                    date: new Date().toLocaleString()
                };

                fetch(`${API_BASE}/api/submit-exam`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(subPayload)
                }).catch(e => console.warn("Model exam score submission error:", e));
            } catch(e) {
                console.warn("Model exam score submission error:", e);
            }

            document.getElementById('exam-ui').classList.add('hidden');
            document.getElementById('top-nav-bar').classList.remove('hidden');
            document.getElementById('result-ui').classList.remove('hidden');
        }
