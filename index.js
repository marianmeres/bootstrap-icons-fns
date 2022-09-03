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
		default:
			throw new Error(`Command "${COMMAND}" not found`);
	}
}

async function build() {
	try {
		const _outDir = path.join(process.cwd(), OUTDIR);
		totalist(INDIR, (name, abs, stats) => {
			if (/\.svg/i.test(name)) {
				const id = name
					.replace(/\.svg$/, '')
					.split(/[\/-]/)
					.filter(Boolean)
					.map((v, i) => (i ? ucfirst(v) : v))
					.join('');

				const svg = fs
					.readFileSync(abs, 'utf8')
					.replace(/[\n\r]/g, ' ')
					.replace(' xmlns="http://www.w3.org/2000/svg"', '')
					.replace(/ class="[^"]+"/, ' class="${extraCls || \'\'}"')
					.replace(/ width="[^"]+"/, ' width="${size}"')
					.replace(/ height="[^"]+"/, ' height="${size}"')
					.replace(/>\s+</g, '><')
					.trim();

				const fnName = `bsIcon${ucfirst(id)}`;
				const fn = `// prettier-ignore
export const ${fnName} = (extraCls = null, size = 16) => \`${svg}\`;
`;

				mkdirp.sync(_outDir);
				const outFile = path.join(_outDir, fnName + '.js');

				log(gray(`    ✔ ${fnName}`));
				fs.writeFileSync(outFile, fn);
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
    This script will wrap (bootstrap) icon svgs as functions.
    ${yellow('Usage:')}
        node ${self} build [--indir ${INDIR}] [--outdir ${OUTDIR}] [--silent]

`);
	process.exit();
}

function ucfirst(str) {
	return `${str}`.charAt(0).toUpperCase() + `${str}`.slice(1);
}

function escapeRegex(str) {
	return `${str}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceMap(str, map, ignoreCase = false) {
	if (ignoreCase) {
		map = Object.entries(map).reduce(
			(memo, [k, v]) => ({ ...memo, [k.toLowerCase()]: v }),
			{}
		);
	}
	let patterns = [];
	Object.keys(map).forEach((k) => patterns.push(escapeRegex(k)));
	let regExp = new RegExp(patterns.join('|'), 'g' + (ignoreCase ? 'i' : ''));
	return str.replace(regExp, (match) => {
		if (ignoreCase) {
			match = match.toLowerCase();
		}
		let replaced = typeof map[match] === 'function' ? map[match]() : map[match];
		if (replaced === null || replaced === void 0) {
			return '';
		}
		return replaced;
	});
}
