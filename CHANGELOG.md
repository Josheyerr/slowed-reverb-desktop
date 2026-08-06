# Changelog

All notable changes to **Slowed + Reverb** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.8] — 2026-08-06

### Added
- Preview **volume** control in the bottom bar (speaker + slider). Adjusts live playback only — exports stay at full level.

### Fixed
- During export, **“Rendering…”** no longer overlaps the volume slider. Volume and export progress swap cleanly; volume returns when export finishes.

## [1.0.6] — 2026-08-06

### Fixed
- Custom preset **Save** now works (Electron blocks browser `prompt` dialogs). Saving opens an in-app name field; Enter confirms, Escape cancels.
- Deleting a custom preset uses an in-app confirm (right-click, then click again) instead of a broken browser confirm.

## [1.0.5] — 2026-08-06

### Fixed
- App window stayed invisible when launching via the installer “Run” checkbox. The window now shows when the UI finishes loading.

## [1.0.4] — 2026-08-06

### Changed
- Smaller Windows installer (roughly ~157 MB → ~113 MB) by trimming duplicate bundled binaries and tightening packaging.

## [1.0.3] — 2026-08-06

### Fixed
- Packaging and release feed polish for auto-update installs.

## [1.0.2] — 2026-08-06

### Fixed
- Early installer / update pipeline fixes after the first public builds.

## [1.0.1] — 2026-08-06

### Fixed
- Follow-up fixes for the initial Windows release.

## [1.0.0] — 2026-08-06

### Added
- Windows x64 NSIS installer with Start Menu / Desktop shortcuts
- Import local audio, or pull audio from YouTube / TikTok links
- Built-in presets (Slowed + Reverb, Nightcore, Off) plus custom saved presets
- Effects: reverb, bass, EQ, pitch / tempo, live A/B bypass
- Export to WAV or MP3 (single track or batch)
- Background auto-updates from GitHub Releases
- FFmpeg and yt-dlp bundled (no separate installs)

[1.0.8]: https://github.com/Josheyerr/slowed-reverb-desktop/releases/tag/v1.0.8
[1.0.6]: https://github.com/Josheyerr/slowed-reverb-desktop/releases/tag/v1.0.6
[1.0.5]: https://github.com/Josheyerr/slowed-reverb-desktop/releases/tag/v1.0.5
[1.0.4]: https://github.com/Josheyerr/slowed-reverb-desktop/releases
[1.0.3]: https://github.com/Josheyerr/slowed-reverb-desktop/releases
[1.0.2]: https://github.com/Josheyerr/slowed-reverb-desktop/releases
[1.0.1]: https://github.com/Josheyerr/slowed-reverb-desktop/releases
[1.0.0]: https://github.com/Josheyerr/slowed-reverb-desktop/releases
