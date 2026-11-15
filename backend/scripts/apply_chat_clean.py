import re

file_path = r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Pattern for floating-live-chat anchor tag
pattern = r'<!-- FLOATING PURE CIRCULAR BUTTON.*?</a>'

new_chat_btn = """<!-- FLOATING WHATSAPP BUTTON (AUTHENTIC WHATSAPP GREEN, COMPACT & SLEEK) -->
    <a id="floating-live-chat" href="https://wa.me/8801340315117?text=Hello%20Dai%20Ichi%20Academy,%20I%20need%20assistance%20with%20Japanese%20courses%20and%20CBT%20exams." target="_blank" class="fixed bottom-5 right-5 z-40 w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center bg-gradient-to-tr from-[#128C7E] to-[#25D366] hover:brightness-110 text-white shadow-md shadow-[#25D366]/30 border border-white/40 transition-all duration-200 hover:scale-105 active:scale-95 group" title="Chat on WhatsApp (01340315117)">
        <span class="absolute top-0 right-0 flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#25D366] border border-slate-900"></span>
        </span>
        <svg class="w-5 h-5 sm:w-6 sm:h-6 fill-current drop-shadow transition-transform group-hover:scale-105" viewBox="0 0 24 24">
            <path d="M12.031 2c-5.508 0-9.985 4.477-9.985 9.985 0 1.761.459 3.479 1.331 4.995l-1.417 5.176 5.303-1.391c1.464.798 3.111 1.22 4.768 1.22 5.508 0 9.985-4.477 9.985-9.985s-4.477-10-9.985-10zm5.82 14.283c-.244.686-1.42 1.31-1.956 1.393-.509.078-1.173.112-1.895-.12-1.189-.381-2.698-1.309-3.924-2.535-1.226-1.226-2.154-2.735-2.535-3.924-.232-.722-.198-1.386-.12-1.895.083-.536.707-1.712 1.393-1.956.17-.061.353-.092.533-.092.146 0 .285.031.409.092.298.146.707.973.805 1.189.097.216.146.409.049.605-.097.195-.146.317-.292.488-.146.17-.305.378-.439.512-.146.146-.305.317-.134.61.171.293.756 1.256 1.622 2.024.866.768 1.622 1.024 1.89.134.268-.89 1.146-.439 1.39-.317.244.122 1.561.732 1.829.866.268.134.451.207.512.317.061.11.061.646-.183 1.332z"/>
        </svg>
    </a>"""

content, count = re.subn(pattern, new_chat_btn, content, flags=re.DOTALL)
print(f"Replaced {count} occurrences")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved successfully!")
