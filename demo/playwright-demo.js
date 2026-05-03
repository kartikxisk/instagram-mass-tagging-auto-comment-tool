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
  const projectRoot = path.resolve(__dirname, '..');
  const electronApp = await electron.launch({
    args: [projectRoot],
    env: { ...process.env, NODE_ENV: 'production' },
    timeout: 120000
  });

  try {
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
  } catch (err) {
    console.error('Error during demo:', err);
  } finally {
    // Close the app – this finalizes the video file.
    await electronApp.close();
    console.log('Demo video recorded to', videoDir);
  }
})();