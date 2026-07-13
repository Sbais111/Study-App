# VCE PE Review Coach

A browser-based spaced and retrieval practice app for VCE Physical Education students.

## What the app does

- Students log the date on which content was first learned.
- Reviews are automatically scheduled for 2, 7 and 30 days after the original learning date.
- Each review uses a retrieval prompt rather than passive rereading.
- Students record confidence and a brief correction.
- Completed reviews award points:
  - 2-day review: 20 points
  - 7-day review: 35 points
  - 30-day review: 60 points
- Includes levels, streaks, badges, review history, filters, backup/import and offline support.
- Student data is stored in the browser on the device.

## Publish with GitHub Pages

1. Create a new public GitHub repository.
2. Upload every file in this folder to the main branch.
3. Open **Settings** in the repository.
4. Select **Pages**.
5. Under **Build and deployment**, choose **Deploy from a branch**.
6. Select the `main` branch and `/root` folder.
7. Save.
8. GitHub will provide the public app link.

## Important reminder behaviour

Browser notifications can be enabled by each student. A normal website cannot reliably send scheduled notifications while fully closed without a server or push-notification service. The app therefore:
- highlights all due and overdue reviews whenever opened;
- displays a browser notification when opened if permission has been granted;
- works offline after its first successful load.

For school use, students can install the app to their home screen and open it during a regular class or homework routine.

## Files

- `index.html` — page structure
- `styles.css` — visual design
- `app.js` — scheduling, rewards and storage
- `manifest.webmanifest` — installable web app settings
- `service-worker.js` — offline caching
- `icon.svg` — app icon
