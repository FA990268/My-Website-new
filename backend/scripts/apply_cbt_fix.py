file_path = r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix fetchNetworkInfo: safe check for current-lan-ip and modal-lan-url
old_fetch_net = """        async function fetchNetworkInfo() {
            try {
                const res = await fetch(`${API_BASE}/api/network-info`);
                if(res.ok) {
                    networkInfo = await res.json();
                    const lanDisplay = networkInfo.primary_lan_url || window.location.origin;
                    document.getElementById('current-lan-ip').innerText = lanDisplay.replace('http://', '');
                    document.getElementById('modal-lan-url').innerText = lanDisplay;
                }
            } catch(e) {
                document.getElementById('current-lan-ip').innerText = window.location.host || '127.0.0.1:8000';
                document.getElementById('modal-lan-url').innerText = window.location.origin.startsWith('http') ? window.location.origin : 'http://localhost:8000';
            }
        }"""

new_fetch_net = """        async function fetchNetworkInfo() {
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
        }"""

if old_fetch_net in content:
    content = content.replace(old_fetch_net, new_fetch_net)
    print("Fixed fetchNetworkInfo successfully!")
else:
    print("old_fetch_net exact match not found!")

# 2. Fix loadCbtExams to cache in localStorage and update student list, home exams, and mock directory
old_load_cbt = """        async function loadCbtExams() {
            try {
                const res = await fetch(`${API_BASE}/api/exams`);
                if(res.ok) {
                    allCbtExams = await res.json();
                }
            } catch(e) {
                console.warn("Fallback to localStorage for CBT exams:", e);
                const local = localStorage.getItem('jft_cbt_db');
                if(local) allCbtExams = JSON.parse(local);
            }
            renderStudentCbtList();
            renderAdminCbtList();
            if(allCbtExams.length > 0 && !pendingAdminCbtJson) {
                try {
                    processUnifiedCbtData(allCbtExams[0]);
                } catch(e) {}
            }
        }"""

new_load_cbt = """        async function loadCbtExams() {
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
        }"""

if old_load_cbt in content:
    content = content.replace(old_load_cbt, new_load_cbt)
    print("Fixed loadCbtExams successfully!")
else:
    print("old_load_cbt exact match not found!")

# 3. Guard initSystem with robust try/catch on every async/sync step
old_init_sys = """            renderGroupOptions();
            renderAdminModelList();
            checkStoredBg();
            await fetchNetworkInfo();
            await fetchVoices();
            await loadCbtExams();
            renderHomeExams();"""

new_init_sys = """            try { renderGroupOptions(); } catch(e) {}
            try { renderAdminModelList(); } catch(e) {}
            try { checkStoredBg(); } catch(e) {}
            try { await fetchNetworkInfo(); } catch(e) { console.warn("Network info fetch warning:", e); }
            try { await fetchVoices(); } catch(e) { console.warn("Voice catalog fetch warning:", e); }
            try { await loadCbtExams(); } catch(e) { console.warn("CBT exam load warning:", e); }
            try { renderHomeExams(); } catch(e) {}
            try { renderStudentCbtList(); } catch(e) {}"""

if old_init_sys in content:
    content = content.replace(old_init_sys, new_init_sys)
    print("Protected initSystem with try/catch successfully!")
else:
    print("old_init_sys exact match not found!")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved static/index.html successfully!")
