---
'@youversion/platform-core': minor
---

Add `ImagesClient` for verse-art image metadata. `getImages` calls `GET /v1/images` and returns a `Collection<Image>`. `getImage` calls `GET /v1/images/{image_id}`. Pass `{ beta: true }` to use `/v1-beta/images`.

`total_size` is included only when the API sends a number. A null or missing total is omitted, and `0` is kept. `page_token` accepts `null`. A blank passage id is rejected before the request. A bare chapter is sent to the server, which answers 400. The SDK returns metadata only. Read image bytes from `image_url`.
