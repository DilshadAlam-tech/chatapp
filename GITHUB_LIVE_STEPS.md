# GitHub Live Steps

## What is already prepared

- The app now uses `HashRouter`, so client-side routes work on GitHub Pages.
- `vite.config.ts` automatically uses the correct base path on GitHub Actions.
- `.github/workflows/deploy.yml` is ready for automatic deployment to GitHub Pages.

## What you need to do on GitHub

1. Create a new GitHub repository.
2. Upload this project to the repository.
3. Make sure your default branch is `main`.
4. In GitHub, open `Settings -> Pages`.
5. Under `Build and deployment`, set `Source` to `GitHub Actions`.
6. Push to `main`.
7. Open the `Actions` tab and wait for `Deploy static content to Pages` to finish.
8. After success, open the URL shown in the workflow or in `Settings -> Pages`.

## Local commands if you push from your machine

```bash
npm install
npm run build
```

## Notes

- If the repo name is `yourname.github.io`, the site is served from the root domain.
- If the repo name is anything else, the site is served from `https://yourname.github.io/<repo-name>/`.
- Since this app is currently localStorage-based, GitHub Pages hosting works fine for the frontend, but data is browser-local, not a shared real-time backend.
