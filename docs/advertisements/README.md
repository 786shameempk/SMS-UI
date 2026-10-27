# Advertisement banners

Built 2026-10-27. Nothing is committed. The office configures image banners in the office portal (`/adminLogin`); the web app and the three mobile apps show them once on their home screen.

## What was found in the repository

| Thing | Where |
|---|---|
| Office portal ("adminLogin") | SMS UI `src/features/office`, menu in `navigation.ts`, pages in `pages/registry.ts`; API in AuthService `api/office/*` with its own token and `office_perm` permissions |
| Tenants | AuthService `Tenants` table (string id, school name, subdomain); a signed-in school user's tenant is in the sign-in token (`ICurrentUserService.TenantId`) |
| File storage | AuthService `IFileStorageService` (local disk or Azure Blob), served through signed, expiring `api/user-files` links |
| Web home page | `/dashboard` (`DashboardPage`) |
| Mobile apps (Expo / React Native monorepo, `SMS Mobile`) | `apps/student` (student and parent), `apps/teacher`, `apps/staff`; shared `packages/ui` and `packages/api`; all call AuthService through the gateway as `services/identity/...` |
| Mobile home screens | student `app/(tabs)/index.tsx`, teacher `app/(tabs)/index.tsx`, staff `app/(app)/(tabs)/index.tsx` |

The feature belongs in AuthService because it owns tenants, the office portal, the file store and the sign-in token. No new service, gateway route or library was added. "Office login or admin login" is the same place: the office portal at `/adminLogin`. The school app's platform console (super admin) was not changed.

## Rules

- **Four independent targets** (Web, Student/Parent app, Teacher app, Staff app). Each has its own on/off, image, link, auto-close seconds and close-button setting. Turning on the web app does nothing for the mobile apps.
- **Which advertisement** (one at a time, no carousel): active, inside its schedule if one is set, the app's target switched on with an image, and the school eligible. If several qualify, the lowest display order wins, then the most recently created.
- **Schools:** All schools, or Selected schools. Selected with no school is refused when saving and is never read as everyone. The school comes from the sign-in token, never from the request, and a person with no school (a platform account) gets nothing.
- **Image:** PNG, JPEG or WebP up to 5 MB; checked by extension and by the file's first bytes (a renamed file is refused); stored in the file store under `advertisements/` and only the key is kept in the database. Replacing or deleting removes the old file. Handed out as a signed link that expires. The banner keeps the image's proportions.
- **Link:** optional, https only, no spaces or control characters, no credentials, at most 2,048 characters. `javascript:`, `data:`, `file:`, `intent:`, `http:` and everything else are refused on the server, in the office form and again in the apps before opening. Without a link the image does nothing when clicked. The link opens only on a click or tap on the image.
- **Close:** the close button is optional; auto-close (3 to 120 seconds) is always enforced. Timers are cleared on close and unmount, and the banner closes once.
- **Shown once** per browser session (web, sessionStorage) or per app session and person (mobile), and fetched at most once every five minutes. If the image fails to load the banner disappears without a placeholder. No advertisement, no request failure and no error ever shows anything.
- **Home only:** the web banner is mounted in `DashboardPage` only, and each mobile app mounts it on its home tab only. Tests guard both.

## Office page

Office menu: **Advertisement Management** (permission `advertisements.view`), page title **Advertisement Banner Configuration**. List (paginated, search, status and application filters), create, edit, activate or deactivate, preview (with the close button on and off, replay), and delete. **Delete is permanent** (rows and images) after a confirmation; deactivate to stop showing without deleting. `advertisements.manage` is needed to change anything. Super Admin and Operations Admin get both; the Read-Only Auditor gets view. Roles are re-applied at start-up, so they pick the new permissions up on the next start; custom roles must be given them in Roles & Permissions.

## API (AuthService)

| Route | Who |
|---|---|
| `GET api/office/advertisements?search&status&app&page&pageSize` | office `advertisements.view` |
| `GET api/office/advertisements/{id}` | view |
| `GET api/office/advertisements/tenants?search&take` | view (school picker) |
| `POST api/office/advertisements`, `PUT .../{id}`, `PUT .../{id}/active`, `DELETE .../{id}` | office `advertisements.manage` |
| `POST api/office/advertisements/images` (multipart `file`) | manage |
| `GET api/advertisements/current?app=web\|student\|teacher\|staff` | any signed-in school user; 200 with `{ id, imageUrl, redirectUrl, autoCloseSeconds, showCloseButton }`, or 204 |

The last response holds nothing else: no name, no school list. Every create, update, activation, deletion and image upload is written to the office audit log (`advertisement.*`).

## Database

One migration, `20261027105802_AddOfficeAdvertisements`: tables `OfficeAdvertisements`, `OfficeAdvertisementTargets` (unique per advertisement and app) and `OfficeAdvertisementTenants`. Nothing else is touched. The file store gained `UploadToFolderAsync` (existing uploads are unchanged).

## Configuration and deployment

No new settings. Rebuild AuthService and the web image; ship new builds of the three mobile apps (they need the updated `@educore/api` and `@educore/ui`). Image storage follows the existing `BlobStorage` setting, otherwise the local `App_Data/user-files` folder. Old app versions simply never ask for an advertisement. Schedule times are stored in UTC and the form converts from the browser's time zone.

## Tests and checks

AuthService 1,072 unit tests pass (33 new, in `Office/OfficeAdvertisementTests.cs`). SMS UI: 1,358 pass (58 new); `typecheck:test` and `npm run build` clean. Mobile: student 86, teacher 51, staff 117 pass (28 new, in `apps/student/__tests__/advertisement*.ts`); all three apps and `packages/ui` typecheck. Live run against a throwaway SQL Server database (migration applied, real office sign-in with a forced password change): 34 of 34 checks, including upload refusals, school targeting for all four apps, 204 for unconfigured apps and other schools, school tokens refused on every office route, hard delete removing rows and the stored image, and the audit trail.

## Not done

- **Not verified on a device.** The mobile banner is tested with the React Native test renderer (timers, link, close, once per session), not on a phone or emulator. The web banner was not looked at in a browser pane.
- **Image size and shape are not checked** (any dimensions up to 5 MB). Very tall images are capped to half the screen on mobile and shown in full on the web.
- **Fixed to Web and the three mobile apps.** A fifth target needs a code change.
- **Orphaned uploads:** an image uploaded in the form and never saved stays in the store until someone deletes the advertisement (a form closed without saving leaves it behind).
- **The office page is English only**, like the rest of the office portal.
