# Verified course APP build input

`elcton-2a8183a.carrier` is the byte-identical unsigned Lite `.app` taken from the user's public course-table project, not a different application skeleton.

- Repository: `lantianhcgp/elcton`
- Source commit: `2a8183a537db333df1d3eeb350015dbd99ac71d2`
- GitHub Actions run: `41257190699`
- Artifact ID: `13063352354`
- Artifact name: `wearengine-watch-2a8183a537db333df1d3eeb350015dbd99ac71d2`
- Original file: `elcton-default-unsigned.app`
- SHA-256: `0e317fbb436837b093f5903004ab1edeb5c9ba3e42c0b9034cc3d362d09d8f30`

The `.carrier` extension only avoids accidentally treating this immutable build fixture as the deliverable. It remains an unchanged `.app` ZIP. `scripts/course_carrier.py` rejects any other hash and preserves all newly compiled Liubai file bytes. All carrier archive entries were scanned for private keys and live tokens before inclusion. It contains no signing profile/private key and is never installed or published as the Liubai release.

Embedding this small immutable public artifact makes CI reproducible after artifact retention expires and does not require granting cross-repository Actions credentials.
