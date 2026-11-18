/**
 * Neural Audio & Multi-Speaker Dialogue Engine
 * Supports Edge-TTS synthesis, speaker voice mapping, waveforms, and sequential dialogue playback.
 */
function detectSpeakerVoice(name) {
            const s = name.toLowerCase();
            // Child boy
            if(s.includes("ren") || s.includes("boy") || s.includes("leo") || s.includes("男の子") || s.includes("少年") || s.includes("son")) {
                return { role_category: "boy", role_label: "👦 Child Boy (少年・男の子)", voice_id: "ja-JP-RenChildNeural" };
            }
            // Child girl
            if(s.includes("yuna") || s.includes("girl") || s.includes("mia") || s.includes("女の子") || s.includes("少女") || s.includes("daughter")) {
                return { role_category: "girl", role_label: "👧 Child Girl (少女・女の子)", voice_id: "ja-JP-YunaChildNeural" };
            }
            // Female
            if(s.includes("女") || s.includes("おんな") || s.includes("female") || s.includes("woman") || s.includes("mama") || s.includes("店員") || s.includes("aoi") || s.includes("nanami") || s.includes("jenny")) {
                return { role_category: "female", role_label: "👩 Adult Female (成人女性・店員)", voice_id: "ja-JP-AoiNeural" };
            }
            // Male default
            return { role_category: "male", role_label: "👨 Adult Male (成人男性・ナレーター)", voice_id: "ja-JP-DaichiNeural" };
        }

        function renderSpeakerMappingChips() {
            const container = document.getElementById('speaker-chips-container');
            const box = document.getElementById('speaker-mapping-box');
            if(!container || !box) return;
            container.innerHTML = "";
            const speakers = Object.keys(speakerVoiceMap);
            if(speakers.length === 0) {
                box.classList.add('hidden');
                return;
            }
            box.classList.remove('hidden');

            speakers.forEach(spk => {
                const conf = speakerVoiceMap[spk];
                const card = document.createElement('div');
                card.className = "bg-white/5 border border-white/10 p-3.5 rounded-xl flex flex-col justify-between space-y-2.5";
                const roleIcon = conf.role_category === 'boy' ? '👦' : (conf.role_category === 'girl' ? '👧' : (conf.role_category === 'female' ? '👩' : '👨'));
                card.innerHTML = `
                    <div class="flex items-center justify-between">
                        <span class="font-bold text-white text-xs truncate mr-2">${roleIcon} ${spk}</span>
                        <span class="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded font-semibold">${conf.role_category.toUpperCase()}</span>
                    </div>
                    <select onchange="updateSpeakerVoice('${spk}', this.value)" class="glass-input p-2 rounded-lg text-xs font-semibold w-full">
                        <option value="ja-JP-DaichiNeural" ${conf.voice_id==='ja-JP-DaichiNeural'?'selected':''}>👨 Daichi (Adult Deep Male • 成人男性)</option>
                        <option value="ja-JP-KeitaNeural" ${conf.voice_id==='ja-JP-KeitaNeural'?'selected':''}>👨 Keita (Adult Standard Male • 成人男性)</option>
                        <option value="ja-JP-AoiNeural" ${conf.voice_id==='ja-JP-AoiNeural'?'selected':''}>👩 Aoi (Adult Gentle Female • 成人女性)</option>
                        <option value="ja-JP-NanamiNeural" ${conf.voice_id==='ja-JP-NanamiNeural'?'selected':''}>👩 Nanami (Adult Standard Female • 成人女性)</option>
                        <option value="ja-JP-RenChildNeural" ${conf.voice_id==='ja-JP-RenChildNeural'?'selected':''}>👦 Ren (Child Male / Boy • 少年・男の子)</option>
                        <option value="ja-JP-YunaChildNeural" ${conf.voice_id==='ja-JP-YunaChildNeural'?'selected':''}>👧 Yuna (Child Female / Girl • 少女・女の子)</option>
                        <option value="en-US-GuyNeural" ${conf.voice_id==='en-US-GuyNeural'?'selected':''}>👨 Guy (English Male)</option>
                        <option value="en-US-JennyNeural" ${conf.voice_id==='en-US-JennyNeural'?'selected':''}>👩 Jenny (English Female)</option>
                    </select>
                    <button onclick="testSpeakerVoice('${spk}')" class="bg-cyan-500/20 hover:bg-cyan-500/40 text-cyan-200 border border-cyan-400/30 text-[11px] font-bold py-1.5 px-3 rounded-lg transition flex items-center justify-center gap-1.5">
                        <span>▶ Test Voice</span>
                    </button>
                `;
                container.appendChild(card);
            });
        }

        function updateSpeakerVoice(spk, newVoiceId) {
            if(speakerVoiceMap[spk]) {
                speakerVoiceMap[spk].voice_id = newVoiceId;
            }
        }

        function testSpeakerVoice(speaker) {
            const conf = speakerVoiceMap[speaker] || detectSpeakerVoice(speaker);
            const sampleText = conf.role_category === 'boy' ? `ぼくの名前は${speaker}です。よろしくね！`
                : conf.role_category === 'girl' ? `わたしの名前は${speaker}です。どうぞよろしくおねがいします！`
                : conf.role_category === 'female' ? `はじめまして、${speaker}です。よろしくお願いします。`
                : `はじめまして、${speaker}です。よろしくお願いします。`;
            playDirectTurnAudio('test_' + encodeURIComponent(speaker), encodeURIComponent(sampleText), speaker);
        }

        function renderParsedScriptsView() {
            const area = document.getElementById('scripts-display-area');
            if(!area) return;
            area.innerHTML = "";
            if(parsedScripts.length === 0) return;

            parsedScripts.forEach((s, sIdx) => {
                const card = document.createElement('div');
                card.className = "glass-panel p-6 border border-white/10";
                
                const initialAudioUrl = resolveAudioUrl(`/audio/${s.targetAudio}`);
                let masterPlayerHtml = `
                    <div id="master-player-${s.id}" class="mt-4 p-4 bg-sky-950/40 border border-sky-400/30 rounded-xl flex flex-wrap justify-between items-center gap-4">
                        <div class="flex items-center gap-3">
                            <span class="text-2xl">🎧</span>
                            <div>
                                <div class="text-xs font-bold text-sky-300">Continuous Master Audio: <span class="text-white">${s.targetAudio}</span></div>
                                <div class="text-[11px] text-gray-400">Concatenates all ${s.dialogues.length} dialogue turns with realistic inter-speaker pauses</div>
                            </div>
                        </div>
                        <div id="master-audio-ctrl-${s.id}" class="text-xs text-gray-400">
                            <div class="flex items-center gap-3">
                                <audio controls src="${initialAudioUrl}" class="h-9 w-64"></audio>
                                <a href="${initialAudioUrl}" target="_blank" class="text-xs text-sky-400 hover:text-white underline">Direct URL</a>
                            </div>
                        </div>
                    </div>
                `;

                // Individual Turns List
                let turnsHtml = s.dialogues.map((turn, tIdx) => {
                    const spkConf = speakerVoiceMap[turn.speaker] || detectSpeakerVoice(turn.speaker);
                    const icon = spkConf.role_category === 'boy' ? '👦' : (spkConf.role_category === 'girl' ? '👧' : (spkConf.role_category === 'female' ? '👩' : '👨'));
                    return `
                        <div id="turn-card-${turn.id}" class="p-3.5 bg-white/5 border border-white/10 rounded-xl flex flex-col md:flex-row justify-between items-start md:items-center gap-3 transition">
                            <div class="flex items-start gap-3 flex-1">
                                <span class="text-2xl">${icon}</span>
                                <div>
                                    <div class="flex items-center gap-2">
                                        <span class="font-bold text-white text-xs">${turn.speaker}</span>
                                        <span class="text-[10px] bg-white/10 text-cyan-300 px-2 py-0.5 rounded font-mono">${turn.id}</span>
                                    </div>
                                    <div class="text-sm text-gray-100 mt-1 font-medium">${turn.text}</div>
                                </div>
                            </div>
                            <div class="flex items-center gap-2">
                                <button onclick="playDirectTurnAudio('${turn.id}', '${encodeURIComponent(turn.text)}', '${turn.speaker}')" class="bg-cyan-600/30 hover:bg-cyan-600 text-cyan-200 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold border border-cyan-400/30 flex items-center gap-1.5 transition">
                                    <span>▶ Play Line</span>
                                </button>
                                <span id="turn-audio-status-${turn.id}" class="text-[10px] text-gray-500"></span>
                            </div>
                        </div>
                    `;
                }).join('');

                card.innerHTML = `
                    <div class="flex justify-between items-start">
                        <div>
                            <span class="text-[10px] bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded font-bold uppercase tracking-wider">${s.dialogueId || s.id}</span>
                            <h4 class="text-lg font-black text-white mt-1">${s.title}</h4>
                        </div>
                        <span class="text-xs text-gray-400 font-bold">${s.dialogues.length} Dialogue Turns</span>
                    </div>
                    ${masterPlayerHtml}
                    <div class="mt-4 space-y-2.5">
                        ${turnsHtml}
                    </div>
                `;
                area.appendChild(card);
            });
        }

        // Direct in-browser playback for single turn without downloading
        async function playDirectTurnAudio(turnId, encodedText, speaker) {
            const text = decodeURIComponent(encodedText);
            const conf = speakerVoiceMap[speaker] || detectSpeakerVoice(speaker);
            const statusEl = document.getElementById(`turn-audio-status-${turnId}`);
            const cardEl = document.getElementById(`turn-card-${turnId}`);
            
            if(statusEl) statusEl.innerHTML = `<span class="text-cyan-400 font-bold">Synthesizing...</span>`;

            try {
                const res = await fetch(`${API_BASE}/api/tts/turn`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        text: text,
                        voice_id: conf.voice_id,
                        speaker: speaker
                    })
                });
                if(!res.ok) {
                    const errJson = await res.json().catch(() => ({}));
                    throw new Error(errJson.detail || `Server returned HTTP ${res.status}`);
                }
                const data = await res.json();
                if(!data.success) throw new Error(data.detail || "TTS failed");

                const audio = document.getElementById('global-turn-audio');
                audio.src = resolveAudioUrl(data.audioUrl);
                audio.play().catch(e => console.warn("Audio autoplay blocked:", e));

                // Highlight active turn
                document.querySelectorAll('[id^="turn-card-"]').forEach(el => el.classList.remove('playing-turn'));
                if(cardEl) cardEl.classList.add('playing-turn');

                if(statusEl) statusEl.innerHTML = `<span class="text-emerald-400 font-bold">🔊 ${data.duration}s</span>`;
                audio.onended = () => {
                    if(cardEl) cardEl.classList.remove('playing-turn');
                    if(statusEl) statusEl.innerHTML = `<span class="text-gray-400">Done</span>`;
                };
            } catch(e) {
                console.warn("Server TTS connection failed or offline, falling back smoothly to Web Speech API:", e);
                const spoke = speakWithBrowserSpeech(text, conf.role_category, cardEl, statusEl);
                if(!spoke) {
                    if(statusEl) statusEl.innerHTML = `<span class="text-amber-400">Speech unavailable</span>`;
                }
            }
        }

        function speakWithBrowserSpeech(text, roleCategory, cardEl, statusEl) {
            if(!('speechSynthesis' in window)) return false;
            try {
                window.speechSynthesis.cancel();
                const utter = new SpeechSynthesisUtterance(text);
                utter.lang = 'ja-JP';
                if(roleCategory === 'boy' || roleCategory === 'girl') {
                    utter.pitch = 1.6;
                    utter.rate = 1.1;
                } else if(roleCategory === 'female') {
                    utter.pitch = 1.25;
                    utter.rate = 1.0;
                } else {
                    utter.pitch = 0.85;
                    utter.rate = 0.95;
                }
                try {
                    const voices = window.speechSynthesis.getVoices();
                    if(voices && voices.length > 0) {
                        const jaVoice = voices.find(v => v.lang && (v.lang.startsWith('ja') || (v.name && v.name.includes('Japanese'))));
                        if(jaVoice) utter.voice = jaVoice;
                    }
                } catch(e) {}

                if(cardEl) {
                    document.querySelectorAll('[id^="turn-card-"]').forEach(el => el.classList.remove('playing-turn'));
                    cardEl.classList.add('playing-turn');
                }
                if(statusEl) statusEl.innerHTML = `<span class="text-amber-300 font-bold">🔊 In-Browser</span>`;

                utter.onend = () => {
                    if(cardEl) cardEl.classList.remove('playing-turn');
                    if(statusEl) statusEl.innerHTML = `<span class="text-gray-400">Done</span>`;
                };
                utter.onerror = () => {
                    if(cardEl) cardEl.classList.remove('playing-turn');
                    if(statusEl) statusEl.innerHTML = `<span class="text-gray-400">Done</span>`;
                };

                window.speechSynthesis.speak(utter);
                return true;
            } catch(err) {
                console.error("Browser speech fallback failed:", err);
                return false;
            }
        }

        // Synthesize and bind dialogue audio for CBT questions
        async function synthesizeUnifiedCbtAudio() {
            if(parsedScripts.length === 0) return alert("Please load or upload a CBT exam with dialogue scripts first!");
            const btn = document.getElementById('btn-cbt-synth');
            if(btn) {
                btn.disabled = true;
                btn.innerHTML = `<span>⏳ Synthesizing Dialogue Scripts (TTS Engine)...</span>`;
            }

            const pauseSec = parseFloat(document.getElementById('cbt-speaker-pause')?.value) || 0.8;

            try {
                const payload = {
                    title: "Unified CBT Dialogue Synthesis",
                    speaker_map: speakerVoiceMap,
                    pause_seconds: pauseSec,
                    scripts: parsedScripts
                };
                const res = await fetch(`${API_BASE}/api/tts/batch-dialogue`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
                const data = await res.json().catch(() => ({}));
                if(!res.ok || !data.success) {
                    let errMsg = "Synthesis error";
                    if(typeof data.detail === 'string') {
                        errMsg = data.detail;
                    } else if(Array.isArray(data.detail)) {
                        errMsg = data.detail.map(d => (d.loc ? d.loc.join('.') + ': ' : '') + d.msg).join(', ');
                    } else if(data.message) {
                        errMsg = data.message;
                    } else if(data.detail && typeof data.detail === 'object') {
                        errMsg = JSON.stringify(data.detail);
                    }
                    throw new Error(errMsg);
                }

                synthesizedScripts = data.scripts || [];

                // Update master players on each script card
                synthesizedScripts.forEach(s => {
                    const ctrl = document.getElementById(`master-audio-ctrl-${s.id}`);
                    if(ctrl && s.masterAudio) {
                        const directUrl = resolveAudioUrl(s.masterAudio.audioUrl);
                        ctrl.innerHTML = `
                            <div class="flex items-center gap-3">
                                <audio controls src="${directUrl}" class="h-9 w-64"></audio>
                                <a href="${directUrl}" target="_blank" class="text-xs text-sky-400 hover:text-white underline">Direct URL</a>
                            </div>
                        `;
                    }
                });

                // Bind to CBT questions in pendingAdminCbtJson
                let boundCount = 0;
                if(pendingAdminCbtJson && pendingAdminCbtJson.questions) {
                    pendingAdminCbtJson.questions.forEach(q => {
                        if(q.audio) {
                            const matched = synthesizedScripts.find(s => s.targetAudio === q.audio || s.id === q.audio || `${s.id}.mp3` === q.audio);
                            if(matched && matched.masterAudio) {
                                q.audio = matched.masterAudio.audioUrl;
                                boundCount++;
                            }
                        }
                    });
                }

                const badgeAudio = document.getElementById('badge-audio-status');
                if(badgeAudio) badgeAudio.innerText = `🔊 Audio Synthesized & Bound (${synthesizedScripts.length} Scripts)`;

                alert(`Success: Synthesized ${synthesizedScripts.length} dialogue scripts!\nMaster audio and line audio are bound to CBT questions and ready for in-browser playback.`);
            } catch(e) {
                console.error("Dialogue audio synthesis error:", e);
                const isNetworkErr = e.message && (e.message.includes('Failed to fetch') || e.message.includes('NetworkError'));
                if(isNetworkErr) {
                    alert("⚠️ Cannot connect to TTS backend server (Failed to fetch).\n\nReason: The webpage cannot reach the Python server at " + (API_BASE || window.location.origin) + ".\n\nTroubleshooting:\n1. If you opened index.html by double-clicking it (file:///), please open it in your browser using:\n   👉 http://localhost:8000\n2. Make sure the server is running ('python server.py').\n3. If accessing from another PC or phone, use the Host LAN IP (e.g., http://192.168.x.x:8000).");
                } else {
                    const errText = (typeof e.message === 'string') ? e.message : (JSON.stringify(e) || "Unknown error");
                    alert("Dialogue audio synthesis error: " + errText);
                }
            } finally {
                if(btn) {
                    btn.disabled = false;
                    btn.innerHTML = `<span>⚡ GENERATE / ATTACH DIALOGUE AUDIO (TTS)</span>`;
                }
            }
        }
