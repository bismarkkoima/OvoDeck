/**
 * MediaPlayer Class.
 * Coordinates play, pause, stop, track navigation, playlist management,
 * repeat/shuffle state, and aspect ratio scaling.
 */
class MediaPlayer {
    constructor(videoElementId) {
        this.video = document.getElementById(videoElementId);
        
        // Playlist State
        this.playlist = [];
        this.currentIndex = -1;
        
        // Playback Options
        this.repeatMode = 'off'; // 'off' | 'all' | 'one'
        this.shuffleActive = false;
        this.shuffleOrder = [];
        
        // Video Settings
        this.aspectRatio = 'default';
        this.playbackSpeed = 1.0;
        this.volume = 1.0;
        this.isMuted = false;
        
        // Visual State Flags
        this.isStopped = true;
        this.isVisualizerMode = false;

        this.setupMediaListeners();
    }

    /**
     * Bind native HTML5 video element events to app callbacks
     */
    setupMediaListeners() {
        // Handle media end of file
        this.video.addEventListener('ended', () => {
            this.handleMediaEnded();
        });

        // Error handling
        this.video.addEventListener('error', (e) => {
            console.error('Media element playback error:', e);
            window.dispatchEvent(new CustomEvent('player-error', { 
                detail: 'Error loading media format.' 
            }));
        });
    }

    /**
     * Load and play track by index in playlist
     * @param {number} index 
     */
    loadTrack(index) {
        if (index < 0 || index >= this.playlist.length) return;

        this.currentIndex = index;
        const track = this.playlist[index];

        // Reset stops state
        this.isStopped = false;

        // Initialize Web Audio Engine upon first actual file load
        if (window.audioEngine) {
            window.audioEngine.init(this.video);
            window.audioEngine.resume();
        }

        // Set video element source
        this.video.src = track.url;
        this.video.load();

        // Detect if media is an audio-only track
        // We check if it is explicitly an audio type or has an audio extension
        const isAudio = track.type === 'audio';
        this.toggleVisualizerMode(isAudio);

        // Reset speed and volume state
        this.video.playbackRate = this.playbackSpeed;
        
        // Trigger play
        this.play();

        // Dispatch load event
        window.dispatchEvent(new CustomEvent('track-changed', { detail: track }));
    }

    /**
     * Play current track
     */
    play() {
        if (this.playlist.length === 0) return;
        if (this.currentIndex === -1) {
            this.loadTrack(0);
            return;
        }

        if (window.audioEngine) {
            window.audioEngine.resume();
        }

        this.video.play().then(() => {
            this.isStopped = false;
            window.dispatchEvent(new CustomEvent('play-state-changed', { detail: { playing: true } }));
        }).catch(err => {
            console.warn('Autoplay blocked or play interrupted:', err);
        });
    }

    /**
     * Pause current track
     */
    pause() {
        this.video.pause();
        window.dispatchEvent(new CustomEvent('play-state-changed', { detail: { playing: false } }));
    }

    /**
     * Stop current track completely
     */
    stop() {
        this.video.pause();
        this.video.currentTime = 0;
        this.isStopped = true;
        
        // Clear src so network requests stop
        // but store the source in case the user plays again
        const currentSrc = this.video.src;
        this.video.src = '';
        this.video.src = currentSrc;
        
        window.dispatchEvent(new CustomEvent('play-state-changed', { detail: { playing: false, stopped: true } }));
    }

    /**
     * Advance to the next track in the playlist
     */
    next() {
        if (this.playlist.length === 0) return;

        let nextIdx = this.currentIndex;

        if (this.shuffleActive) {
            const currentShufflePos = this.shuffleOrder.indexOf(this.currentIndex);
            if (currentShufflePos !== -1 && currentShufflePos < this.shuffleOrder.length - 1) {
                nextIdx = this.shuffleOrder[currentShufflePos + 1];
            } else {
                // End of shuffled list, loop to beginning if repeat-all is enabled
                nextIdx = this.repeatMode === 'all' ? this.shuffleOrder[0] : -1;
            }
        } else {
            if (this.currentIndex < this.playlist.length - 1) {
                nextIdx = this.currentIndex + 1;
            } else {
                nextIdx = this.repeatMode === 'all' ? 0 : -1;
            }
        }

        if (nextIdx !== -1) {
            this.loadTrack(nextIdx);
        } else {
            this.stop();
        }
    }

