# Fonts for generated images

`app/opengraph-image.tsx` and `app/icon.tsx` render through Satori, which needs
the actual font binaries — it cannot use the `next/font` faces the pages get.
These two are read from disk at build time rather than fetched, so the build
does not depend on a font CDN staying up.

They are the same faces the site uses, so a shared link looks like the site.

| File | Family | Copyright |
| --- | --- | --- |
| `DMSerifDisplay-Regular.ttf` | DM Serif Display | Copyright 2014–2018 Adobe, with Reserved Font Name 'Source'. Copyright 2019 Google LLC. |
| `IBMPlexMono-Medium.ttf` | IBM Plex Mono | Copyright © 2017 IBM Corp., with Reserved Font Name 'Plex'. |

Both are licensed under the SIL Open Font License 1.1 — see [OFL.txt](OFL.txt),
which permits bundling them in a project like this one.
