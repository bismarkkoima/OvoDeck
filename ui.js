/**
 * UI Controller.
 * Binds DOM elements, listeners, and handles event dispatching.
 * Implements mouse inactivity fading, custom progress bar tracking,
 * keyboard hotkeys, and dynamic audio equalizer generator.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Cache DOM Elements
    const video = document.getElementById('main-video');
    const playerContainer = document.getElementById('player-container');
    const controlBar = document.getElementById('control-bar');
    const sidebar = document.getElementById('sidebar-container');
    
    // Core Buttons
    const btnPlay = document.getElementById('btn-play');
    const playIcon = document.getElementById('play-icon');
    const pauseIcon = document.getElementById('pause-icon');
    const btnStop = document.getElementById('btn-stop');
    const btnPrev = document.getElementById('btn-prev');
    const btnNext = document.getElementById('btn-next');
    const btnSkipBack = document.getElementById('btn-skip-back');
    const btnSkipFwd = document.getElementById('btn-skip-fwd');
    const btnMute = document.getElementById('btn-mute');
    const btnFullscreen = document.getElementById('btn-fullscreen');
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const btnToggleSubtitles = document.getElementById('btn-toggle-subtitles');
    const btnToggleVisualizer = document.getElementById('btn-toggle-visualizer');
    
    // Timers & Sliders
    const progressSlider = document.getElementById('progress-slider');
    const progressFillBar = document.getElementById('progress-fill-bar');
    const bufferedBar = document.getElementById('buffered-bar');
    const progressHoverTime = document.getElementById('progress-hover-time');
    const timeCurrent = document.getElementById('time-current');
    const timeDuration = document.getElementById('time-duration');
    const volumeSlider = document.getElementById('volume-slider');
    const volumeValue = document.getElementById('volume-value');
    
    // Dropdowns & Speed
    const btnSpeedMenu = document.getElementById('btn-speed-menu');
    const speedMenu = document.getElementById('speed-menu');
    const aspectRatioSelect = document.getElementById('aspect-ratio-select');
    
    // Modals
    const modalShortcuts = document.getElementById('modal-shortcuts');
    const btnCloseShortcuts = document.getElementById('btn-close-shortcuts');
    const btnOkShortcuts = document.getElementById('btn-ok-shortcuts');
    
    const modalNetwork = document.getElementById('modal-network');
    const btnCloseNetwork = document.getElementById('btn-close-network');
    const btnCancelNetwork = document.getElementById('btn-cancel-network');
    const btnSubmitNetwork = document.getElementById('btn-submit-network');
    const networkUrlInput = document.getElementById('network-url-input');
    
    // Files
    const fileLoader = document.getElementById('file-loader');
    const subFileLoader = document.getElementById('sub-file-loader');
    const loadedSubName = document.getElementById('loaded-sub-name');
    
    // Sidebar Tabs
    const playlistItemsList = document.getElementById('playlist-items-list');
    const playlistEmpty = document.getElementById('playlist-empty');
    const btnPlaylistClear = document.getElementById('playlist-clear');
    const btnPlaylistShuffle = document.getElementById('playlist-toggle-shuffle');
    const btnPlaylistRepeat = document.getElementById('playlist-toggle-repeat');
    
    const eqToggle = document.getElementById('eq-toggle');
    const eqPresetSelect = document.getElementById('eq-preset-select');
    const eqPreamp = document.getElementById('eq-preamp');
    const eqPreampVal = document.getElementById('eq-preamp-val');
    const eqSlidersContainer = document.getElementById('eq-sliders-container');
    
    // Video Filters & Sync Subtitles
    const fxReset = document.getElementById('fx-reset');
    const subDelay = document.getElementById('sub-delay');
    const subDelayVal = document.getElementById('sub-delay-val');
    const subSizeSelect = document.getElementById('sub-size-select');
    const subColorSelect = document.getElementById('sub-color-select');
    
    // Drag/Drop Overlay
    const dragDropOverlay = document.getElementById('drag-drop-overlay');
    const loaderOverlay = document.getElementById('loader-overlay');
    const actionFlash = document.getElementById('action-flash');
    const actionFlashIcon = document.getElementById('action-flash-icon');
    
    // Inactivity State Variables
    let idleTimer = null;
    let isMouseOverControls = false;
    let flashTimer = null;

    // Standard CSS filters config
    const fxSliders = {
        brightness: { el: document.getElementById('fx-brightness'), valEl: document.getElementById('fx-brightness-val'), default: 100, suffix: '%' },
        contrast: { el: document.getElementById('fx-contrast'), valEl: document.getElementById('fx-contrast-val'), default: 100, suffix: '%' },
        saturation: { el: document.getElementById('fx-saturation'), valEl: document.getElementById('fx-saturation-val'), default: 100, suffix: '%' },
        hue: { el: document.getElementById('fx-hue'), valEl: document.getElementById('fx-hue-val'), default: 0, suffix: '°' },
        blur: { el: document.getElementById('fx-blur'), valEl: document.getElementById('fx-blur-val'), default: 0, suffix: 'px' },
        invert: { el: document.getElementById('fx-invert'), valEl: document.getElementById('fx-invert-val'), default: 0, suffix: '%' }
    };

    /* ==========================================================================
       1. INITIALIZATION & DYNAMIC UI GENERATION
       ========================================================================== */
    
    // Generate Equalizer Sliders Dynamically
    function buildEqualizerSliders() {
        if (!eqSlidersContainer) return;
        eqSlidersContainer.innerHTML = '';
        
        const bands = ['31', '62', '125', '250', '500', '1k', '2k', '4k', '8k', '16k'];
        
        bands.forEach((freq, idx) => {
            const col = document.createElement('div');
            col.className = 'eq-band-col';
            
            const sliderVal = document.createElement('span');
            sliderVal.className = 'eq-band-val';
            sliderVal.id = `eq-band-val-${idx}`;
            sliderVal.textContent = '0';
            
            const wrapper = document.createElement('div');
            wrapper.className = 'eq-band-slider-wrapper';
            
            const input = document.createElement('input');
            input.type = 'range';
            input.className = 'vertical-slider';
            input.id = `eq-slider-${idx}`;
            input.min = '-12';
            input.max = '12';
            input.step = '0.5';
            input.value = '0';
            input.disabled = true; // Disabled until EQ turned on
            
            // Handle slider input change
            input.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                const prefix = val > 0 ? '+' : '';
                sliderVal.textContent = prefix + val;
                
                if (window.audioEngine) {
                    window.audioEngine.setBandGain(idx, val);
                }
            });
            
            wrapper.appendChild(input);
            col.appendChild(sliderVal);
            col.appendChild(wrapper);
            
            const label = document.createElement('span');
            label.className = 'eq-band-label';
            label.textContent = freq;
            col.appendChild(label);
            
            eqSlidersContainer.appendChild(col);
        });
    }

    buildEqualizerSliders();
    syncUIVolume(100); // Set default volume state in UI

    /* ==========================================================================
       2. REPEAT & SHUFFLE & TABS & FULLSCREEN HANDLERS
       ========================================================================== */
       
    // Tab switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetTab = btn.getAttribute('data-tab');
            
            tabButtons.forEach(b => b.classList.remove('active'));
            tabPanels.forEach(p => p.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById('panel-' + targetTab).classList.add('active');
        });
    });

    // Handle header menu sidebar trigger
    document.querySelectorAll('.sidebar-tab-trigger').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const tabId = link.getAttribute('data-tab');
            
            // Expand sidebar if collapsed
            sidebar.classList.remove('collapsed');
            
            // Trigger tab button click
            const tabBtn = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
            if (tabBtn) tabBtn.click();
        });
    });

    // Toggle Sidebar Panel
    btnToggleSidebar.addEventListener('click', () => {
        sidebar.classList.toggle('collapsed');
    });

    // Playback Speed dropdown menu toggle
    btnSpeedMenu.addEventListener('click', (e) => {
        e.stopPropagation();
        speedMenu.style.display = speedMenu.style.display === 'block' ? 'none' : 'block';
    });
    
    document.addEventListener('click', () => {
        speedMenu.style.display = 'none';
    });

    document.querySelectorAll('.speed-opt').forEach(opt => {
        opt.addEventListener('click', () => {
            const speed = parseFloat(opt.getAttribute('data-speed'));
            
            document.querySelectorAll('.speed-opt').forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            
            if (window.player) {
                window.player.setSpeed(speed);
            }
        });
    });

    // Aspect Ratio dropdown change handler
    aspectRatioSelect.addEventListener('change', (e) => {
        if (window.player) {
            window.player.setAspectRatio(e.target.value);
        }
    });

    // Toggle Fullscreen Wrapper
    btnFullscreen.addEventListener('click', () => {
        toggleFullscreen();
    });

    // Fullscreen double click triggers
    playerContainer.addEventListener('dblclick', (e) => {
        // Prevent trigger if double clicking controls or sidebar
        if (e.target.closest('#control-bar') || e.target.closest('#sidebar-container')) return;
        toggleFullscreen();
    });

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            playerContainer.requestFullscreen().catch(err => {
                console.error(`Error attempting to enable fullscreen: ${err.message}`);
            });
        } else {
            document.exitFullscreen();
        }
    }

    // Update Fullscreen button state based on document event
    document.addEventListener('fullscreenchange', () => {
        const isFS = !!document.fullscreenElement;
        btnFullscreen.innerHTML = isFS 
            ? `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>`
            : `<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>`;
        
        if (isFS) {
            playerContainer.classList.add('in-fullscreen');
        } else {
            playerContainer.classList.remove('in-fullscreen');
        }
    });

    /* ==========================================================================
       3. PLAYBACK PROGRESS TIMELINE BAR CONTROLLERS
       ========================================================================== */
    
    // Time formatter helper (seconds to HH:MM:SS or MM:SS)
    function formatTime(secs) {
        if (isNaN(secs) || secs === Infinity) return '00:00';
        
        const h = Math.floor(secs / 3600);
        const m = Math.floor((secs % 3600) / 60);
        const s = Math.floor(secs % 60);
        
        const pad = (num) => String(num).padStart(2, '0');
        
        if (h > 0) {
            return `${h}:${pad(m)}:${pad(s)}`;
        }
        return `${pad(m)}:${pad(s)}`;
    }

    // Monitor timeline updates
    video.addEventListener('timeupdate', () => {
        if (window.player && window.player.isStopped) return;
        
        const cur = video.currentTime;
        const dur = video.duration || 0;
        
        timeCurrent.textContent = formatTime(cur);
        timeDuration.textContent = formatTime(dur);
        
        if (dur > 0) {
            const percentage = (cur / dur) * 100;
            progressSlider.value = percentage;
            progressFillBar.style.width = percentage + '%';
        }
    });

    // Monitor file loading buffering timeline
    video.addEventListener('progress', () => {
        const dur = video.duration;
        if (dur > 0 && video.buffered.length > 0) {
            const bufferedEnd = video.buffered.end(video.buffered.length - 1);
            const percent = (bufferedEnd / dur) * 100;
            bufferedBar.style.width = percent + '%';
        }
    });

    // Seeking on timeline change
    progressSlider.addEventListener('input', (e) => {
        const percentage = parseFloat(e.target.value);
        progressFillBar.style.width = percentage + '%';
        
        if (video.duration) {
            video.currentTime = (percentage / 100) * video.duration;
        }
    });

    // Timeline hover time-preview tooltip
    progressSlider.addEventListener('mousemove', (e) => {
        if (!video.duration) return;
        
        const rect = progressSlider.getBoundingClientRect();
        const percent = (e.clientX - rect.left) / rect.width;
        const hoverSecs = percent * video.duration;
        
        progressHoverTime.style.left = (percent * 100) + '%';
        progressHoverTime.textContent = formatTime(hoverSecs);
        progressHoverTime.style.display = 'block';
    });

    progressSlider.addEventListener('mouseleave', () => {
        progressHoverTime.style.display = 'none';
    });

    /* ==========================================================================
       4. VOLUME CONTROLS
       ========================================================================== */

    volumeSlider.addEventListener('input', (e) => {
        const val = parseInt(e.target.value);
        if (window.player) {
            window.player.setVolume(val);
        }
    });

    function syncUIVolume(val) {
        volumeSlider.value = val;
        volumeValue.textContent = val + '%';
        
        // Highlight boost over 100%
        if (val > 100) {
            volumeValue.style.color = '#FF4500';
            volumeSlider.style.background = `linear-gradient(to right, var(--vlc-orange) 50%, #FF4500 50%, #FF4500 ${val/2}%, rgba(255,255,255,0.1) ${val/2}%)`;
        } else {
            volumeValue.style.color = 'var(--text-muted)';
            volumeSlider.style.background = `linear-gradient(to right, var(--vlc-orange) 0%, var(--vlc-orange) ${val}%, rgba(255,255,255,0.1) ${val}%)`;
        }
        
        // Sync mute button icons
        if (val === 0 || video.muted) {
            document.getElementById('vol-icon-high').style.display = 'none';
            document.getElementById('vol-icon-muted').style.display = 'block';
        } else {
            document.getElementById('vol-icon-high').style.display = 'block';
            document.getElementById('vol-icon-muted').style.display = 'none';
        }
    }

    btnMute.addEventListener('click', () => {
        if (window.player) {
            window.player.toggleMute();
        }
    });

    /* ==========================================================================
       5. CORE PLAYER COMMAND TRIGGERS
       ========================================================================== */
    
    btnPlay.addEventListener('click', () => {
        togglePlayPause();
    });

    function togglePlayPause() {
        if (!window.player) return;
        
        if (video.paused || window.player.isStopped) {
            window.player.play();
        } else {
            window.player.pause();
        }
    }

    btnStop.addEventListener('click', () => {
        if (window.player) window.player.stop();
    });
    
    btnPrev.addEventListener('click', () => {
        if (window.player) window.player.prev();
    });
    
    btnNext.addEventListener('click', () => {
        if (window.player) window.player.next();
    });
    
    btnSkipBack.addEventListener('click', () => {
        if (window.player) window.player.skip(-10);
        flashAction(`<svg viewBox="0 0 24 24"><path d="M12.5 8c-2.65 0-5.05.99-6.9 2.6L2 7v9h9l-3.62-3.62c1.39-1.16 3.16-1.88 5.12-1.88 3.54 0 6.55 2.31 7.6 5.5l2.37-.78C21.08 11.03 17.15 8 12.5 8z"/></svg>`);
    });
    
    btnSkipFwd.addEventListener('click', () => {
        if (window.player) window.player.skip(10);
        flashAction(`<svg viewBox="0 0 24 24"><path d="M11.5 8c2.65 0 5.05.99 6.9 2.6L22 7v9h-9l3.62-3.62c-1.39-1.16-3.16-1.88-5.12-1.88-3.54 0-6.55 2.31-7.6 5.5l-2.37-.78C2.92 11.03 6.85 8 11.5 8z"/></svg>`);
    });

    btnToggleSubtitles.addEventListener('click', () => {
        if (window.subtitles) {
            const state = !window.subtitles.isEnabled;
            window.subtitles.setEnabled(state);
            btnToggleSubtitles.style.color = state ? 'var(--vlc-orange)' : 'var(--text-muted)';
            flashAction(state ? 'Captions ON' : 'Captions OFF');
        }
    });

    btnToggleVisualizer.addEventListener('click', () => {
        if (window.player) {
            const nextModeMap = { 'bars': 'wave', 'wave': 'circle', 'circle': 'particles', 'particles': 'bars' };
            
            if (!window.player.isVisualizerMode) {
                window.player.toggleVisualizerMode(true);
                btnToggleVisualizer.style.color = 'var(--vlc-orange)';
                flashAction('Visualizer: Bars');
            } else {
                const curMode = window.visualizer.mode;
                const nextMode = nextModeMap[curMode];
                
                if (curMode === 'particles') {
                    // Cycle off visualizer completely
                    window.player.toggleVisualizerMode(false);
                    btnToggleVisualizer.style.color = 'var(--text-muted)';
                    flashAction('Visualizer OFF');
                } else {
                    window.visualizer.setMode(nextMode);
                    flashAction('Visualizer: ' + nextMode.charAt(0).toUpperCase() + nextMode.slice(1));
                }
            }
        }
    });

    /* ==========================================================================
       6. PLAYLIST ITEMS RENDERER
       ========================================================================== */
    
    // Watch custom player events
    window.addEventListener('playlist-updated', (e) => {
        const list = e.detail.playlist;
        renderPlaylistUI(list);
    });

    window.addEventListener('track-changed', (e) => {
        const track = e.detail;
        
        // Highlight active track
        document.querySelectorAll('.playlist-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-id') === track.id) {
                item.classList.add('active');
            }
        });

        // Set status text
        document.getElementById('header-status-text').textContent = `Playing: ${track.name}`;
    });

    window.addEventListener('play-state-changed', (e) => {
        const p = e.detail;
        
        if (p.playing) {
            playIcon.style.display = 'none';
            pauseIcon.style.display = 'block';
            flashAction(`<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`);
        } else {
            playIcon.style.display = 'block';
            pauseIcon.style.display = 'none';
            
            if (p.stopped) {
                flashAction(`<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>`);
                document.getElementById('header-status-text').textContent = 'Stopped';
                timeCurrent.textContent = '00:00';
                progressSlider.value = 0;
                progressFillBar.style.width = '0%';
            } else {
                flashAction(`<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>`);
            }
        }
    });

    window.addEventListener('volume-changed', (e) => {
        syncUIVolume(e.detail.value);
    });

    window.addEventListener('mute-changed', (e) => {
        const muted = e.detail;
        syncUIVolume(muted ? 0 : Math.round(window.player.volume * 100));
        flashAction(muted ? `<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.21.05-.42.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>` : `<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>`);
    });

    window.addEventListener('shuffle-state-changed', (e) => {
        const active = e.detail;
        btnPlaylistShuffle.classList.toggle('active', active);
    });

    window.addEventListener('repeat-mode-changed', (e) => {
        const mode = e.detail;
        btnPlaylistRepeat.classList.toggle('active', mode !== 'off');
        
        let label = 'Repeat: Off';
        if (mode === 'all') label = 'Repeat: All';
        if (mode === 'one') label = 'Repeat: One';
        btnPlaylistRepeat.querySelector('#repeat-mode-label').textContent = label;
    });

    // Render playlist items
    function renderPlaylistUI(list) {
        playlistItemsList.innerHTML = '';
        
        if (list.length === 0) {
            playlistEmpty.style.display = 'flex';
            return;
        }
        
        playlistEmpty.style.display = 'none';
        
        list.forEach((track, idx) => {
            const li = document.createElement('li');
            li.className = 'playlist-item';
            li.setAttribute('data-id', track.id);
            
            if (idx === window.player.currentIndex) {
                li.classList.add('active');
            }
            
            li.addEventListener('click', (e) => {
                if (e.target.closest('.track-delete-btn')) return; // ignore delete clicks
                window.player.loadTrack(idx);
            });
            
            const details = document.createElement('div');
            details.className = 'track-details';
            
            const title = document.createElement('span');
            title.className = 'track-title';
            title.textContent = `${idx + 1}. ${track.name}`;
            
            const duration = document.createElement('span');
            duration.className = 'track-duration';
            duration.textContent = track.type.toUpperCase();
            
            details.appendChild(title);
            details.appendChild(duration);
            
            const delBtn = document.createElement('button');
            delBtn.className = 'track-delete-btn';
            delBtn.innerHTML = '&times;';
            delBtn.title = 'Remove Track';
            delBtn.addEventListener('click', () => {
                window.player.removeFromPlaylist(track.id);
            });
            
            li.appendChild(details);
            li.appendChild(delBtn);
            playlistItemsList.appendChild(li);
        });
    }

    // Connect Playlist Buttons
    btnPlaylistClear.addEventListener('click', () => {
        if (window.player) window.player.clearPlaylist();
    });

    btnPlaylistShuffle.addEventListener('click', () => {
        if (window.player) window.player.toggleShuffle();
    });

    btnPlaylistRepeat.addEventListener('click', () => {
        if (window.player) window.player.toggleRepeat();
    });

    /* ==========================================================================
       7. FILE MANAGEMENT (DRAG/DROP & INPUT LOADERS)
       ========================================================================== */
    
    // Connect File Picker Input
    fileLoader.addEventListener('change', (e) => {
        const files = Array.from(e.target.files);
        importFilesList(files);
    });

    function importFilesList(files) {
        if (files.length === 0) return;

        loaderOverlay.classList.add('loading');
        
        // Filter out subtitle files to load separately
        const mediaFiles = files.filter(f => !f.name.endsWith('.vtt') && !f.name.endsWith('.srt'));
        const subFiles = files.filter(f => f.name.endsWith('.vtt') || f.name.endsWith('.srt'));

        // Load media files into playlist
        mediaFiles.forEach(f => {
            if (window.player) window.player.addToPlaylist(f);
        });

        // If a subtitle file is dropped, bind to active player
        if (subFiles.length > 0 && window.subtitles) {
            window.subtitles.loadFile(subFiles[0]).then(success => {
                if (success) {
                    loadedSubName.textContent = subFiles[0].name;
                    btnToggleSubtitles.style.color = 'var(--vlc-orange)';
                    window.subtitles.setEnabled(true);
                }
            });
        }

        setTimeout(() => {
            loaderOverlay.classList.remove('loading');
        }, 800);
    }

    // Drag-and-drop event listeners
    playerContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        dragDropOverlay.classList.add('drag-hovering');
    });

    dragDropOverlay.addEventListener('dragleave', () => {
        dragDropOverlay.classList.remove('drag-hovering');
    });

    dragDropOverlay.addEventListener('drop', (e) => {
        e.preventDefault();
        dragDropOverlay.classList.remove('drag-hovering');
        
        const files = Array.from(e.dataTransfer.files);
        importFilesList(files);
    });

    /* ==========================================================================
       8. AUDIO EQUALIZER (EQ) & VIDEO FILTERS BINDINGS
       ========================================================================== */
    
    // Toggle EQ State
    eqToggle.addEventListener('change', (e) => {
        const active = e.target.checked;
        
        eqPresetSelect.disabled = !active;
        eqPreamp.disabled = !active;
        
        document.querySelectorAll('.vertical-slider').forEach(slider => {
            slider.disabled = !active;
        });

        if (window.audioEngine) {
            window.audioEngine.setEqActive(active);
        }
    });

    // Preset Selection change
    eqPresetSelect.addEventListener('change', (e) => {
        const preset = e.target.value;
        if (window.audioEngine) {
            const gains = window.audioEngine.applyPreset(preset);
            if (gains) {
                // Sync sliders value in UI
                gains.forEach((gain, idx) => {
                    const slider = document.getElementById(`eq-slider-${idx}`);
                    const label = document.getElementById(`eq-band-val-${idx}`);
                    if (slider && label) {
                        slider.value = gain;
                        label.textContent = (gain > 0 ? '+' : '') + gain;
                    }
                });
            }
        }
    });

    // Preamp slider change
    eqPreamp.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        eqPreampVal.textContent = (val > 0 ? '+' : '') + val + ' dB';
        
        if (window.audioEngine) {
            window.audioEngine.setPreampGain(val);
        }
    });

    // Video CSS Filter Adjustments
    function applyVideoFilters() {
        const b = fxSliders.brightness.el.value;
        const c = fxSliders.contrast.el.value;
        const s = fxSliders.saturation.el.value;
        const h = fxSliders.hue.el.value;
        const bl = fxSliders.blur.el.value;
        const inv = fxSliders.invert.el.value;
        
        // CSS filters: brightness(100%) contrast(100%) saturate(100%) hue-rotate(0deg) blur(0px) invert(0%)
        video.style.filter = `brightness(${b}%) contrast(${c}%) saturate(${s}%) hue-rotate(${h}deg) blur(${bl}px) invert(${inv}%)`;
    }

    // Bind filters UI range inputs
    Object.keys(fxSliders).forEach(key => {
        const sliderObj = fxSliders[key];
        sliderObj.el.addEventListener('input', (e) => {
            const val = e.target.value;
            sliderObj.valEl.textContent = val + sliderObj.suffix;
            applyVideoFilters();
        });
    });

    // Reset Video Adjustments
    fxReset.addEventListener('click', () => {
        Object.keys(fxSliders).forEach(key => {
            const sliderObj = fxSliders[key];
            sliderObj.el.value = sliderObj.default;
            sliderObj.valEl.textContent = sliderObj.default + sliderObj.suffix;
        });
        video.style.filter = 'none';
        flashAction('Reset Video Effects');
    });

    /* ==========================================================================
       9. SUBTITLE CAPTIONS STYLINGS & SYNC SYNC
       ========================================================================== */

    // Subtitle delay slider
    subDelay.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        const prefix = val > 0 ? '+' : '';
        subDelayVal.textContent = prefix + val.toFixed(1) + 's';
        
        if (window.subtitles) {
            window.subtitles.setDelayOffset(val);
        }
    });

    // Subtitle size
    subSizeSelect.addEventListener('change', (e) => {
        if (window.subtitles) {
            window.subtitles.setFontSize(e.target.value);
        }
    });

    // Subtitle color
    subColorSelect.addEventListener('change', (e) => {
        if (window.subtitles) {
            window.subtitles.setFontColor(e.target.value);
        }
    });

    // Subtitle File Loader Button
    subFileLoader.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && window.subtitles) {
            window.subtitles.loadFile(file).then(success => {
                if (success) {
                    loadedSubName.textContent = file.name;
                    btnToggleSubtitles.style.color = 'var(--vlc-orange)';
                    window.subtitles.setEnabled(true);
                    flashAction('Subtitles Loaded');
                } else {
                    loadedSubName.textContent = 'Invalid format';
                }
            });
        }
    });

    /* ==========================================================================
       10. MOUSE INACTIVITY IDLE DETECTION (FADING CONTROLS)
       ========================================================================== */
    
    playerContainer.addEventListener('mousemove', () => {
        showControlsTemporarily();
    });

    controlBar.addEventListener('mouseenter', () => {
        isMouseOverControls = true;
        showControlsTemporarily();
    });

    controlBar.addEventListener('mouseleave', () => {
        isMouseOverControls = false;
    });

    function showControlsTemporarily() {
        controlBar.classList.remove('idle');
        playerContainer.style.cursor = 'default';
        
        clearTimeout(idleTimer);
        
        // Hide only when playing and mouse is not hovering over the control bar interface
        if (!video.paused && !isMouseOverControls && window.player && !window.player.isStopped) {
            idleTimer = setTimeout(() => {
                controlBar.classList.add('idle');
                playerContainer.style.cursor = 'none';
            }, 3000);
        }
    }

    /* ==========================================================================
       11. KEYBOARD HOTKEYS EVENT ROUTER (SHORTCUTS)
       ========================================================================== */
    
    window.addEventListener('keydown', (e) => {
        // Ignore typing keyboard inputs in form elements or modals
        if (document.activeElement.tagName === 'INPUT' || document.activeElement.tagName === 'SELECT' || document.activeElement.tagName === 'TEXTAREA') {
            return;
        }

        const player = window.player;
        if (!player) return;

        let actionHappened = true;

        switch (e.code) {
            case 'Space':
                e.preventDefault();
                togglePlayPause();
                break;
            case 'KeyF':
                toggleFullscreen();
                break;
            case 'KeyM':
                player.toggleMute();
                break;
            case 'KeyS':
                player.stop();
                break;
            case 'ArrowRight':
                e.preventDefault();
                if (e.ctrlKey) {
                    player.skip(60); // Skip 1 minute
                    flashAction('Forward 1m');
                } else {
                    player.skip(10); // Skip 10s
                    flashAction('Forward 10s');
                }
                break;
            case 'ArrowLeft':
                e.preventDefault();
                if (e.ctrlKey) {
                    player.skip(-60); // Skip back 1m
                    flashAction('Rewind 1m');
                } else {
                    player.skip(-10); // Skip back 10s
                    flashAction('Rewind 10s');
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                const newVolUp = Math.min(200, Math.round(player.volume * 100) + 5);
                player.setVolume(newVolUp);
                break;
            case 'ArrowDown':
                e.preventDefault();
                const newVolDown = Math.max(0, Math.round(player.volume * 100) - 5);
                player.setVolume(newVolDown);
                break;
            case 'Equal':
            case 'NumpadAdd':
                // Increase speed
                const nextSpeedUp = Math.min(4.0, player.playbackSpeed + 0.1);
                player.setSpeed(nextSpeedUp);
                // Highlight active option in UI
                document.querySelectorAll('.speed-opt').forEach(opt => {
                    opt.classList.toggle('active', Math.abs(parseFloat(opt.getAttribute('data-speed')) - nextSpeedUp) < 0.05);
                });
                btnSpeedMenu.textContent = nextSpeedUp.toFixed(2) + 'x';
                flashAction(`Speed: ${nextSpeedUp.toFixed(2)}x`);
                break;
            case 'Minus':
            case 'NumpadSubtract':
                // Decrease speed
                const nextSpeedDown = Math.max(0.25, player.playbackSpeed - 0.1);
                player.setSpeed(nextSpeedDown);
                document.querySelectorAll('.speed-opt').forEach(opt => {
                    opt.classList.toggle('active', Math.abs(parseFloat(opt.getAttribute('data-speed')) - nextSpeedDown) < 0.05);
                });
                btnSpeedMenu.textContent = nextSpeedDown.toFixed(2) + 'x';
                flashAction(`Speed: ${nextSpeedDown.toFixed(2)}x`);
                break;
            default:
                actionHappened = false;
        }

        if (actionHappened) {
            // Keep controls visible when utilizing hotkeys
            showControlsTemporarily();
        }
    });

    /* ==========================================================================
       12. MODALS & NETWORK URL LOADERS BINDINGS
       ========================================================================== */

    // Action Flash Utility
    function flashAction(contentOrHTML) {
        clearTimeout(flashTimer);
        
        actionFlashIcon.innerHTML = contentOrHTML;
        actionFlash.classList.add('flash-active');
        
        flashTimer = setTimeout(() => {
            actionFlash.classList.remove('flash-active');
        }, 600);
    }

    // Modal Helpers
    function openModal(modal) {
        modal.classList.add('modal-active');
    }
    
    function closeModal(modal) {
        modal.classList.remove('modal-active');
    }

    // Shortcuts Modal triggers
    document.getElementById('menu-shortcuts').addEventListener('click', (e) => {
        e.preventDefault();
        openModal(modalShortcuts);
    });
    
    btnCloseShortcuts.addEventListener('click', () => closeModal(modalShortcuts));
    btnOkShortcuts.addEventListener('click', () => closeModal(modalShortcuts));
    modalShortcuts.addEventListener('click', (e) => {
        if (e.target === modalShortcuts) closeModal(modalShortcuts);
    });

    // Network Stream URL triggers
    document.getElementById('menu-open-url').addEventListener('click', (e) => {
        e.preventDefault();
        openModal(modalNetwork);
    });
    
    document.getElementById('playlist-add-url').addEventListener('click', () => {
        openModal(modalNetwork);
    });
    
    btnCloseNetwork.addEventListener('click', () => closeModal(modalNetwork));
    btnCancelNetwork.addEventListener('click', () => closeModal(modalNetwork));
    modalNetwork.addEventListener('click', (e) => {
        if (e.target === modalNetwork) closeModal(modalNetwork);
    });

    // Load Stream presets inside modal
    document.querySelectorAll('.preset-url-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            networkUrlInput.value = btn.getAttribute('data-url');
        });
    });

    // Submit URL Stream loader
    btnSubmitNetwork.addEventListener('click', () => {
        const url = networkUrlInput.value.trim();
        if (url) {
            if (window.player) {
                window.player.addToPlaylist(url);
                closeModal(modalNetwork);
                networkUrlInput.value = '';
                
                // Switch to Playlist tab to see track
                const playlistBtn = document.querySelector('.tab-btn[data-tab="playlist"]');
                if (playlistBtn) playlistBtn.click();
            }
        }
    });

    document.getElementById('menu-clear-playlist').addEventListener('click', (e) => {
        e.preventDefault();
        if (window.player) window.player.clearPlaylist();
    });

    document.getElementById('menu-play').addEventListener('click', (e) => {
        e.preventDefault();
        togglePlayPause();
    });

    document.getElementById('menu-stop').addEventListener('click', (e) => {
        e.preventDefault();
        if (window.player) window.player.stop();
    });

    document.getElementById('menu-prev').addEventListener('click', (e) => {
        e.preventDefault();
        if (window.player) window.player.prev();
    });

    document.getElementById('menu-next').addEventListener('click', (e) => {
        e.preventDefault();
        if (window.player) window.player.next();
    });

    document.getElementById('menu-speed-up').addEventListener('click', (e) => {
        e.preventDefault();
        if (window.player) {
            const nextSpeed = Math.min(4.0, window.player.playbackSpeed + 0.25);
            window.player.setSpeed(nextSpeed);
            btnSpeedMenu.textContent = nextSpeed.toFixed(2) + 'x';
            flashAction(`Speed: ${nextSpeed.toFixed(2)}x`);
        }
    });

    document.getElementById('menu-speed-down').addEventListener('click', (e) => {
        e.preventDefault();
        if (window.player) {
            const nextSpeed = Math.max(0.25, window.player.playbackSpeed - 0.25);
            window.player.setSpeed(nextSpeed);
            btnSpeedMenu.textContent = nextSpeed.toFixed(2) + 'x';
            flashAction(`Speed: ${nextSpeed.toFixed(2)}x`);
        }
    });

    document.getElementById('menu-volume-up').addEventListener('click', (e) => {
        e.preventDefault();
        if (window.player) {
            const newVol = Math.min(200, Math.round(window.player.volume * 100) + 10);
            window.player.setVolume(newVol);
        }
    });

    document.getElementById('menu-volume-down').addEventListener('click', (e) => {
        e.preventDefault();
        if (window.player) {
            const newVol = Math.max(0, Math.round(window.player.volume * 100) - 10);
            window.player.setVolume(newVol);
        }
    });

    document.getElementById('menu-mute').addEventListener('click', (e) => {
        e.preventDefault();
        if (window.player) window.player.toggleMute();
    });

    document.getElementById('menu-fullscreen').addEventListener('click', (e) => {
        e.preventDefault();
        toggleFullscreen();
    });
});
