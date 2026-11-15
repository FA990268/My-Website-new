import sys

file_path = r"C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

old_block = """    <!-- VIEW 1: HOME LANDING PAGE -->
    <main id="view-home" class="min-h-screen p-4 sm:p-6 md:p-8 pt-24 pb-16 max-w-[1600px] w-full mx-auto space-y-12">
        <!-- Hero Header -->
        <section class="text-center space-y-6 pt-4">
            <!-- Cholo Japan Title -->
            <div class="inline-flex flex-col items-start select-none">
                <span class="text-3xl sm:text-5xl md:text-6xl font-black text-cyan-300 tracking-wider drop-shadow-[0_4px_16px_rgba(34,211,238,0.4)]">
                    চলো
                </span>
                <span class="text-6xl sm:text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-400 to-amber-300 tracking-tight -mt-2 sm:-mt-5 ml-10 sm:ml-20 md:ml-24 drop-shadow-[0_6px_24px_rgba(244,63,94,0.5)]">
                    জাপান
                </span>
            </div>

            <!-- Action Buttons -->
            <div class="flex flex-wrap justify-center gap-3 pt-2">
                <button onclick="navigateTo('mock')" class="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white px-7 py-3 rounded-full font-black text-sm transition shadow-lg shadow-cyan-500/25 flex items-center gap-2">
                    <span>🎯</span>
                    <span>Explore Mock Tests</span>
                </button>
                <button onclick="navigateTo('login')" class="glass-panel hover:bg-white/20 text-white px-7 py-3 rounded-full font-bold text-sm transition border border-white/30 flex items-center gap-2">
                    <span>🎓</span>
                    <span>Candidate Exam Login</span>
                </button>
                <a href="https://wa.me/8801340315117?text=Hello%20Dai%20Ichi%20Academy,%20I%20want%20to%20learn%20Japanese%20and%20take%20CBT%20exams" target="_blank" class="glass-panel hover:bg-emerald-500/25 text-emerald-300 border border-emerald-400/40 px-6 py-3 rounded-full font-bold text-sm transition flex items-center gap-2 shadow-lg shadow-emerald-500/10 hover:shadow-emerald-500/20">
                    <span class="text-base animate-pulse">💬</span>
                    <span>Live Chat (WhatsApp)</span>
                </a>
            </div>
        </section>"""

new_block = """    <!-- VIEW 1: HOME LANDING PAGE -->
    <main id="view-home" class="min-h-screen p-4 sm:p-6 md:p-8 pt-28 sm:pt-36 pb-16 max-w-[1600px] w-full mx-auto space-y-8">
        <!-- Hero Header -->
        <section class="text-center pt-2 pb-2">
            <!-- Cholo Japan Title (Safe Clearance Under Floating Nav) -->
            <div class="inline-flex flex-col items-start select-none">
                <span class="text-3xl sm:text-5xl md:text-6xl font-black text-cyan-300 tracking-wider drop-shadow-[0_4px_16px_rgba(34,211,238,0.4)]">
                    চলো
                </span>
                <span class="text-6xl sm:text-8xl md:text-9xl font-black text-transparent bg-clip-text bg-gradient-to-r from-rose-500 via-pink-400 to-amber-300 tracking-tight -mt-2 sm:-mt-5 ml-10 sm:ml-20 md:ml-24 drop-shadow-[0_6px_24px_rgba(244,63,94,0.5)]">
                    জাপান
                </span>
            </div>
        </section>"""

norm_content = content.replace('\r\n', '\n')
norm_old = old_block.replace('\r\n', '\n')
norm_new = new_block.replace('\r\n', '\n')

if norm_old in norm_content:
    norm_content = norm_content.replace(norm_old, norm_new, 1)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(norm_content)
    print("SUCCESS: Removed 3 buttons and added top clearance for Cholo Japan")
else:
    print("ERROR: Old block not found")
