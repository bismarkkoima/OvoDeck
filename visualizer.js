/**
 * AudioVisualizer Class.
 * Renders real-time audio visualization onto an HTML5 Canvas using data from AnalyserNode.
 * Supports multiple modes: frequency bars, oscilloscope wave, circular spectrum, and particles.
 */
class AudioVisualizer {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) return;
        
        this.ctx = this.canvas.getContext('2d');
        this.animationId = null;
        this.isRunning = false;
        this.mode = 'bars'; // 'bars' | 'wave' | 'circle' | 'particles'
        
        // Particle system state
        this.particles = [];
        this.numParticles = 80;
        this.peakHistory = []; // Tracks historical peaks for the bar visualizer
        
        // Listen for resize events
        window.addEventListener('resize', () => this.handleResize());
    }

    /**
     * Resizes canvas to match its offset size exactly
     */
    handleResize() {
        if (!this.canvas) return;
        
        // Avoid stretching by mapping coordinate space to pixel dimensions
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width * (window.devicePixelRatio || 1);
        this.canvas.height = rect.height * (window.devicePixelRatio || 1);
        this.ctx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);
        
        if (this.mode === 'particles') {
            this.initParticles();
        }
    }

    /**
     * Start the canvas rendering loop
     */
    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.handleResize();
        this.initParticles();
        this.loop();
    }

    /**
     * Stop the rendering loop
     */
    stop() {
        this.isRunning = false;
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
            this.animationId = null;
        }
        
        // Clear canvas on stop
        if (this.canvas) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    /**
     * Set visualizer mode
     * @param {string} mode - 'bars' | 'wave' | 'circle' | 'particles'
     */
    setMode(mode) {
        this.mode = mode;
        if (mode === 'particles') {
            this.initParticles();
        }
        this.peakHistory = [];
    }

    /**
     * Populate particle collection
     */
    initParticles() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        this.particles = [];
        
        for (let i = 0; i < this.numParticles; i++) {
            this.particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                size: Math.random() * 3 + 1,
                speedX: (Math.random() - 0.5) * 1.5,
                speedY: -Math.random() * 1.5 - 0.5,
                hue: Math.random() * 30 + 15 // Orange hue range (15 - 45)
            });
        }
    }

    /**
     * Main rendering tick
     */
    loop() {
        if (!this.isRunning) return;

        this.draw();
        this.animationId = requestAnimationFrame(() => this.loop());
    }

    /**
     * Read audio data and draw graphics frame
     */
    draw() {
        const width = this.canvas.width / (window.devicePixelRatio || 1);
        const height = this.canvas.height / (window.devicePixelRatio || 1);
        const ctx = this.ctx;

        // Check if Web Audio API is active
        if (!window.audioEngine || !window.audioEngine.initialized || !window.audioEngine.analyser) {
            // Render basic standby screen
            ctx.fillStyle = '#0c0d12';
            ctx.fillRect(0, 0, width, height);
            
            ctx.font = '14px Outfit, sans-serif';
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.textAlign = 'center';
            ctx.fillText('Audio visualizer standby...', width / 2, height / 2);
            return;
        }

        const analyser = window.audioEngine.analyser;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        // Fetch data depending on display mode
        if (this.mode === 'wave') {
            analyser.getByteTimeDomainData(dataArray);
        } else {
            analyser.getByteFrequencyData(dataArray);
        }

        // Draw modes
        switch (this.mode) {
            case 'wave':
                this.drawWave(dataArray, bufferLength, width, height);
                break;
            case 'circle':
                this.drawCircle(dataArray, bufferLength, width, height);
                break;
            case 'particles':
                this.drawParticles(dataArray, bufferLength, width, height);
                break;
            case 'bars':
            default:
                this.drawBars(dataArray, bufferLength, width, height);
                break;
        }
    }

    /**
     * Render classic vertical frequency bars
     */
    drawBars(dataArray, bufferLength, width, height) {
        const ctx = this.ctx;
        
        // Draw trailing background
        ctx.fillStyle = 'rgba(12, 13, 18, 0.25)'; // trail blur effect
        ctx.fillRect(0, 0, width, height);

        // Render frequency bar chart (skip high/empty frequencies for visual balance)
        const activeBands = Math.floor(bufferLength * 0.75); 
        const barWidth = (width / activeBands) - 1.5;
        
        let x = 0;
        
        // Setup gradients
        const gradient = ctx.createLinearGradient(0, height, 0, 0);
        gradient.addColorStop(0, '#FF4500'); // Red-Orange
        gradient.addColorStop(0.5, '#FF6600'); // VLC Orange
        gradient.addColorStop(1, '#FFCC00'); // Yellow-Orange

        for (let i = 0; i < activeBands; i++) {
            const val = dataArray[i];
            // Normalize value to fit height
            const percent = val / 255;
            const barHeight = percent * (height - 40);

            // Draw bar shadow glow for active frequencies
            if (barHeight > 5) {
                ctx.fillStyle = gradient;
                ctx.fillRect(x, height - barHeight, barWidth, barHeight);
                
                // Peak meter logic
                if (!this.peakHistory[i] || barHeight > this.peakHistory[i].val) {
                    this.peakHistory[i] = { val: barHeight, age: 0 };
                } else {
                    this.peakHistory[i].age++;
                    if (this.peakHistory[i].age > 15) {
                        this.peakHistory[i].val -= 1.5; // decay peak
                    }
                }

                // Draw peak dot
                if (this.peakHistory[i].val > 0) {
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
                    ctx.fillRect(x, height - this.peakHistory[i].val - 3, barWidth, 2);
                }
            }

            x += barWidth + 1.5;
        }
    }

    /**
     * Render oscilloscope wave lines
     */
    drawWave(dataArray, bufferLength, width, height) {
        const ctx = this.ctx;
        
        // Clear background fully
        ctx.fillStyle = '#0c0d12';
        ctx.fillRect(0, 0, width, height);

        // Set line styling
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#FF6600';
        ctx.shadowBlur = 15;
        ctx.shadowColor = 'rgba(255, 102, 0, 0.6)';
        
        ctx.beginPath();

        const sliceWidth = width / bufferLength;
        let x = 0;

        for (let i = 0; i < bufferLength; i++) {
            // Time domain values centered around 128 (0 offset)
            const v = dataArray[i] / 128.0;
            const y = (v * height) / 2.0;

            if (i === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }

            x += sliceWidth;
        }

        ctx.lineTo(width, height / 2);
        ctx.stroke();
        
        // Reset shadows to keep other draw elements clean
        ctx.shadowBlur = 0;
    }

    /**
     * Render circular radial frequency spectrum
     */
    drawCircle(dataArray, bufferLength, width, height) {
        const ctx = this.ctx;
        
        // Trailing background
        ctx.fillStyle = 'rgba(12, 13, 18, 0.2)';
        ctx.fillRect(0, 0, width, height);

        const centerX = width / 2;
        const centerY = height / 2;
        
        // Calculate average bass frequency to pulse the center circle
        let bassSum = 0;
        const bassCount = 10;
        for (let i = 0; i < bassCount; i++) {
            bassSum += dataArray[i];
        }
        const bassAvg = bassSum / bassCount;
        const bassNormalized = bassAvg / 255;
        
        // Pulsing baseline radius
        const baseRadius = 65 + (bassNormalized * 25);

        // Draw pulsing core glow
        const glowRad = ctx.createRadialGradient(centerX, centerY, baseRadius - 15, centerX, centerY, baseRadius + 35);
        glowRad.addColorStop(0, 'rgba(255, 102, 0, 0.15)');
        glowRad.addColorStop(1, 'rgba(255, 102, 0, 0)');
        ctx.fillStyle = glowRad;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius + 30, 0, Math.PI * 2);
        ctx.fill();

        // Draw outer bars
        const numBars = 72; // Circular bars count
        const angleStep = (Math.PI * 2) / numBars;
        
        // Gradient color for bars
        const barGradient = ctx.createLinearGradient(centerX - 100, centerY - 100, centerX + 100, centerY + 100);
        barGradient.addColorStop(0, '#FF4500');
        barGradient.addColorStop(1, '#FFCC00');

        ctx.lineWidth = 3;
        ctx.strokeStyle = barGradient;

        for (let i = 0; i < numBars; i++) {
            const dataIndex = Math.floor((i / numBars) * (bufferLength * 0.6));
            const val = dataArray[dataIndex];
            const barLength = (val / 255) * 110;

            const angle = i * angleStep;
            
            const startX = centerX + Math.cos(angle) * baseRadius;
            const startY = centerY + Math.sin(angle) * baseRadius;
            
            const endX = centerX + Math.cos(angle) * (baseRadius + barLength);
            const endY = centerY + Math.sin(angle) * (baseRadius + barLength);

            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }

        // Draw center solid disk
        ctx.fillStyle = '#161822';
        ctx.strokeStyle = '#FF6600';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
    }

    /**
     * Render rising bubbles/particles that react to bass frequency velocity
     */
    drawParticles(dataArray, bufferLength, width, height) {
        const ctx = this.ctx;

        ctx.fillStyle = 'rgba(12, 13, 18, 0.25)';
        ctx.fillRect(0, 0, width, height);

        // Fetch bass energy
        let bassSum = 0;
        for (let i = 0; i < 8; i++) {
            bassSum += dataArray[i];
        }
        const bassVelocity = bassSum / 8 / 255; // 0 to 1

        this.particles.forEach(p => {
            // Speed and size increases with bass energy
            const currentSpeedY = p.speedY * (1 + bassVelocity * 2.5);
            const currentSpeedX = p.speedX * (1 + bassVelocity * 1.5);
            
            p.y += currentSpeedY;
            p.x += currentSpeedX;

            // Recirculate particle if it drifts offscreen
            if (p.y < 0) {
                p.y = height;
                p.x = Math.random() * width;
            }
            if (p.x < 0 || p.x > width) {
                p.x = Math.random() * width;
            }

            // Draw glowing particle
            const size = p.size * (1 + bassVelocity * 1.5);
            
            ctx.shadowBlur = 8;
            ctx.shadowColor = `hsla(${p.hue}, 100%, 50%, 0.6)`;
            ctx.fillStyle = `hsla(${p.hue}, 100%, 50%, ${0.3 + bassVelocity * 0.6})`;
            
            ctx.beginPath();
            ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.shadowBlur = 0; // Reset shadow
    }
}

// Instantiate visualizer singleton
window.visualizer = new AudioVisualizer('visualizer-canvas');
