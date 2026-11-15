import sys

file_path = r"C:\Users\faruk\.gemini\antigravity\scratch\jft-cbt-exam-server\static\index.html"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update HTML slider viewport tag
old_viewport_html = """        <!-- Modern Horizontal Image Slider (No Gray Background) -->
        <section class="max-w-5xl mx-auto w-full relative group overflow-hidden rounded-3xl shadow-2xl" id="home-slider-wrap">
            <div class="relative w-full aspect-[16/9] max-h-[440px] min-h-[250px] rounded-3xl overflow-hidden bg-transparent">"""

new_viewport_html = """        <!-- Modern Horizontal Image Slider (Adaptive Ratio, No Gray Background) -->
        <section class="max-w-5xl mx-auto w-full relative group overflow-hidden rounded-3xl shadow-2xl" id="home-slider-wrap">
            <div id="home-slider-viewport" class="relative w-full max-h-[500px] min-h-[240px] rounded-3xl overflow-hidden bg-transparent transition-[aspect-ratio,height] duration-500 ease-out" style="aspect-ratio: 16 / 9;">"""

# 2. Update JS renderHomeSlider, updateSlidePosition, updateSlideRatio
old_js_block = """        function renderHomeSlider() {
            const track = document.getElementById('home-slider-track');
            const indicators = document.getElementById('slider-indicators');
            if(!track || homeSlides.length === 0) return;

            // Render each slide filling the container cleanly with object-cover and no gray background
            track.innerHTML = homeSlides.map((slide, idx) => `
                <div class="min-w-full w-full h-full flex-shrink-0 relative overflow-hidden bg-transparent">
                    <img src="${slide.url}" alt="${slide.title || 'Dai Ichi Slide'}" class="w-full h-full object-cover object-center select-none">
                </div>
            `).join('');

            // Set track position for current slide
            track.style.transform = `translateX(-${currentSlideIdx * 100}%)`;

            if(indicators) {
                indicators.innerHTML = homeSlides.map((_, idx) => `
                    <button onclick="goToSlide(${idx})" class="h-2 rounded-full transition-all duration-300 ${idx === currentSlideIdx ? 'w-8 bg-cyan-400 shadow-md shadow-cyan-400/50' : 'w-2.5 bg-white/40 hover:bg-white/70'}" title="Slide ${idx+1}"></button>
                `).join('');
            }

            updateSlideCaption();
        }

        function updateSlidePosition() {
            const track = document.getElementById('home-slider-track');
            if(track) {
                track.style.transform = `translateX(-${currentSlideIdx * 100}%)`;
            }
            updateSlideCaption();
        }"""

new_js_block = """        function updateSlideRatio() {
            if(!homeSlides || homeSlides.length === 0) return;
            const active = homeSlides[currentSlideIdx];
            const viewport = document.getElementById('home-slider-viewport');
            if(!viewport || !active) return;

            if(active._aspectRatio) {
                viewport.style.aspectRatio = active._aspectRatio;
                return;
            }

            const img = new Image();
            img.src = active.url;
            const setRatio = () => {
                if(img.naturalWidth && img.naturalHeight) {
                    active._aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`;
                    viewport.style.aspectRatio = active._aspectRatio;
                }
            };
            if(img.complete && img.naturalWidth) {
                setRatio();
            } else {
                img.onload = setRatio;
            }
        }

        function renderHomeSlider() {
            const track = document.getElementById('home-slider-track');
            const indicators = document.getElementById('slider-indicators');
            if(!track || homeSlides.length === 0) return;

            // Pre-calculate image natural ratios for adaptive slider framing
            homeSlides.forEach((slide) => {
                if(!slide._aspectRatio) {
                    const testImg = new Image();
                    testImg.src = slide.url;
                    testImg.onload = () => {
                        slide._aspectRatio = `${testImg.naturalWidth} / ${testImg.naturalHeight}`;
                        const active = homeSlides[currentSlideIdx];
                        if(active && active.url === slide.url) {
                            updateSlideRatio();
                        }
                    };
                }
            });

            // Render each slide preserving 100% natural aspect ratio without cropping
            track.innerHTML = homeSlides.map((slide, idx) => `
                <div class="min-w-full w-full h-full flex-shrink-0 relative overflow-hidden bg-transparent flex items-center justify-center">
                    <img src="${slide.url}" alt="${slide.title || 'Dai Ichi Slide'}" class="w-full h-full object-contain object-center select-none">
                </div>
            `).join('');

            // Set track position for current slide
            track.style.transform = `translateX(-${currentSlideIdx * 100}%)`;

            if(indicators) {
                indicators.innerHTML = homeSlides.map((_, idx) => `
                    <button onclick="goToSlide(${idx})" class="h-2 rounded-full transition-all duration-300 ${idx === currentSlideIdx ? 'w-8 bg-cyan-400 shadow-md shadow-cyan-400/50' : 'w-2.5 bg-white/40 hover:bg-white/70'}" title="Slide ${idx+1}"></button>
                `).join('');
            }

            updateSlideCaption();
            updateSlideRatio();
        }

        function updateSlidePosition() {
            const track = document.getElementById('home-slider-track');
            if(track) {
                track.style.transform = `translateX(-${currentSlideIdx * 100}%)`;
            }
            updateSlideCaption();
            updateSlideRatio();
        }"""

norm_content = content.replace('\r\n', '\n')
norm_old_viewport = old_viewport_html.replace('\r\n', '\n')
norm_new_viewport = new_viewport_html.replace('\r\n', '\n')
norm_old_js = old_js_block.replace('\r\n', '\n')
norm_new_js = new_js_block.replace('\r\n', '\n')

updated = False
if norm_old_viewport in norm_content:
    norm_content = norm_content.replace(norm_old_viewport, norm_new_viewport, 1)
    print("Viewport HTML updated successfully!")
    updated = True
else:
    print("Viewport HTML not found!")

if norm_old_js in norm_content:
    norm_content = norm_content.replace(norm_old_js, norm_new_js, 1)
    print("JS block updated successfully!")
    updated = True
else:
    print("JS block not found!")

if updated:
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(norm_content)
    print("Saved static/index.html with adaptive ratio support!")
