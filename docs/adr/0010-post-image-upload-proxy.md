# Post images are uploaded via a proxy endpoint, not embedded in the post body

Cover images and inline post images are uploaded as binary to a dedicated
`POST /api/v1/files` endpoint that stores them in MinIO and returns a public URL;
posts then reference that URL only (`coverImageUrl`, or `![](url)` inside the Markdown
`content`). Binary image data never travels inside a post JSON body and never reaches
the database.

## Context

Issue #140 proposed adding an "image content" field to the post request so the backend
could persist the uploaded bytes. We rejected that shape: it couples image transfer to
post create/update, forces base64 (or multipart) bloat into every post payload, and
would store binary in (or alongside) the relational write model.

## Decision

A single multipart proxy, `POST /api/v1/files` (`FileController` → `FileStorageService`),
owns all image ingestion:

- Validates type (`png/jpeg/webp/gif`) and size (`app.storage.max-file-bytes`, 5 MB default).
- Writes to the `verita-post-photos` MinIO bucket under a UUID key via the S3 SDK.
- Returns `{ url }`, a publicly-readable URL (the bucket is `mc anonymous set download`,
  so browsers load it directly without auth).

The endpoint is **protected** (authenticated JWT required); the bucket is scoped to a
least-privilege `content-service` S3 user. Both cover and inline images use this one path —
they differ only in where the returned URL is placed.

The frontend Post Editor therefore uploads on file-select / paste, receives a URL, and
stores the URL in the post. Publishing (`POST /posts`) and editing (`PATCH /posts/{id}`)
carry URLs only.

## Consequences

- MinIO stays internal to the deployment; only the public read URL is exposed.
- Orphaned uploads are possible (a file uploaded but never referenced by a published post).
  Garbage-collecting them is out of scope here and left for a future cleanup job.
- Issue #140's "image content field" approach is **superseded** by this proxy; the issue
  should be closed as resolved-by-alternative.
