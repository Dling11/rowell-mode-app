# Application structure

```text
src/
  app/                       App Router pages, layouts and HTTP routes
    (site)/                  Public portfolio, projects, progress and installation
    (admin)/admin/           Owner login and protected workspace
    api/admin/               Authorized, validated owner endpoints
    download/                Approved release redirects
    media/                   Publication-checked image delivery
  features/
    auth/                    Owner credentials, setup and passkey management
    appearance/              Device-aware motion preference and controls
    dashboard/               Workspace overview and private counts
    projects/                Public cards, animated spotlight and owner project editor
    downloads/               Public package list, release display and approval editor
    notes/                   Private note editor and explicit public copies
    updates/                 Draft and publication workflow
    uploads/                 Image upload, verification, library and publication
    gallery/                 Server-rendered public photo journal
    site-settings/           Maintenance and download controls
    install/                 Android PWA installation interface
  components/
    layout/                  Public header, footer and branding
    media/                   Lazy photo viewer and reusable preview trigger
    workspace/               Shared owner shell and workspace styles
    ui/                      Reusable dialogs, query feedback and notifications
  server/
    auth/                    Session and owner allowlist checks
    db/                      MongoDB client and record repositories
    media/                   Cloudinary configuration and upload verification
    releases/                Published GitHub asset validation
    site-policy/             Maintenance and download enforcement
  store/                     Owner-scoped Redux store and RTK Query base
  lib/                       Shared pure helpers and pagination types
  data/                      Curated public project and branding data
  styles/                    Theme tokens and global styles
scripts/                     Explicit service setup and icon generation
tests/                       Unit and isolated production-browser checks
```

Within each feature, `components/` contains interfaces, `api/` contains injected
RTK Query endpoints, and `model/` contains schemas, types and serializable state.
The uploader also has `hooks/` for its lifecycle and `lib/` for file validation
and direct transfer. Small features use only the segments they need.

Routes compose features. Public pages render mostly on the server; the Redux
provider and upload tooling load under the owner workspace. Secret-bearing modules
use `server-only`. MongoDB queries stay in repositories, while provider services
authorize destinations and verify external results. Shared styles and DTOs do not
depend on a particular feature.

Private notes and public updates use separate records and endpoints. Every owner
API checks the session on the server. Uploads require an owner-authorized signature,
go directly to Cloudinary with authenticated delivery, and enter the private library
only after server verification. Redux never grants access or approves a download.

Photos start private. Explicit publication exposes only the image, description,
caption and publication date. Signed provider URLs stay on the server; image routes
check publication and maintenance on each request. Unpublishing also removes project
covers using that image. Private notes can publish a separate copy to Updates;
subsequent private edits never change that copy.

Gallery and Updates render quick-action buttons only after a server owner-session
check. Their dialogs load on demand and scope a separate in-memory Redux provider
to the editor. They reuse the same authorized note/upload/publication APIs as the
dashboard. Visitor pages do not load the editor, Redux or upload tooling. Request
authorization remains authoritative if a session expires while a dialog is open.

Navigation indicators use Next.js link status and React transitions. Action buttons
reflect their request state; owner notifications use Sonner. Motion for React's mini
API coordinates the welcome camera and text, loaded with the entrance. The photo
viewer uses Yet Another React Lightbox with zoom, captions and fullscreen plugins,
loaded only when a photo opens. Public pages keep their server-rendered content and
private routes are not prefetched. Animations default to On. The On/Off setting is
saved only in this browser on this device and applies to the spotlight, loaders,
photo viewer and login entrance. Off uses a simpler, still presentation. The choice
is applied before paint, survives reloads and is independent of the owner account.

Project resources are validated external references, separate from installer approval.
Resource edits retain the latest 50 dated link snapshots in the owner workspace.

The owner PIN is a Better Auth plugin using the existing adapter, password hashing,
session creation and cookie helpers. It stores a separate `owner-pin` account;
username/password credentials and passkeys are independent. PIN management requires
a fresh server owner session and current password. No PIN/hash enters user DTOs.
The welcome animation loads only when signing in or explicitly previewing it on the
login page. Preview state and theme selection never grant access to the workspace.
