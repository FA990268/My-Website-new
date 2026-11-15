import re

file_path = r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update style for #admin-panel to support dynamic glass transparency via var(--glass-opacity)
# Check if #admin-panel style is in <style>
admin_style = """
        #admin-panel {
            background: rgba(15, 23, 42, var(--glass-opacity, 0.15)) !important;
            backdrop-filter: blur(var(--glass-blur, 18px));
            -webkit-backdrop-filter: blur(var(--glass-blur, 18px));
            transition: background 0.15s ease-out;
        }
"""

if '#admin-panel {' not in content:
    # insert before .glass-panel
    content = content.replace('.glass-panel {', admin_style.strip() + '\n        .glass-panel {', 1)

# 2. Update #admin-panel HTML definition: remove bg-slate-950/95
old_admin_panel = '<div id="admin-panel" class="hidden fixed inset-0 z-[1100] p-6 overflow-y-auto bg-slate-950/95 backdrop-blur-2xl">'
new_admin_panel = '<div id="admin-panel" class="hidden fixed inset-0 z-[1100] p-4 sm:p-8 overflow-y-auto no-scrollbar">'

if old_admin_panel in content:
    content = content.replace(old_admin_panel, new_admin_panel)
    print("Replaced old_admin_panel markup successfully!")
else:
    print("old_admin_panel pattern not found, checking alternatives...")
    # fallback regex
    content = re.sub(
        r'<div id="admin-panel" class="[^"]*"',
        r'<div id="admin-panel" class="hidden fixed inset-0 z-[1100] p-4 sm:p-8 overflow-y-auto no-scrollbar"',
        content
    )

# 3. Inside admin-panel, broaden container to max-w-[1600px] w-full mx-auto
content = content.replace('<div class="max-w-6xl mx-auto">', '<div class="max-w-[1600px] w-full mx-auto">', 1)

# 4. In Admin Header, make it glass-panel instead of bg-white/5
old_admin_hdr = '<div class="flex flex-wrap justify-between items-center mb-6 bg-white/5 p-4 rounded-2xl border border-white/10 sticky top-0 z-50 backdrop-blur-md gap-3">'
new_admin_hdr = '<div class="flex flex-wrap justify-between items-center mb-6 glass-panel p-4 sm:p-5 rounded-2xl border border-white/20 sticky top-0 z-50 backdrop-blur-xl shadow-xl gap-3">'
if old_admin_hdr in content:
    content = content.replace(old_admin_hdr, new_admin_hdr)
    print("Replaced admin header styling!")

# 5. Admin Settings tab glass cards
content = content.replace(
    '<div class="bg-black/40 p-5 rounded-2xl border border-white/10 space-y-3">',
    '<div class="glass-card p-5 rounded-2xl border border-white/15 space-y-3">',
    1
)
content = content.replace(
    '<div class="bg-black/40 p-5 rounded-2xl border border-white/10 space-y-4">',
    '<div class="glass-card p-5 rounded-2xl border border-white/15 space-y-4">',
    1
)

# 6. Mock test view: fix top padding & wrap header and buttons in a beautiful glass-panel card
old_view_mock = """    <!-- VIEW 2: MOCK TEST DIRECTORY -->
    <main id="view-mock" class="hidden min-h-screen p-4 sm:p-6 md:p-8 pt-24 pb-16 max-w-[1600px] w-full mx-auto space-y-8">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
                <span class="text-xs font-bold text-cyan-400 uppercase tracking-widest">OFFICIAL EXAM SIMULATION</span>
                <h2 class="text-3xl font-black text-white">MOCK TESTS &amp; EXAM PAPERS</h2>
                <p class="text-xs text-gray-300 mt-1">Select any active CBT test or model exam to practice in full Prometric exam mode.</p>
            </div>
            <!-- Category Filter Tabs -->
            <div class="flex flex-wrap gap-2">
                <button onclick="renderMockTestsView('all')" id="mock-tab-all" class="px-4 py-2 rounded-full text-xs font-bold transition glass-panel bg-white/25 text-white border border-white/40">
                    All Tests
                </button>
                <button onclick="renderMockTestsView('cbt')" id="mock-tab-cbt" class="px-4 py-2 rounded-full text-xs font-bold transition glass-panel text-gray-300 hover:text-white hover:bg-white/10">
                    Prometric CBT Exams
                </button>
                <button onclick="renderMockTestsView('model')" id="mock-tab-model" class="px-4 py-2 rounded-full text-xs font-bold transition glass-panel text-gray-300 hover:text-white hover:bg-white/10">
                    PDF Model Tests
                </button>
            </div>
        </div>"""

new_view_mock = """    <!-- VIEW 2: MOCK TEST DIRECTORY -->
    <main id="view-mock" class="hidden min-h-screen p-4 sm:p-6 md:p-8 pt-32 sm:pt-36 pb-20 max-w-[1600px] w-full mx-auto space-y-8">
        <div class="glass-panel p-6 sm:p-8 border border-white/20 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
            <div>
                <span class="text-xs font-bold text-cyan-400 uppercase tracking-widest">OFFICIAL EXAM SIMULATION</span>
                <h2 class="text-2xl sm:text-3xl font-black text-white">MOCK TESTS &amp; EXAM PAPERS</h2>
                <p class="text-xs text-gray-300 mt-1">Select any active CBT test or model exam to practice in full Prometric exam mode.</p>
            </div>
            <!-- Category Filter Tabs -->
            <div class="flex flex-wrap gap-2 sm:gap-3">
                <button onclick="renderMockTestsView('all')" id="mock-tab-all" class="px-5 py-2.5 rounded-full text-xs font-bold transition glass-panel bg-white/25 text-white border border-white/40 shadow-sm">
                    All Tests
                </button>
                <button onclick="renderMockTestsView('cbt')" id="mock-tab-cbt" class="px-5 py-2.5 rounded-full text-xs font-bold transition glass-panel text-gray-300 hover:text-white hover:bg-white/10">
                    Prometric CBT Exams
                </button>
                <button onclick="renderMockTestsView('model')" id="mock-tab-model" class="px-5 py-2.5 rounded-full text-xs font-bold transition glass-panel text-gray-300 hover:text-white hover:bg-white/10">
                    PDF Model Tests
                </button>
            </div>
        </div>"""

if old_view_mock in content:
    content = content.replace(old_view_mock, new_view_mock)
    print("Replaced view-mock header and padding successfully!")
else:
    print("old_view_mock exact string not found, attempting partial replacement")
    content = content.replace('id="view-mock" class="hidden min-h-screen p-4 sm:p-6 md:p-8 pt-24 pb-16', 'id="view-mock" class="hidden min-h-screen p-4 sm:p-6 md:p-8 pt-32 sm:pt-36 pb-20')

# Also check Courses and About views top padding
content = content.replace('id="view-courses" class="hidden min-h-screen p-4 sm:p-6 md:p-8 pt-24 pb-16', 'id="view-courses" class="hidden min-h-screen p-4 sm:p-6 md:p-8 pt-32 sm:pt-36 pb-20')
content = content.replace('id="view-about" class="hidden min-h-screen p-4 sm:p-6 md:p-8 pt-24 pb-16', 'id="view-about" class="hidden min-h-screen p-4 sm:p-6 md:p-8 pt-32 sm:pt-36 pb-20')

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated static/index.html successfully!")
