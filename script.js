document.addEventListener('DOMContentLoaded', () => {
    // 1. Animation Logic (Click canvas to play)
    const introOverlay = document.getElementById('intro-overlay');
    const canvas = document.getElementById('sequence-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const mainContent = document.getElementById('main-content');
    
    // Animation configuration
    const totalFrames = 116; // Removed last 5 frames from 121
    const frameBaseName = 'public/Hero/ezgif-frame-';
    const images = [];
    let isPlaying = false;
    
    // High DPI Canvas Scaling Function
    const resizeCanvas = () => {
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        
        canvas.style.width = window.innerWidth + 'px';
        canvas.style.height = window.innerHeight + 'px';
        
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
    };

    const drawFrameOnCanvas = (img) => {
        if (!img || !img.complete || img.naturalWidth === 0) return;
        const canvasLogicalWidth = window.innerWidth;
        const canvasLogicalHeight = window.innerHeight;
        
        ctx.clearRect(0, 0, canvasLogicalWidth, canvasLogicalHeight);
        
        const ratio = Math.max(canvasLogicalWidth / img.naturalWidth, canvasLogicalHeight / img.naturalHeight);
        const newWidth = img.naturalWidth * ratio;
        const newHeight = img.naturalHeight * ratio;
        const x = (canvasLogicalWidth - newWidth) / 2;
        const y = (canvasLogicalHeight - newHeight) / 2;
        
        ctx.drawImage(img, x, y, newWidth, newHeight);
    };
    
    // Preload all images
    for (let i = 1; i <= totalFrames; i++) {
        const img = new Image();
        const frameNum = String(i).padStart(3, '0');
        
        if (i === 1) {
            // Draw the first frame immediately once it loads
            img.onload = () => {
                canvas.style.display = 'block';
                canvas.style.cursor = 'pointer';
                resizeCanvas();
                drawFrameOnCanvas(img);
            };
        }
        
        img.src = `${frameBaseName}${frameNum}.jpg`;
        images.push(img);
    }

    if (canvas) {
        // Start animation when clicking the fullscreen canvas
        canvas.addEventListener('click', () => {
            if (isPlaying) return;
            isPlaying = true;
            canvas.style.cursor = 'default';
            
            let currentFrame = 0;
            const fps = 30;

            const playSequence = setInterval(() => {
                if (currentFrame >= totalFrames - 1) {
                    clearInterval(playSequence);
                    
                    // Animation complete, fade out overlay
                    introOverlay.style.opacity = '0';
                    setTimeout(() => {
                        introOverlay.style.display = 'none';
                        mainContent.classList.add('visible');
                        document.body.style.overflow = 'auto'; // allow scrolling
                        document.body.classList.remove('overflow-hidden');
                        checkScrollAnimations();
                    }, 1000);
                    return;
                }
                
                drawFrameOnCanvas(images[currentFrame]);
                currentFrame++;
            }, 1000 / fps);
        });
    }

    // Window resize handling for canvas
    window.addEventListener('resize', () => {
        if(canvas && introOverlay.style.display !== 'none') {
             resizeCanvas();
             if (!isPlaying && images[0] && images[0].complete) {
                 drawFrameOnCanvas(images[0]);
             }
        }
    });

    // Intersection Observer for Scroll Animations
    const observerOptions = {
        threshold: 0.15,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('in-view');
            }
        });
    }, observerOptions);

    const checkScrollAnimations = () => {
        document.querySelectorAll('.reveal-element').forEach(el => {
            observer.observe(el);
        });
    };

    // 2. Countdown Logic
    const weddingDate = new Date('May 31, 2026 12:00:00').getTime();
    
    const updateCountdown = () => {
        const now = new Date().getTime();
        const distance = weddingDate - now;

        if (distance < 0) return; // Time passed

        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);

        const elDays = document.getElementById('days');
        const elHours = document.getElementById('hours');
        const elMinutes = document.getElementById('minutes');
        const elSeconds = document.getElementById('seconds');

        if (elDays) elDays.innerText = String(days).padStart(2, '0');
        if (elHours) elHours.innerText = String(hours).padStart(2, '0');
        if (elMinutes) elMinutes.innerText = String(minutes).padStart(2, '0');
        if (elSeconds) elSeconds.innerText = String(seconds).padStart(2, '0');
    };

    setInterval(updateCountdown, 1000);
    updateCountdown();

    // 3. RSVP Confetti & State Logic
    const btnRsvp = document.getElementById('btn-rsvp');
    const rsvpStatus = document.getElementById('rsvp-status');
    const rsvpIcon = document.getElementById('rsvp-icon');
    const rsvpLabel = document.getElementById('rsvp-label');

    let isAttending = false;

    if (btnRsvp) {
        btnRsvp.addEventListener('click', () => {
            isAttending = !isAttending;

            if (isAttending) {
                // Trigger Confetti
                if (typeof confetti === 'function') {
                    const count = 200;
                    const defaults = {
                        origin: { y: 0.8 },
                        colors: ['#ffffff', '#d2ad52', '#658668', '#1f4037'],
                        disableForReducedMotion: true
                    };

                    function fire(particleRatio, opts) {
                        confetti({
                            ...defaults,
                            ...opts,
                            particleCount: Math.floor(count * particleRatio)
                        });
                    }

                    fire(0.25, { spread: 26, startVelocity: 55 });
                    fire(0.2, { spread: 60 });
                    fire(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
                    fire(0.1, { spread: 120, startVelocity: 25, decay: 0.92, scalar: 1.2 });
                    fire(0.1, { spread: 120, startVelocity: 45 });
                }

                // Update text to "Thank you!"
                rsvpStatus.innerHTML = `Thank you! Your response has been recorded <span style="font-style: normal">💚</span>`;
                
                // Update Button to "Cancel Attendance" styled OUTLINE
                btnRsvp.classList.remove('bg-white', 'text-wed-dark', 'shadow-lg', 'hover:bg-gray-50');
                btnRsvp.classList.add('bg-transparent', 'text-white', 'border-white/50');
                
                rsvpIcon.innerHTML = `<svg class="w-[18px] h-[18px] text-white opacity-80 stroke-[1.5]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
                rsvpLabel.innerText = "Cancel Attendance";
                rsvpLabel.classList.remove('text-[20px]');
                rsvpLabel.classList.add('text-[18px]');
                
            } else {
                // Revert to original state
                rsvpStatus.innerHTML = `Your response has been removed.`;
                
                btnRsvp.classList.add('bg-white', 'text-wed-dark', 'shadow-lg', 'hover:bg-gray-50');
                btnRsvp.classList.remove('bg-transparent', 'text-white', 'border-white/50');
                
                rsvpIcon.innerHTML = `<svg class="w-[22px] h-[22px] text-wed-dark opacity-90 stroke-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>`;
                rsvpLabel.innerText = "Yes, In Sha Allah";
                rsvpLabel.classList.add('text-[20px]');
                rsvpLabel.classList.remove('text-[18px]');
            }
        });
    }
});
