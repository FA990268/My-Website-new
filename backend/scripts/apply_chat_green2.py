file_path = r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

pos1 = content.find('<!-- FLOATING LIVE CHAT CIRCULAR BUTTON')
pos2 = content.find('</a>', pos1) + 4

old_block = content[pos1:pos2]

new_block = """<!-- FLOATING WHATSAPP BUTTON (AUTHENTIC WHATSAPP GREEN, COMPACT & SLEEK) -->
    <a id="floating-live-chat" href="https://wa.me/8801340315117?text=Hello%20Dai%20Ichi%20Academy,%20I%20need%20assistance%20with%20Japanese%20courses%20and%20CBT%20exams." target="_blank" class="fixed bottom-5 right-5 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#128C7E] to-[#25D366] hover:brightness-110 text-white shadow-md shadow-emerald-500/30 border border-white/40 transition-all duration-200 hover:scale-105 active:scale-95 group" title="Chat on WhatsApp (01340315117)">
        <span class="absolute top-0 right-0 flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#25D366] border border-slate-900"></span>
        </span>
        <svg class="w-5 h-5 sm:w-6 sm:h-6 fill-current drop-shadow transition-transform group-hover:scale-105" viewBox="0 0 24 24">
            <path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.668-.699c.969.585 1.961.914 3.792.914 3.182 0 5.768-2.586 5.768-5.766 0-3.18-2.586-5.766-5.768-5.766zm8.857 5.766c0 4.888-3.974 8.861-8.857 8.861-1.564 0-3.036-.407-4.321-1.118l-5.71 1.498 1.524-5.567c-.822-1.378-1.293-2.99-1.293-4.704 0-4.888 3.974-8.861 8.857-8.861s8.857 3.973 8.857 8.861zm-4.739 2.57c-.201-.1-.301-.15-.451-.25-.15-.1-.35-.25-.5-.4-.15-.15-.3-.3-.45-.45-.15-.15-.25-.35-.35-.55s-.05-.4.05-.55c.1-.15.2-.25.35-.4.15-.15.2-.25.3-.4.1-.15.05-.3 0-.4-.05-.1-.45-1.1-.65-1.5-.2-.4-.4-.35-.55-.35h-.45c-.15 0-.4.05-.6.25s-.8.8-.8 1.95.85 2.25.95 2.4c.1.15 1.65 2.55 4 3.55.55.25 1 .4 1.35.5.55.2 1.05.15 1.45.1.45-.05 1.4-.6 1.6-1.15.2-.55.2-1.05.15-1.15-.05-.1-.2-.15-.4-.25z"/>
        </svg>
    </a>"""

content = content[:pos1] + new_block + content[pos2:]

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated floating-live-chat successfully!")
