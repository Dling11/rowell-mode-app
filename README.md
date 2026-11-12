# Rowell-Mode

A personal portfolio and app download hub for Rowell / Nikushimi. Explore community
projects, public releases, selected notes and a photo gallery in a faded-blue theme.

Public pages use Next.js App Router Server Components. The owner workspace uses
Redux Toolkit / RTK Query, Radix dialogs and Sonner. Styling uses CSS Modules.
MongoDB Atlas stores records and policy; Cloudinary receives signed image uploads.
Installers remain on GitHub Releases.

Tri Low Spec is listed separately from the standard Android ARM64 and Windows
packages. Its experimental ARMv7 APK uses a separate verified release approval
and keeps its own app data. See [Low Spec](https://rowell-mode-app.vercel.app/projects/mh-tri-low-spec) for compatibility and setup.

## Local development

Use Node.js 24 LTS and npm.

```sh
npm ci
npm run dev
```

Open [the local preview](http://127.0.0.1:3000). Without service configuration, the
portfolio works, owner access is unavailable and downloads fail closed.

Copy `.env.example` to `.env.local` to configure services. See
[service and Vercel setup](docs/setup.md), [application structure](docs/architecture.md)
and [project credits](docs/credits.md).

The owner can install the hosted app after signing in through `/install`.
The app opens the protected dashboard; the public portfolio remains at `/`.
The owner workspace includes a private Game saves library with a folder for each
person. Optional seven-day invitation links permit uploads and downloads only in
that folder. Save archives are limited to 4 MB; game images and APKs are excluded.
Phone installation requires an HTTPS address. Offline mode shows a reconnect screen;
notes, sign-in, uploads and downloads require an internet connection.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npx playwright install chromium
npm run test:browser
```

Browser tests run against local production servers with isolated test credentials
and no database connection. Live Atlas, Cloudinary, Vercel and physical-phone
checks are separate from these tests.
