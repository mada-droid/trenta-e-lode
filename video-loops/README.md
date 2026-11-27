# Focus-mode backgrounds

Remotion source of the six 120-second animated scenes used by the full-screen focus mode. Every motion is periodic over 3600 frames (integer cycles), so the last frame flows into the first and the video loops like a long GIF.

The illustrations themselves are not in the repository. Put them in `public/` with these names: `sakura-notte.jpg`, `tempio-primavera.jpg`, `castello-nuvole.jpg`, `collina-tramonto.jpg`, `fiume-villaggio.jpg`, `villaggio-aurora.jpg`, `foresta-sommersa.jpg`.

```bash
npm install
npm run studio                                    # preview
npx remotion render src/index.ts SunsetHill out/lofi-sunset-hill.mp4 --codec=h264 --crf=22
```

The rendered videos are published as assets of the `backgrounds-v1` release; the app downloads each one the first time it is used.
