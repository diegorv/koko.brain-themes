# KokoBrain themes

Color themes for [KokoBrain](https://github.com/diegorv/koko.brain). The app ships two built-in themes, KokoBrain Default (dark) and Lavender Haze (light). Every other theme lives here and is installed from Settings > Appearance.

## How the app uses this repository

The app reads one file: `index.json` on `main`, served from `https://raw.githubusercontent.com/diegorv/koko.brain-themes/main/index.json`. It lists the full package of every theme, so the catalog, its previews and an install need no other request.

An installed theme is copied into the app's settings and works offline. When `index.json` has a higher `version` for an installed theme, the app offers "Update to x.y.z". Nothing updates without a click, and a theme the user duplicated to customize never updates.

`index.json` is generated from `themes/`. Do not edit it by hand.

## Theme format

Each theme is one file, `themes/<id>.json`, validated by `schema/theme.schema.json`. A shortened example (a real `palette` needs every required field):

```json
{
	"schemaVersion": 1,
	"id": "my-theme",
	"name": "My Theme",
	"version": "1.0.0",
	"author": "your-name",
	"palette": {
		"editorBg": "#f4ecd8",
		"fg": "#3a2a1e"
	},
	"overrides": {
		"ui": { "statusBarBg": "#ede3cc" }
	}
}
```

- `schemaVersion`: version of the file format. The app refuses a version it does not know.
- `id`: lowercase slug, equal to the file name. Never change it: installed copies are matched by `id`.
- `name`: display name. It may change between versions.
- `version`: `MAJOR.MINOR.PATCH`. Bump it on every change, or installed copies never see the update.
- `palette`: the core colors. The app derives every token of the theme from them, so a token added to the app later gets a sensible value in existing themes. The schema lists the required and optional fields.
- `overrides`: optional, per token group (`ui`, `syntax`, `preview`, `wikilink`, `callout`). Use it only for tokens that must differ from what the palette derives.

Every value must be a color: hex (3, 4, 6 or 8 digits), `rgb()` / `rgba()`, `hsl()` / `hsla()`, `oklch()` with numeric arguments, `transparent`, or `color-mix(in srgb, <color> N%, transparent)`. The app writes these values into CSS, so anything else (`url(...)`, `var(...)`, a `;`) is rejected, here and in the app.

## Adding or changing a theme

1. Add or edit `themes/<id>.json`. For a change, bump `version`.
2. Run `pnpm install` once, then `pnpm build` to validate the themes and regenerate `index.json`.
3. Commit the theme file and `index.json` together.

CI runs `pnpm check`, which fails on an invalid theme, a duplicate `id` or `name`, or an `index.json` that does not match `themes/`.

## Credits

The Zettlr themes copy palettes from [Zettlr](https://github.com/Zettlr/Zettlr) and the Tolaria themes from [Tolaria](https://github.com/refactoringhq/tolaria). Only the colors are copied, no code.
