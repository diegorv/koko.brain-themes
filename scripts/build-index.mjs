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
