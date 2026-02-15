import process from 'node:process';
import { y as yargsParser, t as trimNewlines, r as redent, c as camelcaseKeys } from './dependencies.js';
import { buildOptions } from './options.js';
import { buildParserOptions } from './parser.js';
import { checkUnknownFlags, validate, checkMissingRequiredFlags } from './validate.js';

const buildResult = ({pkg: packageJson, ...options}, parserOptions) => {
	const argv = yargsParser(options.argv, parserOptions);
	let help = '';

	if (options.help) {
		help = trimNewlines((options.help || '').replace(/\t+\n*$/, ''));

		if (help.includes('\n')) {
			help = redent(help, options.helpIndent);
		}

		help = `\n${help}`;
	}

	if (options.description !== false) {
		let {description} = options;

		if (description) {
			description = help ? redent(`\n${description}\n`, options.helpIndent) : `\n${description}`;
			help = `${description}${help}`;
		}
	}

	help += '\n';

	const showHelp = code => {
		console.log(help);
		process.exit(typeof code === 'number' ? code : 2); // Default to code 2 for incorrect usage (#47)
	};

	const showVersion = () => {
		console.log(options.version);
		process.exit(0);
	};

	if (argv._.length === 0 && options.argv.length === 1) {
		if (argv.version === true && options.autoVersion) {
			showVersion();
		} else if (argv.help === true && options.autoHelp) {
			showHelp(0);
		}
	}

	const input = argv._;
	delete argv._;

	if (!options.allowUnknownFlags) {
		checkUnknownFlags(input);
	}

	const flags = camelcaseKeys(argv, {exclude: ['--', /^\w$/]});
	const unnormalizedFlags = {...flags};

	validate(flags, options);

	for (const flagValue of Object.values(options.flags)) {
		if (Array.isArray(flagValue.aliases)) {
			for (const alias of flagValue.aliases) {
				delete flags[alias];
			}
		}

		delete flags[flagValue.shortFlag];
	}

	checkMissingRequiredFlags(options.flags, flags, input);

	return {
		input,
		flags,
		unnormalizedFlags,
		pkg: packageJson,
		help,
		showHelp,
		showVersion,
	};
};

const meow = (helpText, options = {}) => {
	const parsedOptions = buildOptions(helpText, options);
	const parserOptions = buildParserOptions(parsedOptions);
	const result = buildResult(parsedOptions, parserOptions);

	process.title = result.pkg.bin ? Object.keys(result.pkg.bin).at(0) : result.pkg.name;

	return result;
};

export { meow as default };
