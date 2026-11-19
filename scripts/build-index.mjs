// Validates every theme in themes/ against schema/theme.schema.json and
// writes index.json, the single file the KokoBrain app fetches.
// `--validate` checks the themes and writes nothing (used on pull requests;
// the push to main regenerates index.json in CI).
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import Ajv2020 from 'ajv/dist/2020.js';

const root = new URL('..', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const validateOnly = process.argv.includes('--validate');

const validate = new Ajv2020({ allErrors: true }).compile(JSON.parse(read('schema/theme.schema.json')));
const errors = [];
const themes = [];

for (const file of readdirSync(new URL('themes/', root)).filter((f) => f.endsWith('.json')).sort()) {
	let theme;
	try {
		theme = JSON.parse(read(`themes/${file}`));
	} catch (e) {
		errors.push(`themes/${file}: invalid JSON (${e.message})`);
		continue;
	}
	if (!validate(theme)) {
		for (const err of validate.errors) errors.push(`themes/${file}: ${err.instancePath || '/'} ${err.message}`);
		continue;
	}
	if (`${theme.id}.json` !== file) errors.push(`themes/${file}: id "${theme.id}" must match the file name`);
	themes.push(theme);
}

// Palette design checks. The app lifts every text token to its minimum
// contrast, so readability pairs always pass after the build; these catch what
// the lift cannot fix: a hover or selected surface you cannot see, a hover
// that reuses the border gray, and secondary text that sits so close to body
// text that the hierarchy disappears.
const MIN_SURFACE_STEP = 1.05;
const MIN_TEXT_HIERARCHY = 1.3;

/** WCAG relative luminance of a `#rgb`, `#rgba`, `#rrggbb` or `#rrggbbaa` color (alpha ignored). */
function luminance(hex) {
	let h = hex.slice(1);
	if (h.length <= 4) h = [...h.slice(0, 3)].map((c) => c + c).join('');
	const [r, g, b] = [0, 2, 4]
		.map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
		.map((s) => (s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4));
	return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG contrast ratio of two hex colors. */
function contrast(a, b) {
	const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
	return (hi + 0.05) / (lo + 0.05);
}

for (const t of themes) {
	const p = t.palette;
	const where = `themes/${t.id}.json`;
	const step = (a, b, what) => {
		const ratio = contrast(p[a], p[b]);
		if (ratio < MIN_SURFACE_STEP) {
			errors.push(`${where}: palette.${a} ${p[a]} is ${ratio.toFixed(2)}:1 against ${b} ${p[b]} (${what} needs ${MIN_SURFACE_STEP}:1)`);
		}
	};
	if (p.hover.toLowerCase() === p.border.toLowerCase()) {
		errors.push(`${where}: palette.hover equals palette.border (${p.hover}); hover rows and chips need their own surface`);
	}
	step('hover', 'sidebarBg', 'a hovered row');
	step('selected', 'sidebarBg', 'a selected row');
	step('selected', 'popoverBg', 'a highlighted menu row');
	const hierarchy = contrast(p.fg, p.mutedFg);
	if (hierarchy < MIN_TEXT_HIERARCHY) {
		errors.push(`${where}: palette.mutedFg ${p.mutedFg} is ${hierarchy.toFixed(2)}:1 from fg ${p.fg}; secondary text needs ${MIN_TEXT_HIERARCHY}:1 to read as secondary`);
	}
}

for (const key of ['id', 'name']) {
	const seen = new Set();
	for (const t of themes) {
		if (seen.has(t[key])) errors.push(`duplicate ${key} "${t[key]}"`);
		seen.add(t[key]);
	}
}

if (errors.length) {
	console.error(errors.join('\n'));
	process.exit(1);
}

themes.sort((a, b) => a.id.localeCompare(b.id));
const index = JSON.stringify({ schemaVersion: 1, themes }, null, '\t') + '\n';

if (validateOnly) {
	console.log(`${themes.length} themes are valid.`);
} else {
	writeFileSync(new URL('index.json', root), index);
	console.log(`index.json written (${themes.length} themes).`);
}
