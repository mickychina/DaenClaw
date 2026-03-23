# ClawX Update Server (Static)

This is a small static server compatible with `electron-updater` generic feeds.

## Quick Start

```bash
node update-server/server.mjs
```

Environment variables:

- `UPDATE_SERVER_ROOT` (default: `updates`)
- `HOST` (default: `0.0.0.0`)
- `PORT` (default: `3000`)

## Directory Layout

ClawX requests a channel-specific feed URL, so the server must expose:

```
updates/
  latest/
    latest.yml
    ClawX-0.2.4-beta.2-win-x64.exe
    ClawX-0.2.4-beta.2-win-x64.exe.blockmap
  beta/
    beta.yml
    ClawX-0.2.4-beta.2-win-x64.exe
    ClawX-0.2.4-beta.2-win-x64.exe.blockmap
  dev/
    dev.yml
    ClawX-0.2.4-beta.2-win-x64.exe
    ClawX-0.2.4-beta.2-win-x64.exe.blockmap
```

The update server URL in ClawX should point to the base URL, for example:

```
https://updates.example.com
```

ClawX appends the channel path automatically (`/latest`, `/beta`, `/dev`).

## Generating the `.yml` feed

`electron-builder` generates the `latest.yml` / `beta.yml` / `dev.yml` files
when packaging the app. Copy the generated `.yml` and installer artifacts into
the channel directory above.
