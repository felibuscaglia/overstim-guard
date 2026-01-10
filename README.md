# Overstim Guard

**Circadian-aware content intensity control for the web.**

Overstim Guard is a privacy-first browser extension that automatically reduces digital overstimulation based on time of day. Instead of blocking ads, it focuses on **behavioral cues** that keep users overstimulated at night: autoplay, infinite scroll, motion-heavy thumbnails, and high-contrast visual noise.

The goal is simple: help users wind down, sleep better, and regain control over their attention — without tracking, accounts, or cloud services.

---

## ✨ Core Features (MVP)

- ⏰ **Circadian-aware scheduling**
  - Automatically activates calm mode during user-defined evening/night hours
- 🔇 **Autoplay & audio suppression**
  - Prevents surprise audio/video playback
- 🧠 **Feed intensity reduction**
  - Collapses infinite scroll feeds behind explicit user actions
- 🎨 **Thumbnail & motion softening**
  - Reduces visual dopamine cues (brightness, saturation, motion)
- 🌐 **Per-site overrides**
  - Customize behavior per domain
- 🔒 **Privacy-first**
  - No accounts, no analytics, no network calls
  - All logic runs locally on the user’s device

---

## 🧩 How It Works

Overstim Guard uses a **rule-based engine** that applies reversible DOM and CSS transformations via content scripts.  
Rules are activated based on a **time scheduler** and optional site-specific overrides.

High-level architecture:

```

Background (MV3 Service Worker)
│
├─ Time & Schedule Engine
├─ Settings / Storage Adapter
│
└─ Messaging
↓
Content Scripts
│
├─ Rule Engine
│   ├─ Autoplay Block Rule
│   ├─ Feed Collapse Rule
│   ├─ Motion Reduction Rule
│   └─ Visual Softening Rule
│
└─ DOM / CSS Injection (reversible)

```

---

## 🛠 Tech Stack

- **TypeScript** (strict mode)
- **WebExtensions API** (Chrome + Firefox compatible)
- **Manifest V3**
- **ESBuild** for bundling
- **No frameworks** (vanilla HTML/CSS/JS for performance and simplicity)

---

## 📁 Project Structure

```

src/
background/        # MV3 service worker
content/           # Content scripts injected into pages
rules/             # Rule engine + individual behavior rules
popup/             # Extension popup UI
options/           # Settings page
utils/             # Shared helpers
types/             # Shared TypeScript types
public/
manifest.json      # Extension manifest
dist/                # Build output (load this into browser)

```

---

## 🚀 Development

### Prerequisites

- Node.js 18+

### Install dependencies

```bash
npm install
```

### Run in development mode (watch)

```bash
npm run dev
```

### Build production bundle

```bash
npm run build
```

### Load into browser (Chrome)

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `dist/` folder

### 🔄 Seeing Your Changes

After making code changes:

1. **Keep `npm run dev` running** - it will automatically rebuild when you save files
2. **Reload the extension** in Chrome:
   - **Recommended:** Install [Extension Reloader](https://chrome.google.com/webstore/detail/extensions-reloader/fimgfedafeadlieiabdeeaodndnlbhid) Chrome Extension for automatic reloading on file changes
   - **Manual:** Go to `chrome://extensions`, click the **reload icon** (↻) on your extension card
3. **For popup changes**: Close and reopen the popup after reloading
4. **For content script changes**: Refresh the webpage you're testing on
5. **For background changes**: The service worker will restart automatically after reload

**💡 Tip:** Using Extension Reloader significantly improves the development experience by automatically reloading your extension when files in the `dist/` folder change.

---

## 🧪 Debugging

- **Background logs**
  `chrome://extensions → Overstim Guard → Service worker`

- **Content script logs**
  Open DevTools on any webpage → Console → switch context to **Content scripts**

---

## 🔐 Privacy & Security

Overstim Guard:

- Does **not** collect user data
- Does **not** send network requests
- Does **not** track browsing behavior
- Stores settings locally using browser storage APIs only

This design is intentional and foundational to the project.

---

## 📄 License

MIT License

---

## ✍️ Author

Felipe Buscaglia
Built as an exploration of applied HCI, privacy-first software design, and browser internals.
