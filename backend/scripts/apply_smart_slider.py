file_path = r'C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update slider HTML container to responsive aspect ratio
old_slider_container = """        <!-- Modern Borderless Image Slider -->
        <section class="max-w-5xl mx-auto w-full relative group overflow-hidden rounded-3xl shadow-2xl" id="home-slider-wrap">
            <div class="relative w-full h-56 sm:h-72 md:h-96 rounded-3xl overflow-hidden bg-slate-900/60">"""

new_slider_container = """        <!-- Modern Smart Auto-Fitting Image Slider -->
        <section class="max-w-5xl mx-auto w-full relative group overflow-hidden rounded-3xl shadow-2xl bg-slate-950/80" id="home-slider-wrap">
            <div class="relative w-full aspect-[16/9] max-h-[440px] min-h-[250px] rounded-3xl overflow-hidden">"""

if old_slider_container in content:
    content = content.replace(old_slider_container, new_slider_container)
    print("Replaced slider container successfully!")
else:
    print("old_slider_container not found, checking...")

# 2. Update renderHomeSlider JS to use dual-layer smart ambient auto-fit
old_render_home_slider = """            track.innerHTML = homeSlides.map((slide, idx) => `
                <div id="slide-img-${idx}" class="absolute inset-0 transition-opacity duration-700 ease-in-out ${idx === currentSlideIdx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}">
                    <img src="${slide.url}" alt="${slide.title || 'Dai Ichi Slide'}" class="w-full h-full object-cover object-center filter brightness-[0.75]">
                </div>
            `).join('');"""

new_render_home_slider = """            track.innerHTML = homeSlides.map((slide, idx) => `
                <div id="slide-img-${idx}" class="absolute inset-0 flex items-center justify-center overflow-hidden transition-opacity duration-700 ease-in-out ${idx === currentSlideIdx ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}">
                    <!-- Ambient Blurred Glow Backdrop (Auto-matches any photo's colors without empty bars) -->
                    <img src="${slide.url}" alt="" aria-hidden="true" class="absolute inset-0 w-full h-full object-cover object-center blur-2xl scale-125 opacity-45 brightness-75 pointer-events-none">
                    
                    <!-- Main Crisp Image (100% of photo always preserved without cropping or stretching) -->
                    <img src="${slide.url}" alt="${slide.title || 'Dai Ichi Slide'}" class="relative max-w-full max-h-full w-auto h-auto object-contain object-center z-1 drop-shadow-2xl transition-transform duration-700">
                </div>
            `).join('');"""

if old_render_home_slider in content:
    content = content.replace(old_render_home_slider, new_render_home_slider)
    print("Updated renderHomeSlider with smart auto-fit successfully!")
else:
    print("old_render_home_slider not found!")

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Saved static/index.html successfully!")
