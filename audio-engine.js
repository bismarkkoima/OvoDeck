/**
 * Advanced Audio Engine using the Web Audio API.
 * Provides volume boost (up to 200%), a 10-band equalizer, and audio analysis.
 */
class AudioEngine {
    constructor() {
        this.ctx = null;
        this.source = null;
        this.preamp = null;
        this.filters = [];
        this.gainNode = null;
        this.analyser = null;
        this.initialized = false;
        this.eqActive = false;

        // Standard VLC 10-band frequencies (Hz)
        this.frequencies = [31, 62, 125, 250, 500, 1000, 2000, 4000, 8000, 16000];
        
        // Equalizer Presets definition (gain in dB for each band)
        this.presets = {
            'flat': [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            'classical': [5, 3, 2, 2, -2, -2, -1, 0, 2, 4],
            'club': [0, 0, 2, 4, 4, 3, 1, 0, 0, 0],
            'dance': [4, 6, 5, 0, 0, -2, -4, -4, 0, 0],
            'full-bass': [6, 6, 6, 4, 2, -2, -4, -6, -6, -6],
            'full-treble': [-6, -6, -6, -4, -2, 2, 5, 6, 6, 6],
            'pop': [-2, -1, 0, 2, 4, 4, 1, -1, -2, -2],
            'rock': [4, 3, -2, -4, -1, 1, 4, 5, 6, 6],
            'soft': [2, 1, 0, -1, -1, 1, 2, 3, 4, 4],
            'techno': [4, 5, 4, 0, -2, 2, 4, 4, 4, 3]
        };
    }

    /**
     * Initializes the Web Audio graph using the provided HTMLMediaElement as source.
     * Must be called on user interaction (gesture/click).
     * @param {HTMLMediaElement} mediaElement 
     */
    init(mediaElement) {
        if (this.initialized) return;

        try {
            // 1. Create AudioContext (fallback for older browser variants)
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioContextClass();

            // 2. Create media element source
            this.source = this.ctx.createMediaElementSource(mediaElement);

            // 3. Create Pre-amp node
            this.preamp = this.ctx.createGain();
            this.preamp.gain.value = 1.0; // 0 dB default

            // 4. Create 10 band filters (peaking type)
            // Bandwidth Q factor of 1.414 yields ~1 octave width per filter band
            this.filters = this.frequencies.map((freq) => {
                const filter = this.ctx.createBiquadFilter();
                filter.type = 'peaking';
                filter.frequency.value = freq;
                filter.Q.value = 1.414;
                filter.gain.value = 0; // Flat initially
                return filter;
            });

            // 5. Create Volume / Gain Node (handles mute, volume, and boost up to 200%)
            this.gainNode = this.ctx.createGain();
            this.gainNode.gain.value = mediaElement.volume;

            // 6. Create Analyser Node for Visualizations
            this.analyser = this.ctx.createAnalyser();
            this.analyser.fftSize = 256; // 128 bins (frequency data range)
            this.analyser.smoothingTimeConstant = 0.8;

            // 7. Connect the Web Audio Node Chain
            // Source -> Preamp -> Filter 0 -> Filter 1 -> ... -> Filter 9 -> GainNode -> Analyser -> Destination
            let currentNode = this.source;
            currentNode.connect(this.preamp);
            currentNode = this.preamp;

            this.filters.forEach(filter => {
                currentNode.connect(filter);
                currentNode = filter;
            });

            currentNode.connect(this.gainNode);
            this.gainNode.connect(this.analyser);
            this.analyser.connect(this.ctx.destination);

            this.initialized = true;
            console.log('AudioEngine initialized successfully.');
        } catch (e) {
            console.error('Failed to initialize Web Audio API engine:', e);
        }
    }

    /**
     * Sets the overall volume (supporting boosting up to 2.0 = 200%)
     * @param {number} value - Volume between 0.0 and 2.0
     */
    setVolume(value) {
        if (!this.initialized) return;
        
        // Target volume change smoothly to avoid popping sounds
        if (this.ctx && this.ctx.state !== 'suspended') {
            this.gainNode.gain.setTargetAtTime(value, this.ctx.currentTime, 0.01);
        } else {
            this.gainNode.gain.value = value;
        }
    }

    /**
     * Toggles whether the 10-band equalizer adjustments are active.
     * When disabled, the filters are set to 0dB (bypassed).
     * @param {boolean} active 
     */
    setEqActive(active) {
        this.eqActive = active;
        if (!this.initialized) return;

        if (active) {
            // Apply current preset or values
            this.applyPreset(document.getElementById('eq-preset-select').value);
        } else {
            // Flatten all bands (pass-through)
            this.filters.forEach(filter => {
                filter.gain.setTargetAtTime(0, this.ctx.currentTime, 0.01);
            });
        }
    }

    /**
     * Set the gain value of a specific band by index
     * @param {number} index - Band index (0-9)
     * @param {number} value - Gain in dB (-12 to +12)
     */
    setBandGain(index, value) {
        if (!this.initialized || index < 0 || index >= this.filters.length) return;
        
        // Limit range between -12dB and +12dB
        const constrainedVal = Math.max(-12, Math.min(12, value));
        
        if (this.eqActive) {
            this.filters[index].gain.setTargetAtTime(constrainedVal, this.ctx.currentTime, 0.01);
        }
    }

    /**
     * Sets the pre-amplifier gain level
     * @param {number} dbValue - Gain in dB (-12 to +12)
     */
    setPreampGain(dbValue) {
        if (!this.initialized) return;
        
        // Convert dB gain value to raw linear gain multiplier
        // gainMultiplier = 10 ^ (dbValue / 20)
        const linearGain = Math.pow(10, dbValue / 20);
        this.preamp.gain.setTargetAtTime(linearGain, this.ctx.currentTime, 0.01);
    }

    /**
     * Applies a standard equalizer preset mapping
     * @param {string} presetName 
     */
    applyPreset(presetName) {
        if (!this.initialized) return;
        
        const presetGains = this.presets[presetName];
        if (!presetGains) return;

        presetGains.forEach((gain, index) => {
            if (this.eqActive) {
                this.filters[index].gain.setTargetAtTime(gain, this.ctx.currentTime, 0.01);
            }
        });
        
        return presetGains;
    }

    /**
     * Resumes the AudioContext if suspended (browser security autoplays)
     */
    resume() {
        if (this.ctx && this.ctx.state === 'suspended') {
            this.ctx.resume();
        }
    }

    /**
     * Checks if the context exists and is running.
     * @returns {boolean}
     */
    isRunning() {
        return this.ctx && this.ctx.state === 'running';
    }
}

// Create a globally accessible instance of the audio engine
window.audioEngine = new AudioEngine();
