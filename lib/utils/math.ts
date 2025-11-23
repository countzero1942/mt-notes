import { logh } from "@/utils/log";
import { log } from "node:console";

/**
 * Gets a random integer between min-inclusive and max-inclusive
 *
 * @param minIncl Min integer inclusive
 * @param maxIncl Max integer inclusive
 * @returns Random integer in min-inclusive and max-inclusive
 */
export function randomInteger(
	minIncl: number,
	maxIncl: number
) {
	return (
		Math.floor(Math.random() * (maxIncl - minIncl + 1)) +
		minIncl
	);
}

/**
 * Gets a random floating-point Number between min-inclusive
 * and max-exclusive
 *
 * @param minIncl Min real Number inclusive
 * @param maxExcl Max real number exclusive
 * @returns Random floating-point number in min-inclusive and max-exclusive
 */
export function randomNumber(
	minIncl: number,
	maxExcl: number
) {
	return Math.random() * (maxExcl - minIncl) + minIncl;
}

/**
 * Clamps number within range of min and max.
 *
 * @param num Number to clamp
 * @param min Minimum value
 * @param max Maximum value
 * @returns Clamped number
 */
export const clamp = (
	num: number,
	min: number,
	max: number
) => Math.min(Math.max(num, min), max);

/**
 * Rounds a floating point number to `places` number
 * of fixed decimal places.
 *
 * This function can return floating point errors that are smaller
 * than the number's relative epsilon.
 *
 * Therefore compare these rounded numbers with `areEqual(a, b)`
 * which takes into account floating point errors.
 *
 * Also when converting to string use `toFixed()` function.
 *
 * See also: `precisionRound`
 *
 * @param x The number to round to fixed decimal places
 * @param places The number of decimal places to round to.
 *
 * This number can be positive or negative.
 *
 * It can be used to shift very large and very tiny numbers
 * into the rounding position and back for precision
 * rounding.
 *
 * @returns The fixed-place rounded floating point number
 */
export const fixedRound = (
	x: number,
	places: number = 0
) => {
	switch (places) {
		case 0:
			return Math.round(x);
		default:
			const pow = Math.pow(10, places);
			return Math.round(x * pow) / pow;
	}
};

/**
 * This function rounds a number according to precision, instead
 * of decimal place.
 *
 * This function can return floating point errors that are smaller
 * than the number's relative epsilon.
 *
 * Therefore compare these rounded numbers with `areEqual(a, b)`
 * which takes into account floating point errors.
 *
 * Also when converting to string use `toPrecision()` function.
 *
 * See also: `fixedRound`
 *
 * @param n The number to be rounded according to precision.
 * @param sigDigits The number of significant digits of precision (max: 15).
 * @returns The rounded number which may include floating point errors.
 * So compare numbers with `areEquals(a,b)` not `a === b`
 */
export function precisionRound(
	n: number,
	sigDigits: number
) {
	// 123,456,789 -> round(-3) -> 123,456,000
	// num-digs: 9, sig-digs: 6, round: -3
	// sig-digs - num-digs = round
	// 6 - 9 = -3
	// try: num-digs = ceil(log10)
	const clamSigDigits = clamp(sigDigits, 1, 15);
	const numDigits = Math.ceil(Math.log10(Math.abs(n)));
	const roundPlaces = clamSigDigits - numDigits;
	return fixedRound(n, roundPlaces);
}

/**
 * Gets the relative epsilon of a number based on its
 * ten-based power.
 *
 * Number.Epsilon only weeds out floating point errors
 * in the 16th digit of precision. So this is for numbers
 * with a 10-based power of -1. Therefore floor + 1 is used
 * to shift the -1 power to 0 to preserve the default epsilon
 * And this will also shift all other powers-of-ten and yield
 * the proper relative epsilon
 */
export function getLogForRelativeEpsilon(n: number) {
	/**
	 * Note: Number.Epsilon is for 15-prec numbers in: 0.1 <= n < 1
	 * So this is for numbers with a 10-based power of -1
	 * Therefore floor + 1 is used to shift the -1 power to 0 to
	 * preserve the default epsilon
	 * And this will also shift all other powers-of-ten and yeild
	 * the proper relative epsilon
	 */
	return Math.floor(Math.log10(Math.abs(n))) + 1;
}

