# BigQuery Release Notes Hub & Tweet Drafter

A modern, high-fidelity web application built with Python Flask and plain vanilla HTML, CSS, and JavaScript. This tool fetches the Google Cloud BigQuery Release Notes RSS XML feed, parses it, and displays updates in a gorgeous, searchable dashboard. Users can easily select any specific update to customize and draft a tweet about it using a built-in X (Twitter) Composer.

![Dashboard UI Mockup](https://raw.githubusercontent.com/rohithnelluri/Rohith_nelluri-event-talks-app/main/bq_releases_app_mockup.jpg) *(Place your mockup image here)*

---

## 🌟 Core Features

- **Live XML RSS Integration**: Fetches release notes directly from the official Google Cloud feed.
- **Dynamic Content Splitting**: Google groups all daily updates into a single feed item. The client-side parser splits them by header tags, delivering individual, fine-grained cards for each specific change.
- **Smart Category Badging**: Automatic classification and color-coding of updates (*Feature*, *Fixed*, *Changed*, *Deprecated*, *General*).
- **Search & Filtering**: Search release notes in real-time by keyword, date, or category, with live count pills updated dynamically.
- **Circular Character Progress Ring**: Visualizes character limits (280 max) as you type, turning yellow at >250 and red when limits are exceeded.
- **Twitter URL Optimization**: Integrates a regex URL parser matching X's real-world rules—all HTTP/HTTPS links are counted as exactly **23 characters** (via `t.co`), regardless of their visible length.
- **Smooth Theming**: Persistent Light/Dark theme toggles stored in the browser's `LocalStorage`.
- **Skeleton Shimmer Loaders**: Shimmer placeholder cards animate while syncing notes to improve perceived performance.

---

## 🛠️ Technology Stack

- **Backend**: Python Flask, Requests, XML ElementTree
- **Frontend**: Vanilla HTML5, Vanilla CSS3 (Custom Variables, Flexbox, CSS Grid), Vanilla ES6+ JavaScript
- **Deployment & Versioning**: Git, GitHub

---

## 📁 Project Directory Structure

```text
bq-releases-notes/
├── .gitignore             # Git exclusions (venv, python cache, IDEs)
├── app.py                 # Flask server (fetches and parses feed)
├── requirements.txt       # Frozen Python dependencies
├── static/
│   ├── app.js             # Client-side state, DOM splitting, and Twitter logic
│   └── style.css          # Design system variables, dark/light themes, animations
└── templates/
    └── index.html         # HTML skeleton containing the 3-panel dashboard
```

---

## 🚀 Setup & Execution Guide

### Prerequisites
Make sure you have **Python 3.x** and **Git** installed on your system.

### 1. Clone the Repository
```bash
git clone https://github.com/rohithnelluri/Rohith_nelluri-event-talks-app.git
cd Rohith_nelluri-event-talks-app
```

### 2. Setup the Virtual Environment
Create and activate a local Python virtual environment to manage dependencies:

**On Windows (PowerShell):**
```powershell
python -m venv .venv
.venv\Scripts\Activate.ps1
```

**On macOS / Linux (Terminal):**
```bash
python3 -m venv .venv
source .venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Start the Flask Server
Run the application locally:
```bash
python app.py
```
The server will start listening at **[http://127.0.0.1:5000](http://127.0.0.1:5000)**. Open this address in your browser to access the dashboard.

---

## ✍️ How the Tweet Composer Works

1. **Select Update**: Click **Draft Tweet** on any card. The composer loads the title, date, link, and pre-formatted text into the editor.
2. **Auto-Truncation**: The app measures length boundaries and automatically truncates description snippets to fit under the 280-character maximum, including spacer characters and URL allocations.
3. **Character Calculation**:
   - Regular characters count as **1**.
   - Any string matching an HTTP/HTTPS URL regex is overridden and counted as **23** characters (Twitter's link wrapper weight).
4. **Share Intent**: Clicking **Share on X** redirects to the secure, official X Web Intent (`https://x.com/intent/tweet?text=...`) in a new browser tab with your draft pre-populated.
