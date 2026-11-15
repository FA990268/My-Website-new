file_path = r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

old_btn = """    <!-- FLOATING PURE CIRCULAR BUTTON (ELECTRIC BLUE WHATSAPP) -->
    <a id="floating-live-chat" href="https://wa.me/8801340315117?text=Hello%20Dai%20Ichi%20Academy,%20I%20need%20assistance%20with%20Japanese%20courses%20and%20CBT%20exams." target="_blank" class="fixed bottom-6 right-6 z-40 w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#0047cc] via-[#0080ff] to-[#00f0ff] text-white shadow-[0_0_25px_rgba(0,240,255,0.7)] border-2 border-white/60 transition-all duration-300 hover:scale-110 active:scale-95 group backdrop-blur-xl" title="Chat on WhatsApp (01340315117)">
        <span class="absolute -top-1 -right-1 flex h-3.5 w-3.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-300 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-400 border border-slate-900"></span>
        </span>
        <svg class="w-7 h-7 sm:w-8 sm:h-8 fill-current drop-shadow-md transition-transform group-hover:scale-110" viewBox="0 0 24 24">"""

new_btn = """    <!-- FLOATING WHATSAPP BUTTON (AUTHENTIC WHATSAPP GREEN, COMPACT & SLEEK) -->
    <a id="floating-live-chat" href="https://wa.me/8801340315117?text=Hello%20Dai%20Ichi%20Academy,%20I%20need%20assistance%20with%20Japanese%20courses%20and%20CBT%20exams." target="_blank" class="fixed bottom-5 right-5 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#128C7E] to-[#25D366] hover:brightness-110 text-white shadow-md shadow-emerald-500/25 border border-white/40 transition-all duration-200 hover:scale-105 active:scale-95 group" title="Chat on WhatsApp (01340315117)">
        <span class="absolute top-0 right-0 flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-slate-900"></span>
        </span>
        <svg class="w-5 h-5 sm:w-6 sm:h-6 fill-current drop-shadow transition-transform group-hover:scale-105" viewBox="0 0 24 24">"""

if old_btn in content:
    content = content.replace(old_btn, new_btn)
    print("Replaced floating chat button successfully!")
else:
    print("old_btn not found!")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved static/index.html successfully!")
