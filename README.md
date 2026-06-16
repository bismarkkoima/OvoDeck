# OvoDeck - Advanced Web Media Player

A state-of-the-art, high-fidelity media player running entirely in your web browser. Styled after the classic VLC player with a modern dark-glassmorphic aesthetic and loaded with advanced capabilities.

![VLC Cone](https://upload.wikimedia.org/wikipedia/commons/e/e6/VLC_Icon.svg)

## Features

- **📼 Advanced Media Engine**: Handles video and audio formats natively in the browser.
- **🎛️ 10-Band Graphic Equalizer**: Smoothly adjust frequencies (31Hz to 16kHz) with built-in presets (Classical, Pop, Rock, Full Bass, Dance, etc.) powered by the Web Audio API.
- **🔊 Volume Boost**: Boost playback volume up to **200%** using a custom Audio Gain Node.
- **📊 Real-Time Audio Visualizer**: 4 Canvas-based rendering modes (Frequency Bars, Oscilloscope Wave, Radial Circle, Particles) that dance in sync with the audio track.
- **🎬 Widescreen & Aspect Ratios**: Cycle through Widescreen (16:9), Standard (4:3), Cinematic (21:9), Fit, Stretch, or Zoom Cropping.
- **🎨 Live Color Adjustments**: Sliders for Brightness, Contrast, Saturation, Hue Shift, Blur, and Inversion applied instantly.
- **💬 Subtitle Sync Parser**: Loads external `.srt` or `.vtt` files, parsed dynamically, with adjustable caption size/color and a real-time delay synchronization offset slider.
- **📁 Playlist Manager**: Drag-and-drop media files directly, queue multiple tracks, toggle Shuffle, and cycle Loop modes.

## Keyboard Shortcuts (VLC Mappings)

- `Space` : Play / Pause
- `S` : Stop playback
- `F` : Toggle Fullscreen
- `M` : Mute / Unmute audio
- `Arrow Up` / `Arrow Down` : Adjust volume (Increases up to 200%!)
- `Arrow Right` / `Arrow Left` : Skip forward / backward 10 seconds
- `Ctrl + Arrow Right` / `Ctrl + Arrow Left` : Skip forward / backward 1 minute
- `+` / `-` : Speed up / Slow down playback speed (0.25x to 4.0x)
- `Double Click` : Toggle Fullscreen

## Running the Player

Because browsers block local file loading (like subtitle importing and Web Audio node hooks) under the standard `file://` protocol for security, **you should run this project using a local HTTP web server**.

Here are three simple ways to run it:

### Option 1: Using Node.js (npx)
If you have Node.js installed, open a command line inside the project folder and run:
```bash
npx serve .
```

### Option 2: Using Python
If you have Python installed, open a terminal inside the project folder and run:
* **Python 3**:
  ```bash
  python -m http.server 8000
  ```
* **Python 2**:
  ```bash
  python -m SimpleHTTPServer 8000
  ```
Then open [http://localhost:8000](http://localhost:8000) in your browser.

### Option 3: VS Code Extension
If you are using Visual Studio Code, you can install the **Live Server** extension and click "Go Live" at the bottom right.
