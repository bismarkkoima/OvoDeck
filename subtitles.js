/**
 * SubtitlesManager Class.
 * Parses .srt and .vtt file strings, manages subtitle delay synchronization offsets,
 * tracks video playback time, and renders caption text into a custom styled overlay.
 */
class SubtitlesManager {
    constructor(videoElementId, overlayId) {
        this.video = document.getElementById(videoElementId);
        this.overlay = document.getElementById(overlayId);
        
        this.cues = [];
        this.delayOffset = 0.0; // Delay in seconds (e.g. -1.5s or +2.0s)
        this.isEnabled = true;
        this.lastActiveCue = null;

        this.setupTimeListener();
    }

    /**
     * Set up continuous time update monitoring on the video element
     */
    setupTimeListener() {
        if (!this.video) return;

        this.video.addEventListener('timeupdate', () => {
            if (this.isEnabled && this.cues.length > 0) {
                this.updateCaptions();
            }
        });

        // Hide overlay on seek/stop
        this.video.addEventListener('seeked', () => {
            this.clearOverlay();
        });
        
        this.video.addEventListener('emptied', () => {
            this.clearCues();
        });
    }

    /**
     * Clear all current loaded subtitle cues
     */
    clearCues() {
        this.cues = [];
        this.lastActiveCue = null;
        this.clearOverlay();
    }

    /**
     * Set subtitle sync offset in seconds
     * @param {number} seconds 
     */
    setDelayOffset(seconds) {
        this.delayOffset = parseFloat(seconds) || 0.0;
        this.updateCaptions(); // Instant refresh
    }

    /**
     * Toggle display of subtitles visibility
     * @param {boolean} visible 
     */
    setEnabled(visible) {
        this.isEnabled = visible;
        if (!visible) {
            this.clearOverlay();
        } else {
            this.updateCaptions();
        }
    }

    /**
     * Load subtitle file (VTT or SRT) and parse it
     * @param {File} file 
     * @returns {Promise<boolean>}
     */
    loadFile(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const text = e.target.result;
                const parsed = this.parseSubtitles(text);
                
                if (parsed && parsed.length > 0) {
                    this.cues = parsed;
                    this.lastActiveCue = null;
                    console.log(`Successfully parsed ${this.cues.length} subtitle cues.`);
                    resolve(true);
                } else {
                    console.warn('Parser returned 0 cues. Subtitle format might be invalid.');
                    resolve(false);
                }
            };

            reader.onerror = () => {
                resolve(false);
            };

            reader.readAsText(file);
        });
    }

    /**
     * Parses subtitle text into structured cue objects
     * Works for both SRT and WebVTT syntax
     * @param {string} text 
     * @returns {Array} List of cues { start, end, text }
     */
    parseSubtitles(text) {
        const cues = [];
        
        // Clean up line endings and split by double-newline blocks
        const blocks = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split(/\n\n+/);
        
        const timeRegex = /(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})\s+-->\s+(\d{1,2}):(\d{2}):(\d{2})[,.](\d{3})/;
        const shortTimeRegex = /(\d{2}):(\d{2})[,.](\d{3})\s+-->\s+(\d{2}):(\d{2})[,.](\d{3})/;

        blocks.forEach(block => {
            const lines = block.trim().split('\n');
            if (lines.length < 2) return;

            let timeLineIdx = -1;
            let match = null;

            // Find line containing timestamp markers
            for (let i = 0; i < Math.min(3, lines.length); i++) {
                const testLine = lines[i].trim();
                match = testLine.match(timeRegex) || testLine.match(shortTimeRegex);
                if (match) {
                    timeLineIdx = i;
                    break;
                }
            }

            if (timeLineIdx === -1 || !match) return;

            // Extract timestamps
            const start = this.parseTime(match[0].split('-->')[0]);
            const end = this.parseTime(match[0].split('-->')[1]);

            // Gather subtitle body lines
            const bodyLines = lines.slice(timeLineIdx + 1)
                .map(l => l.trim())
                .filter(l => l.length > 0 && !l.startsWith('NOTE') && !l.startsWith('STYLE'));
                
            const subText = bodyLines.join('<br>');

            if (subText.length > 0) {
                cues.push({ start, end, text: subText });
            }
        });

        // Ensure cues are sorted chronologically
        return cues.sort((a, b) => a.start - b.start);
    }

    /**
     * Converts time string (HH:MM:SS,mmm or MM:SS.mmm) to seconds float
     * @param {string} timeStr 
     * @returns {number} Float seconds
     */
    parseTime(timeStr) {
        timeStr = timeStr.trim().replace(',', '.');
        const parts = timeStr.split(':');
        
        let hours = 0;
        let minutes = 0;
        let seconds = 0;

        if (parts.length === 3) {
            hours = parseFloat(parts[0]) || 0;
            minutes = parseFloat(parts[1]) || 0;
            seconds = parseFloat(parts[2]) || 0;
        } else if (parts.length === 2) {
            minutes = parseFloat(parts[0]) || 0;
            seconds = parseFloat(parts[1]) || 0;
        }

        return (hours * 3600) + (minutes * 60) + seconds;
    }

    /**
     * Core update routine triggered on playback time change.
     * Looks up active cue based on current time + delayOffset.
     */
    updateCaptions() {
        if (!this.overlay) return;

        // Apply delay synchronization offset
        // Positive offset moves subtitles later (so they show at videoTime - offset)
        // Negative offset moves subtitles earlier (so they show at videoTime + offset)
        const adjustedTime = this.video.currentTime - this.delayOffset;

        // Optimize search: check if last active cue is still valid
        if (this.lastActiveCue && adjustedTime >= this.lastActiveCue.start && adjustedTime <= this.lastActiveCue.end) {
            return; // Subtitle doesn't need updating
        }

        // Perform linear scan (or binary search if playlist size is large, but linear is fast enough for standard files)
        let activeCue = null;
        for (let i = 0; i < this.cues.length; i++) {
            const cue = this.cues[i];
            if (adjustedTime >= cue.start && adjustedTime <= cue.end) {
                activeCue = cue;
                break;
            }
        }

        if (activeCue) {
            this.overlay.innerHTML = activeCue.text;
            this.overlay.classList.remove('subtitle-overlay-hidden');
            this.lastActiveCue = activeCue;
        } else {
            this.clearOverlay();
        }
    }

    /**
     * Clear and hide the subtitles rendering box
     */
    clearOverlay() {
        if (!this.overlay) return;
        this.overlay.classList.add('subtitle-overlay-hidden');
        this.lastActiveCue = null;
    }

    /**
     * Toggles overlay font styling size class
     * @param {string} size - 'small' | 'medium' | 'large' | 'xlarge'
     */
    setFontSize(size) {
        if (!this.overlay) return;
        
        const sizes = ['size-small', 'size-medium', 'size-large', 'size-xlarge'];
        sizes.forEach(s => this.overlay.classList.remove(s));
        this.overlay.classList.add('size-' + size);
    }

    /**
     * Toggles overlay font styling color class
     * @param {string} color - 'white' | 'yellow' | 'cyan' | 'green'
     */
    setFontColor(color) {
        if (!this.overlay) return;
        
        const colors = ['color-white', 'color-yellow', 'color-cyan', 'color-green'];
        colors.forEach(c => this.overlay.classList.remove(c));
        this.overlay.classList.add('color-' + color);
    }
}

// Instantiate subtitles singleton
window.subtitles = new SubtitlesManager('main-video', 'subtitle-overlay');