/**
 * Gets the relative epsilon of a number based on its
 * ten-based power.
 *
 * Number.Epsilon only weeds out floating-point errors
 * in: 0.1 <= n <= 1.
 *
 * The relative epsilon is Number.Epsilon shifted to
 * the number's ten-based power. If the power is -1
 * it is multiplied by 10^0.
 *
 * @param n The number to get the relative epsilon of
 */
export function getRelativeEpsilonFromLog(logN: number) {
	return 2 * Number.EPSILON * 10 ** logN;
}

/**
 * Gets the relative epsilon of a number based on its
 * ten-based power.
 *
 * Number.Epsilon only weeds out floating-point errors
 * in: 0.1 <= n <= 1.
 *
 * The relative epsilon is Number.Epsilon shifted to
 * the number's ten-based power. If the power is -1
 * it is multiplied by 10^0.
 *
 * @param n The number to get the relative epsilon of
 * @returns The relative epsilson
 */
export function getRelativeEspilon(n: number): number {
	/**
	 * Note: Number.Epsilon is for 15-prec numbers in: 0.1 <= n < 1
	 * So this is for numbers with a 10-based power of -1
	 * Therefore floor + 1 is used to shift the -1 power to 0 to
	 * preserve the default epsilon
	 * And this will also shift all other powers-of-ten and yeild
	 * the proper relative epsilon
	 */

	// avoid log(0)! Compare against default epsilon in this case

	if (n === 0) {
		return Number.EPSILON;
	}

	const logN = getLogForRelativeEpsilon(n);
	const relEpsilon = getRelativeEpsilonFromLog(logN);
	return relEpsilon;
}

/**
 * Floating-point equality to 15 digits of precision, robust across all exponents.
 *
 * Theory:
 * - Only the first 15 significant digits of a double-precision number are
 * reliable.
 * - Any difference in the 16th digit or beyond is indistinguishable from
 * floating-point noise and is ignored.
 * - All reliably-distinguishable 15-digit numbers are treated as distinct;
 * neighbor numbers (differing only in the 16th digit or higher) are considered equal.
 * - This is a principled, information-theoretic filter, not just a tolerance
 * for floating-point error.
 *
 * Implementation:
 * - Uses a relative epsilon scaled by the base-10 exponent of the inputs.
 * - Only considers numbers equal if they are in the same base-10 order of
 * magnitude.
 * - For subnormal numbers (relativeEpsilon === 0), falls back to exact
 * equality (no floating-point error expected).
 * - Handles infinities: areEqual(Infinity, Infinity) and areEqual(-Infinity, -Infinity)
 * return true; mixed sign returns false.
 * - NaN is never equal to anything, including itself.
 *
 * Note: Only numbers in the mid-range of exponents have the full 15 digits of precision;
 * at the extreme ends (very small/large), precision drops and only leading digits are reliable.
 *
 * @param a First number to be compared
 * @param b Second number to be compared
 * @returns True if numbers are equal within 15 digits of precision.
 */
export function areEqual(a: number, b: number): boolean {
	// avoid log(0)! Compare against default epsilon in this case

	switch (true) {
		// simple equality check: also checks for 0
		case a === b:
			return true;
		// XOR: if one is zero the other is non-zero
		case a === 0 || b === 0:
			return false;
		// case: both a and b are non-zero: log(n) is safe
		default:
			const logA = getLogForRelativeEpsilon(a);
			const logB = getLogForRelativeEpsilon(b);
			if (logA !== logB) {
				// If numbers are not in the same order of magnitude,
				// they cannot be equal within floating-point error.
				return false;
			}
			const relativeEpsilon =
				getRelativeEpsilonFromLog(logA);
			// For subnormal numbers (relativeEpsilon === 0), only exact
			// equality is possible; no floating-point error margin.
			// For normal numbers, checks if difference is within the
			// scaled epsilon.
			return Math.abs(a - b) <= relativeEpsilon;
	}
}

