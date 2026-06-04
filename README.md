# ⚡ WiFi File Sharing (P2P WebRTC)

A gorgeous, highly secure, full-speed peer-to-peer (P2P) file sharing web application designed with a **Windows 11 Fluent UI / Mica translucent aesthetic**. 

This application leverages **WebRTC DataChannels** via PeerJS to establish direct, encrypted, user-to-user connections. Assets are transferred straight between browsers without ever touching a middleman storage server or cloud database, guaranteeing absolute privacy and maximum LAN speeds.

---

## ✨ Features

- **Blazing-Fast P2P Transfers**: Bypass cloud limits-files flow directly from sender browser to receiver browser on your local network/Wi-Fi or WAN.
- **Dual Client Designs**:
  - **Dynamic React + Vite Client**: Our state-of-the-art interactive share client built with animated layout state motions.
  - **Super Standalone Vanilla JS Client**: Hosted fully client-side at `yourdomain.com/vanilla/`. 
- **Mica Translucent styling**: Immersive Windows 11 Fluent UI styling containing smooth aurora blur backdrops, responsive state transitions, and light/dark theme synchronization.
- **Robust Connection Handshaking**: Single-click copyable sharing URLs, real-time QR code generation, and easy-to-use 6-digit connection codes.
- **Fail-safe ID Broker**: Handles peer ID collisions silently and dynamically behind the scenes for seamless, continuous connectivity.

---

## 🚀 One-Click GitHub Deployment

We have configured a fully automated **GitHub Actions deployment workflow** inside `.github/workflows/deploy.yml`! 

To host your own copy of this application on **GitHub Pages** for free, follow these simple steps:

### Step 1: Create a GitHub Repository and Push your Code
1. Initialize a git repository locally, commit your code, and push it to your private or public GitHub profile.
2. If you export a ZIP from AI Studio, run:
   ```bash
   git init
   git add .
   git commit -m "Initialize secure WiFi file share app"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

### Step 2: Enable GitHub Pages in your Repository
1. Navigate to your repository page on GitHub.
2. Click **Settings** (gear icon) on the top horizontal bar.
3. In the left-hand navigation sidebar, click on **Pages**.
4. Under **Build and deployment** -> **Source**, select **GitHub Actions** from the dropdown menu (instead of "Deploy from a branch").

### Step 3: Watch it deploy automatically!
- Push changes to your `main` or `master` branch.
- The workflow **"Deploy to GitHub Pages"** will run automatically, compile the React + Vite static assets (including the standalone vanilla bundle), and host your app live.
- Your application will soon be available at `https://YOUR_USERNAME.github.io/YOUR_REPO_NAME/`!

---

## 🛠️ Local Development

To run the application locally on your machine, follow these simple steps:

```bash
# 1. Install required dependencies
npm install

# 2. Run the development server
npm run dev

# 3. Build and test production assets ready to release
npm run build

# 4. Run TypeScript syntax verification checks
npm run lint
```

### Static Asset Distribution
Because we built the application with Relative Sourcing (`base: './'`), the built repository folder output `/dist` is completely portable and compatible with **GitHub Pages paths**, **Vercel**, **Netlify**, or **Cloudflare Pages** right out of the box!
