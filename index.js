const fs = require('node:fs');
const path = require('node:path');
const mkdirp = require('mkdirp');
const { yellow, red, cyan, gray } = require('kleur/colors');
const { totalist } = require('totalist/sync');
const args = require('minimist')(process.argv.slice(2));

// INIT ARGS WITH DEFAULT FALLBACK
const COMMAND = args._[0];
const INDIR = args.indir || '../_sandbox/icons/icons';
const OUTDIR = args.outdir || './build/bs-icons';
const OUTDIR_EJS = args.outdir || './build/bs-icons-ejs';
const OUT_NAME_PREFIX =
	args['out-name-prefix'] !== undefined ? args['out-name-prefix'] : 'bsIcon';

// return early with help?
const isHelp = !!args.h || !!args.help || !COMMAND;
if (isHelp) return help();

//
const isSilent = args.silent;
const log = (...args) => {
	if (isSilent) return;
	console.log.apply(null, args);
};

// run now
main().catch(onError);

//////////////////////////////////////////////////////////////////////////////////////////
async function main() {
	switch (COMMAND.toLowerCase()) {
		case 'help':
			return help();
		case 'build':
			return await build();
		case 'build-ejs':
			return await build(true);
		default:
			throw new Error(`Command "${COMMAND}" not found`);
	}
}

async function build(isEjs = false) {
	try {
		const _outDir = path.join(process.cwd(), isEjs ? OUTDIR_EJS : OUTDIR);
		totalist(INDIR, (name, abs, stats) => {
			if (/\.svg/i.test(name)) {
				const id = safeId(name.replace(/\.svg$/, ''));
				mkdirp.sync(_outDir);

				let size = 16;
				let svg = fs.readFileSync(abs, 'utf8').replace(/[\n\r]/g, ' ');

				// ugly heroicons special case
				const m = /viewBox=['"](?<viewBox>[^"']+)['"]/.exec(svg);
				if (m?.groups?.viewBox && /heroicons/.test(INDIR)) {
					const [_1, _2, w, h] = m.groups.viewBox.split(' ');
					if (w === h) {
						//sanity
						size = w;
					}
				}

				svg = svg
					.replace(' xmlns="http://www.w3.org/2000/svg"', '')
					.replace(/ class="[^"]+"/, '')
					.replace(/ width="[^"]+"/, '')
					.replace(/ height="[^"]+"/, '')
					.replace(
						'<svg ',
						isEjs
							? `<svg style="<%= props.style || \'\' %>" class="<%= props.extraCls || \'\' %>" width="<%= props.size || ${size} %>" height="<%= props.size || ${size} %>" `
							: '<svg style="${style || \'\'}" class="${extraCls || \'\'}" width="${size}" height="${size}" '
					)
					.replace(/>\s+</g, '><')
					.trim();

				const outName = `${safeId(OUT_NAME_PREFIX)}${ucfirst(id)}`;
				let outFile;
				let content;

				if (isEjs) {
					content = svg;
					outFile = path.join(_outDir, outName + '.ejs');
				}
				//
				else {
					content = `// prettier-ignore
export const ${outName} = (extraCls = null, size = ${size}, style = null) => \`${svg}\`;
`;
					outFile = path.join(_outDir, outName + '.js');
				}

				log(gray(`    ✔ ${outName}`));
				fs.writeFileSync(outFile, content);
			}
		});

		log(gray(`\nDone -> ${_outDir}\n`));
	} catch (e) {
		onError(e);
	}
}

function onError(e) {
	console.log('\n' + red(e.toString().trim()) + '\n');
	process.exit(1);
}

function help() {
	const self = path.basename(__filename);
	console.log(`
    This script will wrap (bootstrap) icon svgs as functions or ejs templates.

    ${yellow('Usage:')}
        node ${self} build [--indir ${INDIR}] [--outdir ${OUTDIR}] [--out-name-prefix ${OUT_NAME_PREFIX}] [--silent]
        node ${self} build-ejs [--indir ${INDIR}] [--outdir ${OUTDIR_EJS}] [--out-name-prefix ${OUT_NAME_PREFIX}] [--silent]

`);
	process.exit();
}

function ucfirst(str) {
	return `${str}`.charAt(0).toUpperCase() + `${str}`.slice(1);
}

function safeId(name) {
	return name
		.split(/[\/-]/)
		.filter(Boolean)
		.map((v, i) => (i ? ucfirst(v) : v))
		.join('');
}
