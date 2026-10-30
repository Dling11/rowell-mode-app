# Service setup

The application targets Node.js 24 LTS and the Vercel Next.js preset. It requires
the Node runtime, not static export. Use the npm lockfile and `npm ci`.

## Environments

Create `.env.local` from `.env.example` for development. Configure environment
variables separately in Vercel Development, Preview and Production. Use distinct
Atlas credentials/databases and Cloudinary folders/presets for each environment.
Never prefix a credential with `NEXT_PUBLIC_`.

`BETTER_AUTH_URL` must be the exact browser origin, including scheme and port.
Use `http://localhost:3000` locally for passkeys. Production requires a stable HTTPS
domain; passkeys registered for localhost do not transfer to a different domain.

## Owner authentication

The owner account uses Better Auth with username/password and optional passkeys.
No GitHub account connection or OAuth credentials are required. GitHub supplies
public source/download links and published release metadata.

After configuring MongoDB and explicitly initializing the intended database, start
the local server and run:

```sh
npm run owner:setup
```

This creates missing authentication secrets in ignored `.env.local` and opens a
private first-owner setup link in the browser without printing its code. Choose
your own username and a password of at least 12 characters. Passwords are hashed
by Better Auth; public registration is blocked, and a unique partial index permits
only one owner. A private setup code is required and stops working after the owner
account exists. The URL fragment is removed immediately by the setup form and is
never sent in the HTTP URL. Do not share the setup link or code.

The public website opens at `/`; its footer has a small Rowell-Mode owner link.
Sign in at `/admin/login`. Under `/admin/account`, edit your display name, register passkeys, remove them
with confirmation or change your password. Passkeys require a recent sign-in and
device user verification. The device manages its fingerprint/PIN; the server stores
the public credential. Keep your password as a backup. Email password reset is not
configured; the account uses an internal email identifier and sends no email.

The dashboard stays at `/admin` during maintenance. Sessions are stored in MongoDB,
last up to eight hours, and have a signed 60-second cache. Revoked sessions on other
devices may remain usable until that cache expires. Password changes revoke other
sessions. Private Redux caches live in memory and clear at sign-out. Authentication
has server-side origin checks and database-backed rate limits. Login session metadata
is separate from the aggregate download click counts.

Configure fresh `BETTER_AUTH_SECRET` and `OWNER_SETUP_TOKEN` values separately for
each hosted environment. Local setup does not configure Vercel or deploy anything.
Register a new passkey on the final hosted domain after authorization to deploy.

The login page also supports an owner PIN with a phone-style keypad. PINs are
independent credentials, hashed by Better Auth in the server-side account store.
PIN sign-in has a database-backed five-attempts-per-minute rate limit. Under
Profile & security, setting or disabling a PIN requires a recent owner session and
the current account password. Keep the account password as a fallback; never put a
plaintext PIN in environment values, source files or public setup examples.

Successful password, PIN and passkey sign-ins play an optional-skippable full-screen
welcome entrance before a fresh request to the destination. The login page's
**Choose your entrance** selector previews three backgrounds and stores only that
display choice in the browser. A labelled preview does not authenticate a visitor.
The animation uses CSS and optimized WebP artwork; reduced motion shows a static
version. The full entrance runs for 15 seconds after the artwork is ready, revealing
the greeting and name in stages. **Full cinematic animation** is an explicit opt-in
when the device requests reduced motion. Still view waits for manual entry. Preview
mode stays open until closed and includes replay controls.

## MongoDB Atlas

Set `MONGODB_URI` and an explicit `MONGODB_DB`. Restrict the database user's
permissions and configure Atlas network access for the intended hosting environment.
The application caches a small connection pool; it never persists records in local
JSON files or stores app installers in MongoDB.

Initialize only the intended new database, using its exact configured name:

```sh
npm run db:init -- --database rowell_hub
```

This explicit operation creates indexes and inserts missing initial settings and
approved release pointers. It verifies the published assets first, preserves
existing records and starts downloads paused. Sign in and enable downloads only
after reviewing the pointers and site controls. Initialization never runs on startup.

## Approved releases and controls

`/download/<project>/<platform>` checks fresh MongoDB policy, resolves an
owner-approved published GitHub asset, then rechecks policy before redirecting.
Only known project repositories and exact HTTPS GitHub asset paths are accepted.
GitHub release lookups may be cached for 60 seconds; approval/pause policy is not.
Redirects are temporary and `no-store`. Lookup or policy failures block downloads.
HEAD, prefetch and obvious bots do not add to the private click totals; filtering
cannot identify every automated visitor. No visitor IP or per-visitor history is stored.

The dashboard supports manual approval and holds. Automatic approved manifests can
be integrated when a project's release process supplies a real approval manifest;
source pushes and `/releases/latest` are not used to promote packages. MH4U has no
download route. Adding a future public package requires an explicit catalog change.

`SITE_MODE=downloads-paused` or `SITE_MODE=maintenance` forces a stricter emergency
mode. It cannot loosen the stored policy. Maintenance returns HTTP 503 and keeps
owner access, health and required static assets reachable. On Vercel, missing or
unavailable policy also serves maintenance. Local unconfigured previews remain
readable with downloads disabled. These controls cannot revoke existing public URLs,
installed apps or copies already downloaded.