    /**
     * Return to the previous track in the playlist
     */
    prev() {
        if (this.playlist.length === 0) return;

        // If playing more than 3 seconds in, restart the track instead of skipping back
        if (this.video.currentTime > 3) {
            this.video.currentTime = 0;
            return;
        }

        let prevIdx = this.currentIndex;

        if (this.shuffleActive) {
            const currentShufflePos = this.shuffleOrder.indexOf(this.currentIndex);
            if (currentShufflePos !== -1 && currentShufflePos > 0) {
                prevIdx = this.shuffleOrder[currentShufflePos - 1];
            } else {
                prevIdx = this.repeatMode === 'all' ? this.shuffleOrder[this.shuffleOrder.length - 1] : -1;
            }
        } else {
            if (this.currentIndex > 0) {
                prevIdx = this.currentIndex - 1;
            } else {
                prevIdx = this.repeatMode === 'all' ? this.playlist.length - 1 : -1;
            }
        }

        if (prevIdx !== -1) {
            this.loadTrack(prevIdx);
        }
    }

    /**
     * Skip forward or backward by specific seconds amount
     * @param {number} seconds 
     */
    skip(seconds) {
        if (this.isStopped) return;
        this.video.currentTime = Math.max(0, Math.min(this.video.duration, this.video.currentTime + seconds));
    }

    /**
     * Adjust playback rate/speed
     * @param {number} speed - e.g. 0.5, 1.0, 1.5, 2.0
     */
    setSpeed(speed) {
        this.playbackSpeed = speed;
        this.video.playbackRate = speed;
        window.dispatchEvent(new CustomEvent('speed-changed', { detail: speed }));
    }

    /**
     * Adjust volume level
     * @param {number} value - Volume between 0 and 200 (boost)
     */
    setVolume(value) {
        this.volume = value / 100; // Linear multiplier: 0.0 to 2.0
        
        // Native media element volume maxes out at 1.0.
        // The Web Audio gainNode handles volume boost levels up to 2.0.
        this.video.volume = Math.min(1.0, this.volume);
        
        if (window.audioEngine) {
            window.audioEngine.setVolume(this.volume);
        }

        window.dispatchEvent(new CustomEvent('volume-changed', { 
            detail: { value, volume: this.volume } 
        }));
    }

    /**
     * Mute or unmute audio output
     */
    toggleMute() {
        this.isMuted = !this.isMuted;
        this.video.muted = this.isMuted;
        
        if (window.audioEngine) {
            window.audioEngine.setVolume(this.isMuted ? 0 : this.volume);
        }

        window.dispatchEvent(new CustomEvent('mute-changed', { detail: this.isMuted }));
    }

    /**
     * Change how video frames scale inside display box (VLC aspect ratio controls)
     * @param {string} ratio 
     */
    setAspectRatio(ratio) {
        this.aspectRatio = ratio;
        const v = this.video;

        // Reset baseline styling
        v.style.objectFit = 'contain';
        v.style.width = '100%';
        v.style.height = '100%';
        v.style.aspectRatio = 'auto';

        switch(ratio) {
            case '16:9':
                v.style.objectFit = 'fill';
                v.style.width = 'auto';
                v.style.height = 'auto';
                v.style.maxWidth = '100%';
                v.style.maxHeight = '100%';
                v.style.aspectRatio = '16/9';
                break;
            case '4:3':
                v.style.objectFit = 'fill';
                v.style.width = 'auto';
                v.style.height = 'auto';
                v.style.maxWidth = '100%';
                v.style.maxHeight = '100%';
                v.style.aspectRatio = '4/3';
                break;
            case '21:9':
                v.style.objectFit = 'fill';
                v.style.width = 'auto';
                v.style.height = 'auto';
                v.style.maxWidth = '100%';
                v.style.maxHeight = '100%';
                v.style.aspectRatio = '21/9';
                break;
            case 'fit':
                v.style.objectFit = 'contain';
                break;
            case 'fill':
                v.style.objectFit = 'fill';
                break;
            case 'zoom':
                v.style.objectFit = 'cover';
                break;
            case 'default':
            default:
                v.style.objectFit = 'contain';
                break;
        }

        window.dispatchEvent(new CustomEvent('aspect-ratio-changed', { detail: ratio }));
    }

    /**
     * Triggered automatically when track playback reaches the end
     */
    handleMediaEnded() {
        if (this.repeatMode === 'one') {
            this.video.currentTime = 0;
            this.play();
        } else {
            this.next();
        }
    }

    /**
     * Toggle display of the audio visualizer overlay
     * @param {boolean} enable 
     */
    toggleVisualizerMode(enable) {
        this.isVisualizerMode = enable;
        
        const canvas = document.getElementById('visualizer-canvas');
        if (canvas) {
            canvas.style.display = enable ? 'block' : 'none';
        }

        if (window.visualizer) {
            if (enable) {
                window.visualizer.start();
            } else {
                window.visualizer.stop();
            }
        }
    }