/**
 * Floating-point safe addition.
 *
 * Theory:
 * - Only the first 15 significant digits of a double-precision number are reliable.
 * - Any difference in the 16th digit or beyond is indistinguishable from floating-point
 * noise and is ignored.
 * - This logic is inherited from 'areEqual': if the sum is within the relative epsilon
 * of zero (i.e., only the 16th digit or higher differs), it is treated as zero.
 * - This prevents the propagation of unreliable noise in arithmetic operations.
 *
 * Implementation:
 * - If the sum is within the relative epsilon of zero, returns 0 (treats as
 * indistinguishable from zero).
 * - Uses a relative epsilon scaled to the order of magnitude of the inputs.
 * - Only applies the epsilon check if both numbers are in the same order of magnitude.
 * - For subnormal results (relativeEpsilon === 0), returns the sum directly
 * (no floating-point error expected).
 * - Handles infinities and NaN according to IEEE 754/JavaScript semantics.
 * - For very large or very small numbers, precision may be less than 15 digits.
 *
 * @param a First number to add
 * @param b Second number to add
 * @returns The sum of the two numbers, with floating-point error handling.
 */
export const safeAdd = (a: number, b: number) => {
	const sum = a + b;

	if (a === 0 || b === 0) {
		// If either input is zero, return the sum directly
		// (covers infinities and NaN as well).
		return sum;
	}

	if (sum === 0 || isNaN(sum)) {
		// If the result is exactly zero or NaN, return as-is
		// (covers +Infinity + -Infinity and other special cases).
		return sum;
	}

	const logA = getLogForRelativeEpsilon(a);
	const logB = getLogForRelativeEpsilon(b);

	if (logA !== logB) {
		// If inputs are not of the same order of magnitude,
		// do not perform epsilon check.
		return sum;
	}
	const relativeEpsilon = getRelativeEpsilonFromLog(logA);
	// For subnormal numbers (relativeEpsilon === 0),
	// no floating-point error is possible.
	if (relativeEpsilon === 0) {
		return sum;
	}

	// If the sum is within the relative epsilon of zero, treat as zero.
	return Math.abs(sum) < relativeEpsilon ? 0 : sum;
};

/**
 * Tests for even numbers.
 *
 * @param n The number to test for even.
 * @returns True if the number 'n' is even
 */
export const isEven = (n: number) => n % 2 === 0;

/**
 * Adds multiple floating-point numbers safely, using safeAdd for each step.
 * Accepts a variable number of arguments via the spread operator.
 * Returns 0 for an empty array.
 *
 * @param numbers The numbers to add
 * @returns The sum, with floating-point error handling
 */
export const safeAddMany = (
	...numbers: number[]
): number => {
	if (numbers.length === 0) return 0;
	return numbers.reduce((acc, n) => safeAdd(acc, n), 0);
};

/**
 * Tests for odd numbers.
 *
 * @param n The number to test for odd.
 * @returns True if the number 'n' is odd
 */
export const isOdd = (n: number) => n % 2 === 1;

/**
 * Compares two numbers and returns the number of digits
 * that are equal. Numbers are shifted and compared
 * digit by digit from left to right. The comparison
 * stops on the first unequal digit.
 *
 * Uses math to compare digits. No use of strings.
 *
 * @param a The first number to compare
 * @param b The second number to compare
 * @param sigDigits The number of significant digits to compare.
 * Defaults to 15 if not given.
 * @returns The number of equal digits
 */
export const getDigitAccuracy = (
	a: number,
	b: number,
	sigDigits = 15
): number => {
	const logA = Math.floor(Math.log10(Math.abs(a))) + 1;
	const logB = Math.floor(Math.log10(Math.abs(b))) + 1;
	if (logA !== logB) {
		return 0;
	}
	const clamSigDigits = clamp(sigDigits, 1, 15);
	const numDigits = Math.ceil(Math.log10(Math.abs(a)));
	const roundPlaces = clamSigDigits - numDigits;

	const shiftA = Math.floor(
		Math.pow(10, roundPlaces) * Math.abs(a)
	);
	const shiftB = Math.floor(
		Math.pow(10, roundPlaces) * Math.abs(b)
	);

	let matches = 0;
	for (let i = sigDigits - 1; i >= 0; i--) {
		const digA =
			Math.floor(shiftA / Math.pow(10, i)) % 10;
		const digB =
			Math.floor(shiftB / Math.pow(10, i)) % 10;
		if (digA === digB) {
			matches++;
		} else {
			break;
		}
	}
	return matches;
};

/**
 * Checks if a number is a power of ten.
 *
 * Powers of ten are 1, 10, 100, 1000, etc.
 *
 * @param a The number to check.
 * @returns True if the number is a power of ten.
 */
export const isPowerOfTen = (a: number) => {
	const logNum = Math.log10(Math.abs(a));
	return logNum % 1 === 0;
};