## Cloudinary

Set the server-only cloud name, API key/secret and a dedicated media folder. Check
credentials, the account folder mode and an existing configured preset with:

```sh
npm run media:setup
```

This check performs no uploads or configuration writes. To create a dedicated
**signed** image preset and save its name/folder mode in `.env.local`, run:

```sh
npm run media:setup -- --create-preset
```

To verify and select an existing preset instead, use `--preset <name>`. An existing
preset is never modified. It must use authenticated delivery, overwrite disabled
and formats restricted to `jpg`, `jpeg`, `png`, `webp` and/or `avif`. Leave folder
and public-ID prefixes unset; the application controls the destination. The signature
endpoint validates the preset before issuing each signature.

Set `CLOUDINARY_FOLDER_MODE` to the account's verified `dynamic` or `fixed` mode.
Dynamic accounts use `asset_folder` for Media Library organization; fixed accounts
use `folder`. Each environment should have its own folder and signed preset.

Uploads are owner-only, sent directly from the browser to the image Upload API
with authenticated delivery, fixed generated IDs and overwrite disabled. The server
enforces a 5 MiB file limit before signing and checks the actual provider resource's
size, image format, authenticated delivery and authorized ID/folder before recording
metadata. The app's limit is separate from Cloudinary's account upload-size limit;
it is not a provider-enforced 5 MiB transfer cap. A tampered direct upload may leave
an oversized private asset that the app refuses to record. Initial images remain
private in the library. Verification also prepares a bounded JPEG preview with
embedded profiles removed. Authenticated originals and signed provider URLs remain
server-only.
Upload intents expire after one hour; signing is limited to 20 intents per owner
per hour. Verification retries reuse the same upload and are idempotent. Cancelling,
leaving the page or choosing another image after a failed verification can leave
an authenticated asset in Cloudinary; review orphaned assets there. Provider plan
quotas apply.

At `/admin/uploads`, add an image description and optional caption, then explicitly
publish a photo to `/gallery`. Make private removes it from the gallery and project
covers. `/admin/projects` selects published images for cards, spotlight and project
pages. The same editor manages external reference links and dated link history;
references never become approved installers.

Public and owner image routes return resized previews through the server, capped
at 3 MiB per response to stay below Vercel's buffered-response limit. Public delivery
checks publication and maintenance each time; images use `no-store`. This uses
function bandwidth as well as Cloudinary delivery quota. Unpublishing prevents new
website requests but cannot revoke a copy a visitor has already saved.

Private notes are at `/admin/notes`. Save a note, then use **Publish a copy** to share
that selected text on `/updates`. The original stays private; later edits are separate.
Edit, unpublish or delete the copy under `/admin/updates`. Publishing retries reuse
the same copy instead of duplicating it.

With an active owner session, `/gallery` shows **Add photo** and `/updates` shows
**Write a note**. These open quick editors on the same page, with private saving and
explicit publication. Visitors see the public content without editing controls.
Private saves remain in the existing media library or notes workspace. Personal
notes can be published without attaching them to an app project.

## Android installation

The site includes an installable web-app manifest and Android app icons. Open its
HTTPS address in Chrome on Android, sign in as the owner, visit `/install`, and use the browser's install
action or menu. Installation requires no app-store account or purchase. Hosting,
database and media usage still follow their provider plans and quotas.

The installation page requires an owner session and returns to `/install` after
sign-in. The installed app starts at `/admin`, which requires the owner account.
Browsers can create shortcuts to public URLs; authorization protects the private
workspace and install flow, rather than promising to control browser shortcut creation.

The application uses the hosted Next.js server; it is not a native/offline database
app. Notes, authentication, uploads and approved downloads need connectivity.
The service worker stores only a generic offline page and its icon. It never caches
public page snapshots, private APIs, auth callbacks or download redirects. Server
503 responses remain authoritative. Failed offline navigations show a reconnect
screen, and unsaved work is not queued or synchronized in the background.

Local loopback on the development PC is not a phone-install URL. Verify installation,
standalone layout, sign-in cookies, uploads and reconnect behavior on a real Android
phone after an authorized HTTPS preview deployment. A separately signed Android APK
can be evaluated later for an approved hosted domain; none is generated by this setup.

## Vercel verification

Use the Next.js framework preset with no custom output directory. The included
configuration installs with `npm ci` and builds with `npm run build`. No deployment
is performed by the development or verification commands.

Before production, use an isolated Vercel Preview to check sign-in and secure
cookies, Atlas connectivity, publication/unpublication, signed uploads and policy
changes on direct URLs. Review Git exclusions and build output: local context,
credentials and generated packages must be absent. Check layout and installation
links on a physical phone as well as in local browser emulation.

References: [Next.js](https://nextjs.org/docs/app/getting-started),
[MongoDB Atlas](https://www.mongodb.com/docs/atlas/reference/partner-integrations/vercel/),
[Cloudinary signed uploads](https://cloudinary.com/documentation/upload_images),
[Vercel function limits](https://vercel.com/docs/functions/limitations).
