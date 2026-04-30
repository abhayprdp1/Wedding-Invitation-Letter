document.addEventListener('DOMContentLoaded', () => {
    // 1. Animation Logic (Click canvas to play)
    const introOverlay = document.getElementById('intro-overlay');
    const canvas = document.getElementById('sequence-canvas');
    const ctx = canvas ? canvas.getContext('2d') : null;
    const mainContent = document.getElementById('main-content');
    
    // Animation configuration
    const totalFrames = 240;
    const frameBaseName = 'new frame optimized/ezgif-frame-';
    const frameExt = '.webp';
    const images = []; // kept for legacy compatibility if needed
    let isPlaying = false;
    
    // High DPI Canvas Scaling Function
    const resizeCanvas = () => {
        if (!canvas) return;
        const dpr = window.devicePixelRatio || 1;
        
        const container = canvas.parentElement;
        const width = container.clientWidth;
        const height = container.clientHeight;
        
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        
        canvas.width = width * dpr;
        canvas.height = height * dpr;
        
        ctx.scale(dpr, dpr);
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
    };

    let bgColorStr = 'rgba(235, 233, 231, 1)';
    let bgColorTransparentStr = 'rgba(235, 233, 231, 0)';

    const extractBgColor = (img) => {
        try {
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = 1;
            tempCanvas.height = 1;
            const tempCtx = tempCanvas.getContext('2d');
            tempCtx.drawImage(img, 0, 0, 1, 1);
            const pixelData = tempCtx.getImageData(0, 0, 1, 1).data;
            bgColorStr = `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, 1)`;
            bgColorTransparentStr = `rgba(${pixelData[0]}, ${pixelData[1]}, ${pixelData[2]}, 0)`;
            
            // Update the overlay background to match the frame
            if (introOverlay) {
                introOverlay.style.backgroundColor = bgColorStr;
                const innerDiv = introOverlay.querySelector('div');
                if (innerDiv) innerDiv.style.backgroundColor = bgColorStr;
            }
        } catch (error) {
            console.warn("Could not extract background color (likely due to opening file directly instead of local server):", error);
        }
    };

    const drawFrameOnCanvas = (img) => {
        if (!img || !img.complete || img.naturalWidth === 0) return;
        
        const container = canvas.parentElement;
        const canvasLogicalWidth = container.clientWidth;
        const canvasLogicalHeight = container.clientHeight;
        
        ctx.clearRect(0, 0, canvasLogicalWidth, canvasLogicalHeight);
        
        // Scale the canvas dynamically to cover the entire container (object-fit: cover)
        const ratio = Math.max(canvasLogicalWidth / img.naturalWidth, canvasLogicalHeight / img.naturalHeight);
        const newWidth = img.naturalWidth * ratio;
        const newHeight = img.naturalHeight * ratio;
        const x = (canvasLogicalWidth - newWidth) / 2;
        const y = (canvasLogicalHeight - newHeight) / 2;
        
        ctx.drawImage(img, x, y, newWidth, newHeight);

        // Hide "Veo" watermark in the bottom right corner using a soft radial gradient patch
        const cornerX = x + newWidth;
        const cornerY = y + newHeight;
        const patchSize = Math.max(newWidth, newHeight) * 0.15; // Size of the patch to cover watermark

        const wmGradient = ctx.createRadialGradient(cornerX, cornerY, 0, cornerX, cornerY, patchSize);
        wmGradient.addColorStop(0, bgColorStr);
        wmGradient.addColorStop(0.4, bgColorStr);
        wmGradient.addColorStop(1, bgColorTransparentStr);

        ctx.fillStyle = wmGradient;
        ctx.fillRect(cornerX - patchSize, cornerY - patchSize, patchSize, patchSize);
    };
    
    // Preload images efficiently with a sliding window buffer to prevent browser hang
    const preloadedImages = new Array(totalFrames).fill(null);
    let firstFrameLoaded = false;
    const preloadBuffer = 15; // Number of frames to keep loaded ahead
    
    const loadFrame = (index, callback) => {
        if (index > totalFrames || index < 1) return;
        if (preloadedImages[index - 1]) {
            if (callback) callback(preloadedImages[index - 1]);
            return;
        }
        
        const img = new Image();
        const frameNum = String(index).padStart(3, '0');
        
        img.onload = () => {
            preloadedImages[index - 1] = img;
            if (index === 1 && !firstFrameLoaded) {
                firstFrameLoaded = true;
                extractBgColor(img);
                canvas.style.display = 'block';
                canvas.style.cursor = 'pointer';
                resizeCanvas();
                drawFrameOnCanvas(img);
            }
            if (callback) callback(img);
        };
        
        img.src = `${frameBaseName}${frameNum}${frameExt}`;
    };

    // Kick off the initial buffer loading
    for (let i = 1; i <= preloadBuffer; i++) {
        loadFrame(i);
    }

    if (canvas) {
        // Start animation when clicking the fullscreen canvas or the button
        const startAnimation = () => {
            if (isPlaying) return;
            isPlaying = true;
            canvas.style.cursor = 'default';
            
            const introUi = document.getElementById('intro-ui');
            if (introUi) introUi.style.opacity = '0';
            
            let currentFrame = 0;
            const fps = 30;
            const frameDuration = 1000 / fps;
            let lastTime = performance.now();

            const animate = (time) => {
                if (currentFrame >= totalFrames - 1) {
                    // Animation complete, wait a moment then fade out overlay
                    setTimeout(() => {
                        introOverlay.style.opacity = '0';
                        setTimeout(() => {
                            introOverlay.style.display = 'none';
                            mainContent.classList.add('visible');
                            document.body.style.overflow = 'auto'; // allow scrolling
                            document.body.classList.remove('overflow-hidden');
                            checkScrollAnimations();
                        }, 1000);
                    }, 1500); // 1.5 second pause at the end of the video to read the text
                    return;
                }
                
                const deltaTime = time - lastTime;
                
                // Use requestAnimationFrame but clamp it to our target FPS
                if (deltaTime >= frameDuration) {
                    // Preload next batch of frames dynamically
                    for(let i = 1; i <= preloadBuffer; i++) {
                        let f = currentFrame + i + 1;
                        if (f <= totalFrames && !preloadedImages[f - 1]) {
                            loadFrame(f);
                        }
                    }
                    
                    // Unload older frames to free RAM and prevent crashing/hanging
                    for(let i = 0; i < currentFrame - 2; i++) {
                        if (preloadedImages[i]) {
                            preloadedImages[i].src = ''; // Help GC
                            preloadedImages[i] = null;
                        }
                    }

                    // Only draw if the image has finished loading
                    if (preloadedImages[currentFrame] && preloadedImages[currentFrame].complete) {
                        drawFrameOnCanvas(preloadedImages[currentFrame]);
                        
                        // Fade in the text after the second curtain opens (around 80% through the animation)
                        if (currentFrame === Math.floor(totalFrames * 0.80)) {
                            const curtainText = document.getElementById('curtain-text');
                            if (curtainText) curtainText.style.opacity = '1';
                        }
                        
                        currentFrame++;
                        
                        // Adjust lastTime to maintain accurate framerate
                        lastTime = time - (deltaTime % frameDuration);
                    }
                }
                
                requestAnimationFrame(animate);
            };
            
            requestAnimationFrame(animate);
        };
        
        canvas.addEventListener('click', startAnimation);
        const btnEnter = document.getElementById('btn-enter');
        if (btnEnter) {
            btnEnter.addEventListener('click', startAnimation);
        }
    }

    // Window resize handling for canvas
    window.addEventListener('resize', () => {
        if(canvas && introOverlay.style.display !== 'none') {
             resizeCanvas();
             if (!isPlaying && preloadedImages[0] && preloadedImages[0].complete) {
                 drawFrameOnCanvas(preloadedImages[0]);
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
            } else {
                entry.target.classList.remove('in-view');
            }
        });
    }, observerOptions);

    const checkScrollAnimations = () => {
        document.querySelectorAll('.reveal-element').forEach(el => {
            observer.observe(el);
        });
    };

    // 2. Countdown Logic
    const weddingDate = new Date('May 21, 2026 12:00:00').getTime();
    
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

    // 4. Scratch Card Logic
    const scratchCanvas = document.getElementById('scratch-canvas');
    if (scratchCanvas) {
        const scratchCtx = scratchCanvas.getContext('2d');
        let isDrawing = false;
        let isRevealed = false;

        // Initialize Canvas
        const initCanvas = () => {
            scratchCanvas.width = scratchCanvas.offsetWidth;
            scratchCanvas.height = scratchCanvas.offsetHeight;
            
            // Fill with gold gradient
            const gradient = scratchCtx.createLinearGradient(0, 0, scratchCanvas.width, scratchCanvas.height);
            gradient.addColorStop(0, '#ebd498');
            gradient.addColorStop(0.5, '#a8823a');
            gradient.addColorStop(1, '#d2ad52');
            
            scratchCtx.fillStyle = gradient;
            scratchCtx.fillRect(0, 0, scratchCanvas.width, scratchCanvas.height);
            
            // Add "Scratch Here" text
            scratchCtx.fillStyle = '#ffffff';
            scratchCtx.font = 'bold 16px Inter, sans-serif';
            scratchCtx.textAlign = 'center';
            scratchCtx.textBaseline = 'middle';
            scratchCtx.shadowColor = 'rgba(0,0,0,0.2)';
            scratchCtx.shadowBlur = 4;
            scratchCtx.shadowOffsetX = 1;
            scratchCtx.shadowOffsetY = 1;
            scratchCtx.fillText('SCRATCH TO REVEAL', scratchCanvas.width / 2, scratchCanvas.height / 2);
            
            // Reset composite operation to default
            scratchCtx.globalCompositeOperation = 'source-over';
        };

        // Needs to wait for fonts and layout to settle
        setTimeout(initCanvas, 100);

        const getMousePos = (e) => {
            const rect = scratchCanvas.getBoundingClientRect();
            // Handle both touch and mouse events
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        };

        const scratch = (e) => {
            if (!isDrawing || isRevealed) return;
            e.preventDefault();
            
            const pos = getMousePos(e);
            
            scratchCtx.globalCompositeOperation = 'destination-out';
            scratchCtx.beginPath();
            scratchCtx.arc(pos.x, pos.y, 22, 0, Math.PI * 2);
            scratchCtx.fill();
            
            checkReveal();
        };

        const checkReveal = () => {
            // Check how much is scratched off (checking a grid of pixels for performance)
            const imageData = scratchCtx.getImageData(0, 0, scratchCanvas.width, scratchCanvas.height);
            const pixels = imageData.data;
            let transparentPixels = 0;
            const totalPixels = pixels.length / 4;
            
            // Check every 16th pixel for speed
            for (let i = 3; i < pixels.length; i += 64) {
                if (pixels[i] === 0) {
                    transparentPixels++;
                }
            }
            
            const transparentPercentage = (transparentPixels / (totalPixels / 16)) * 100;
            
            if (transparentPercentage > 35) {
                isRevealed = true;
                scratchCanvas.style.opacity = '0';
                setTimeout(() => {
                    scratchCanvas.style.pointerEvents = 'none';
                }, 700);
            }
        };

        // Event Listeners
        scratchCanvas.addEventListener('mousedown', (e) => { isDrawing = true; scratch(e); });
        scratchCanvas.addEventListener('mousemove', scratch);
        window.addEventListener('mouseup', () => { isDrawing = false; });

        scratchCanvas.addEventListener('touchstart', (e) => { isDrawing = true; scratch(e); }, { passive: false });
        scratchCanvas.addEventListener('touchmove', scratch, { passive: false });
        window.addEventListener('touchend', () => { isDrawing = false; });
        
        // Handle resize
        window.addEventListener('resize', () => {
            if (!isRevealed) {
                initCanvas();
            }
        });
    }
});
