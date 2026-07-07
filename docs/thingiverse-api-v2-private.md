# Thingiverse write-API contract (working notes for `hnr`)

Reverse-engineered by (a) driving the live SPA as devonjones with rodney +
fetch/XHR interception, (b) the v1 OpenAPI at
`https://www.thingiverse.com/swagger/docs/openapi.yaml` (+ its `$ref`
sub-files under `/swagger/docs/`), and (c) direct API probes with a live
token. **The write surface is the v1 API**, not v2.

## Auth for writes — SOLVED

- `POST https://api.thingiverse.com/v2/auth/login` `{usernameOrEmail, password}`
  → `200 {message, token, jwt:{access, refresh}}`.
- **Use the `token` field (32-char opaque) as `Authorization: Bearer <token>`.**
  Verified it authenticates as **devonjones (Devon Jones, id 47139)** and is
  the same token the SPA uses for write calls. The `jwt.access` is for v2
  READ endpoints only (the opaque token 401s on v2 `/users/me`; the JWT is
  not what writes use).
- **Hit `api.thingiverse.com` directly, not `www.thingiverse.com/api/`.**
  The `www` origin is behind a Cloudflare bot challenge (returns a "Just a
  moment…" 403 to non-browser clients); `api.thingiverse.com` is not
  challenged and accepts the token fine.
- **The env `THINGIVERSE_APP_TOKEN` is the wrong credential**: it's also a
  32-char opaque token but authenticates as **Joaquin Munguia (id 5577639)**,
  not devonjones — writes with it would land on the wrong account. Do not use
  it. (Open item: reconcile why app:1197 issued a Joaquin-scoped token — see
  `hnr` notes; not a blocker since the login `token` works.)

## File hash — SOLVED: it's content-MD5

- The v1 `File` schema has a `hash` field ("The hash of the file").
- Empirically: 3DBenchy's files report 32-char hex hashes; downloaded the
  74 KB multipart STL (file 1475623) and its computed **MD5 exactly matches**
  the reported `hash` (`15a6feb55745618e878202d862c44b4d`).
- **Implication:** the catalog already stores `file_md5` (per-blueprint) and
  computes MD5 in the scanner — the sync engine compares catalog `file_md5`
  directly against Thingiverse's `hash`. **No SHA-256 needed.** The
  `thingiverse_files.local_sha256` column added defensively in migration v17
  is unnecessary (harmless dead column; drop in a follow-up or leave).

## Write endpoints (v1, host `api.thingiverse.com`)

From the swagger path list; payload shapes to be confirmed on first real use.

| Purpose | Endpoint |
|---|---|
| Create thing | `POST /things/` (v1 create; old tooling payload `{name, license, category, tags[], description}`) |
| Update thing | `PATCH /things/{thing_id}` |
| Upload a file | `POST /files/0/uploadFile` (multipart/form-data → `{"id": <fileId>}`); the `0` is the thing sentinel |
| Finalize upload | `POST /files/0/FinalizeFiles` (the `Finalize`/`/files/{id}/finalize` variants are DEPRECATED) |
| Thing's files (hash lives here) | `GET /things/{thing_id}/files`, `GET /things/{thing_id}/files/{file_id}` |
| Images | `GET/POST /things/{thing_id}/images`, `/images/{image_id}` |
| Publish | `POST /things/{thing_id}/publish` |
| Delete/move/copy | `POST /thingops/{ids}/remove|move|copy` |
| Download | `GET /files/{file_id}/download` |

Observed upload flow in the SPA: `POST /files/0/uploadFile` (multipart, one
per file) → returns `{id}` → files attach to the draft. A **finalize** step
(`/files/0/FinalizeFiles`) commits them. Create-thing (`POST /things/`) was
NOT captured live (the generic editor stalled on a Thingiverse-side 500), so
confirm its exact payload against the swagger `resources/thing.yaml#/Root`
and on first real create.

## Known limitation (from Devon)

The **v1 write API can't modify every field** Devon needs on a thing; he has
an open request to Thingiverse for the missing fields (likely the reason the
custom v2 surface exists). Plan: build `gn2` against the v1 write endpoints
that work today; leave the not-yet-modifiable fields for when Thingiverse
ships v2 write support.

## Remaining to confirm on first real create (do with a throwaway draft)

- Exact `POST /things/` request/response (thing_id, initial status).
- The `uploadFile` multipart field names + how a file is bound to a thing
  (thingId in path is `0` pre-save — how the finalize associates them).
- Publish payload and the draft→published transition.

## Local test hashes (for any future round)

| file | md5 | size |
|---|---|---|
| test_model.stl (battle-axe) | `2d56b05653ee9ad44205c53a09657285` | 170807 |
| test_photo.png | `1c2d59d649820c7c302ec3d5da755991` | 76 |
| test_bundle.zip | `db28a8cdbe01b03852dd6945a2e47afe` | 203 |

## VALIDATED on real data (thing:7364110 "Aztlan Snakeholes", devonjones)

Cross-checked 33 live files against the catalog's aztlan fixture: **31/31
individual STLs matched by MD5 exactly** (the 2 non-matches are `.zip`
bundles, which the catalog doesn't track as blueprints). End-to-end proof
the sync comparison works. Two hard requirements surfaced:

1. **Hash encoding VARIES.** Older things return hex MD5 (`b8ae14b6…`,
   32 chars); this recent set returns **base64 MD5** (`lma97RnU7yEQDMZcDe1vEA==`,
   24 chars = 16 bytes). The sync engine must normalize before comparing to
   the catalog's hex `file_md5`:
   `norm = hexlify(b64decode(h)) if len(h)==24 and h.endswith("=") else h.lower()`
   (more robustly: 24-char/base64 → decode→hex; 32-char hex → lowercase).
2. **Thingiverse sanitizes filenames on upload** — `#`, `,` (and likely
   `+`/`%`) are stripped/changed: catalog `aztlan#snakehole.A.openforge,side.stl`
   → Thingiverse `aztlansnakehole.A.openforgeside.stl`. **Files cannot be
   matched by name across the boundary — match by MD5.** (The
   `thingiverse_files` ledger already keys on hash/remote_file_id, so this is
   fine — but the assembler/sync must NOT assume the remote name equals the
   local name.)

Also confirmed on a real thing: `license` = human string
("Creative Commons - Attribution - Non-Commercial - Share Alike"),
`is_published` = 1, `creator.name` = devonjones — matches the v1 schema.
