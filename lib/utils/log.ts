import { getType, toReadonlyTuple } from "@/utils/types";
import chalk from "chalk";

export const getArrowLabel = (
	label: string,
	indent: number = 0
) => {
	"══▶";
};

export const cls = () => {
	process.stdout.write("\x1Bc");
};

/**
 * Logs a horizontal line of a given length.
 * @param {number} [length=50] The length of the line.
 */
export const logln = (length: number = 50) =>
	console.log(chalk.gray("─".repeat(length)));

/**
 * Logs a double horizontal line of a given length.
 * @param {number} [length=50] The length of the line.
 */
export const logdln = (length: number = 50) =>
	console.log(chalk.gray("═".repeat(length)));

/**
 * Logs data to the console. The data is passed directly to console.log.
 * @param {...any} data The data to log.
 */
export const log = (...data: any) => {
	console.log(...data);
};

export const logobj = (obj: any) => {
	const type = getType(obj);

	switch (type) {
		case "Object":
		case "Class":
		case "Array":
			console.dir(obj, {
				depth: 20,
				colors: true,
				maxArrayLength: 1000,
				numericSeparator: true,
			});
			return;

		default:
			console.log(obj);
			break;
	}
};

/**
 * Logs a new line to the console.
 */
export const logn = () => console.log();

/**
 * Logs a header with a line above and below it.
 *
 * @param header The header to log.
 */
export const logh = (
	header: string,
	newLineAbove: boolean = true
) => {
	const line = "═".repeat(header.length);
	if (newLineAbove) {
		logn();
	}
	log(chalk.gray(line));
	log(chalk.magentaBright(header));
	log(chalk.gray(line));
};

/**
 * Logs a header with a line above and below it.
 *
 * Logs a newline after.
 *
 * @param header The header to log.
 */
export const loghn = (header: string) => {
	logh(header);
	log();
};

/**
 * Logs the given label and arguments to the console, indented with console.group, and
 * console.groupEnd() after.
 *
 * @param label The label to use as the group label.
 * @param args The arguments to log.
 */
export const logg = (label: string, ...args: any[]) => {
	console.group(`${label}:`);
	for (const arg of args) {
		logobj(arg);
	}
	console.groupEnd();
};

/**
 * Logs the given label and arguments to the console, indented with console.group, and
 * console.groupEnd() after.
 *
 * The label is prepended with "══▶" to make it stand out.
 *
 * @param label The label to use as the group label.
 * @param args The arguments to log.
 */
export const logag = (label: string, ...args: any[]) => {
	console.group(`══▶ ${label}:`);
	for (const arg of args) {
		logobj(arg);
	}
	console.groupEnd();
};

/**
 * Logs the given label and arguments to the console, indented with console.group.
 * Useful for grouping related log statements.
 *
 * Logs a newline after.
 *
 * @param label The label to use for the group.
 * @param args The arguments to log.
 */
export const loggn = (label: string, ...args: any[]) => {
	logg(label, ...args);
	log();
};

/**
 * Logs the given label and arguments to the console, indented with console.group
 * Useful for grouping related log statements.
 *
 * The label is prepended with "══▶" to make it stand out.
 *
 * Logs a newline after.
 *
 * @param label The label to use for the group.
 * @param args The arguments to log.
 */
export const logagn = (label: string, ...args: any[]) => {
	logag(label, ...args);
	log();
};

const SHORT_LINE = 25;

const MEDIUM_LINE = 50;

const LONG_LINE = 75;

/**
 * Logs a horizontal line of 50 dashes to the console.
 */
export const div = () => logln(MEDIUM_LINE);

/**
 * Logs a long horizontal line of 80 dashes to the console.
 */
export const divl = () => logln(LONG_LINE);

/**
 * Logs a short horizontal line of 25 dashes to the console.
 */
export const divs = () => logln(SHORT_LINE);

/**
 * Logs a medium double horizontal line of 50 double-width chars to the console.
 */
export const ddiv = () => logdln(MEDIUM_LINE);

/**
 * Logs a long double horizontal line of 80 double-width chars to the console.
 */
export const ddivl = () => logdln(LONG_LINE);

/**
 * Logs a short double horizontal line of 25 double-width chars to the console.
 */
export const ddivs = () => logdln(SHORT_LINE);

/**
 * Logs a medium horizontal line of 50 dashes to the console.
 *
 * Logs a newline after.
 */
export const divn = () => {
	div();
	logn();
};

/**
 * Logs a long horizontal line of 80 dashes to the console.
 *
 * Logs a newline after.
 */
export const divln = () => {
	divl();
	logn();
};

/**
 * Logs a short horizontal line of 25 dashes to the console.
 *
 * Logs a newline after.
 */
export const divsn = () => {
	divs();
	logn();
};

/**
 * Logs a medium double horizontal line of 50 double-width chars to the console.
 *
 * Logs a newline after.
 */
export const ddivn = () => {
	ddiv();
	logn();
};

/**
 * Logs a long double horizontal line of 80 double-width chars to the console.
 *
 * Logs a newline after.
 */
export const ddivln = () => {
	ddivl();
	logn();
};

/**
 * Logs a short double horizontal line of 25 double-width chars to the console.
 *
 * Logs a newline after.
 */
export const ddivsn = () => {
	ddivs();
	logn();
};

const toDisplayString = (a: any): string => {
	switch (a) {
		case null:
			return "<null>";
		case undefined:
			return "<undefined>";
		default:
			try {
				return typeof a === "string" ? a : a.toString();
			} catch {
				return "<error>";
			}
	}
};

export const alignRight = (a: any, max_length: number) => {
	const s = toDisplayString(a);
	const pad = max_length - s.length;
	return pad > 0
		? s.padStart(max_length, " ")
		: s.slice(-max_length);
};

export const alignLeft = (a: any, max_length: number) => {
	const s = toDisplayString(a);
	const pad = max_length - s.length;
	return pad > 0
		? s.padEnd(max_length, " ")
		: s.slice(0, max_length);
};