    /**
     * Add file item or streaming URL to media queue
     * @param {File|string} item - File object or String URL
     * @param {string} [customName] 
     */
    addToPlaylist(item, customName) {
        let name = '';
        let url = '';
        let type = 'video'; // Default assumption

        if (item instanceof File) {
            name = item.name;
            url = URL.createObjectURL(item);
            type = item.type.startsWith('audio/') ? 'audio' : 'video';
        } else {
            url = item;
            name = customName || item.substring(item.lastIndexOf('/') + 1) || 'Network Stream';
            
            // Deduce type from URL extension
            const lowerUrl = url.toLowerCase();
            const audioExts = ['.mp3', '.wav', '.ogg', '.aac', '.m4a', '.flac'];
            if (audioExts.some(ext => lowerUrl.endsWith(ext))) {
                type = 'audio';
            }
        }

        const track = {
            id: 'track_' + Math.random().toString(36).substr(2, 9),
            name: name,
            url: url,
            type: type,
            file: (item instanceof File) ? item : null
        };

        this.playlist.push(track);

        if (this.shuffleActive) {
            this.regenerateShuffleOrder();
        }

        // Trigger UI updates
        window.dispatchEvent(new CustomEvent('playlist-updated', { 
            detail: { playlist: this.playlist, added: track } 
        }));

        // If no track is playing, load this track immediately
        if (this.currentIndex === -1) {
            this.loadTrack(0);
        }

        return track;
    }

    /**
     * Remove track by ID from queue
     * @param {string} id 
     */
    removeFromPlaylist(id) {
        const index = this.playlist.findIndex(t => t.id === id);
        if (index === -1) return;

        const wasPlaying = (index === this.currentIndex);
        
        // Clean up Blob URLs to free memory
        if (this.playlist[index].file) {
            URL.revokeObjectURL(this.playlist[index].url);
        }

        this.playlist.splice(index, 1);

        if (this.playlist.length === 0) {
            this.currentIndex = -1;
            this.stop();
            this.video.src = '';
            this.toggleVisualizerMode(false);
        } else if (wasPlaying) {
            // If we deleted the active track, play the next one (or previous if it was the last)
            const nextIdx = (index >= this.playlist.length) ? this.playlist.length - 1 : index;
            this.loadTrack(nextIdx);
        } else if (index < this.currentIndex) {
            // Shift index if deleted track was before current
            this.currentIndex--;
        }

        if (this.shuffleActive) {
            this.regenerateShuffleOrder();
        }

        window.dispatchEvent(new CustomEvent('playlist-updated', { 
            detail: { playlist: this.playlist } 
        }));
    }

    /**
     * Empty the media playlist
     */
    clearPlaylist() {
        this.stop();
        this.video.src = '';
        this.toggleVisualizerMode(false);

        // Clean up memory blobs
        this.playlist.forEach(track => {
            if (track.file) URL.revokeObjectURL(track.url);
        });

        this.playlist = [];
        this.currentIndex = -1;
        this.shuffleOrder = [];

        window.dispatchEvent(new CustomEvent('playlist-updated', { 
            detail: { playlist: this.playlist } 
        }));
    }

    /**
     * Toggles play/pause repeat modes
     */
    toggleRepeat() {
        if (this.repeatMode === 'off') {
            this.repeatMode = 'all';
        } else if (this.repeatMode === 'all') {
            this.repeatMode = 'one';
        } else {
            this.repeatMode = 'off';
        }

        window.dispatchEvent(new CustomEvent('repeat-mode-changed', { detail: this.repeatMode }));
    }

    /**
     * Toggle random playlist shuffle playback
     */
    toggleShuffle() {
        this.shuffleActive = !this.shuffleActive;
        
        if (this.shuffleActive) {
            this.regenerateShuffleOrder();
        } else {
            this.shuffleOrder = [];
        }

        window.dispatchEvent(new CustomEvent('shuffle-state-changed', { detail: this.shuffleActive }));
    }

    /**
     * Generates a randomized list of playlist indexes
     */
    regenerateShuffleOrder() {
        const size = this.playlist.length;
        const indices = Array.from({ length: size }, (_, i) => i);
        
        // Fisher-Yates Shuffle Algorithm
        for (let i = size - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        
        this.shuffleOrder = indices;
        
        // Put the currently playing track first in shuffle sequence so it continues playing
        if (this.currentIndex !== -1) {
            const curIdx = this.shuffleOrder.indexOf(this.currentIndex);
            if (curIdx !== -1) {
                this.shuffleOrder.splice(curIdx, 1);
                this.shuffleOrder.unshift(this.currentIndex);
            }
        }
    }
}

// Instantiate the global media player
window.player = new MediaPlayer('main-video');
