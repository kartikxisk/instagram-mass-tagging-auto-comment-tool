// demo/playwright-demo.js
// Playwright demo script that launches the Electron application, records a short video, and takes a screenshot.
// Run with: npm run demo:video

const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');

(async () => {
  // Ensure the output directory for video exists
  const videoDir = path.resolve(__dirname, 'video');
  if (!fs.existsSync(videoDir)) fs.mkdirSync(videoDir, { recursive: true });

  // Launch the Electron app
  const electronApp = await electron.launch({
    args: [path.resolve('..')], // point to the project root where electron main.js lives
    env: { NODE_ENV: 'production' },
    // Record a video of the first window (Playwright 1.45+ supports this via `recordVideo` on the context)
    // We create a new browser context attached to the Electron window to capture video.
    // Note: Video capture requires the `headless: false` mode for the window UI.
    headless: false,
    recordVideo: { dir: videoDir, size: { width: 1280, height: 720 } }
  });

  const window = await electronApp.firstWindow();
  // Wait for the UI to be ready (adjust selector if needed)
  await window.waitForLoadState('domcontentloaded');

  // Example interaction: open the target post field, type a dummy URL, then stop.
  // The UI may change; selectors are based on the provided HTML.
  const targetInput = await window.$('#target-post');
  if (targetInput) {
    await targetInput.fill('https://www.instagram.com/reel/DEMO/');
  }

  // Wait a few seconds so the video captures the UI.
  await window.waitForTimeout(5000);

  // Take a screenshot for quick preview.
  await window.screenshot({ path: path.join(videoDir, 'screenshot.png') });

  // Close the app – this finalizes the video file.
  await electronApp.close();

  console.log('Demo video recorded to', videoDir);
})();
