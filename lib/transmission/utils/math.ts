// lib/transmission/utils/math.ts
//
// Floating-point helpers for Transmission.
//
// Self-contained: no imports, no dependencies on the wider project, so this
// module tree-shakes cleanly into a browser bundle or an island module.
//
// ---------------------------------------------------------------------------
// THE PROBLEM
// ---------------------------------------------------------------------------
//
// A JavaScript number is an IEEE-754 double: 53 bits of mantissa, which is
// about 15.95 decimal digits. Only the first ~15 significant digits are
// reliable. Anything appearing in the 16th digit or beyond is not information
// about the value — it is an artifact of binary representation.
//
// That noise becomes visible in two ways:
//
//   1. Values that should be equal differ in the last digit.
//        0.1 + 0.2 === 0.30000000000000004
//
//   2. Sums that should cancel to exactly zero do not.
//        0.3 - 0.1 - 0.2 === -2.7755575615628914e-17
//
// Case 2 is the damaging one. A tiny non-zero where zero was expected
// propagates: it survives comparisons, it prints as "-2.78e-17" instead of
// "0", and it can flip the sign of a subsequent branch.
//
// ---------------------------------------------------------------------------
// WHY Number.EPSILON IS NOT ENOUGH
// ---------------------------------------------------------------------------
//
// Number.EPSILON (2.22e-16) is the gap between 1.0 and the next representable
// double. It is an ABSOLUTE tolerance, and it is only the right size for
// values whose magnitude is near 1 — specifically mantissas in [0.1, 1).
//
//   For n ~ 1e9,  the real gap between neighbouring doubles is ~1e-7.
//   For n ~ 1e-9, the real gap is ~1e-25.
//
// Comparing a residue at 1e9 scale against a 2.22e-16 tolerance will never
// fire; comparing one at 1e-9 scale against it will fire far too eagerly.
//
// The tolerance has to be RELATIVE — scaled to the magnitude of the values
// that produced the result.
//
// ---------------------------------------------------------------------------
// THE SCALE MODEL
// ---------------------------------------------------------------------------
//
// Numbers are binned by decade. The "decade scale" of n is the power of ten
// such that |n| lies in [10^(scale-1), 10^scale):
//
//   0.05  -> -1        5     -> 1
//   0.5   ->  0        50    -> 2
//   1.0   ->  1        12345 -> 5
//
// The relative epsilon for a scale is Number.EPSILON shifted to that decade,
// doubled to leave a little headroom for a couple of accumulated roundings:
//
//   relativeEpsilon(scale) = 2 * Number.EPSILON * 10^scale
//
// Binning by decade rather than using |n| directly keeps the tolerance
// constant within a decade, so two comparisons in the same range always get
// the same treatment. That predictability is worth the slight coarseness.
//
// ---------------------------------------------------------------------------
// WHICH SCALE TO USE
// ---------------------------------------------------------------------------
//
// This is the subtle part, and the place an earlier version of this logic got
// it wrong.
//
// Cancellation noise is proportional to the LARGEST magnitude involved in the
// computation, not to the magnitude of the result (which is ~0) and not to
// the magnitude of any one operand.
//
// A previous implementation required both operands to share a decade before
// applying the epsilon test, on the reasoning that cancellation only happens
// between similar magnitudes. That is true, but "similar magnitude" and "same
// decade" are not the same thing — two nearly-equal values straddle a decade
// boundary about as often as not:
//
//   safeAdd(1.0, -0.9999999999999999)
//     scale(1.0)              = 1
//     scale(0.9999999999999999) = 0     <- different bins
//
// With a same-decade guard, that pair is skipped and the function returns
// 1.1102230246251565e-16 instead of 0 — failing on exactly the input it
// exists to handle. Taking max(scale(a), scale(b)) fixes it, and costs
// nothing when the magnitudes genuinely differ: 1e9 + 1e-9 produces a sum far
// larger than its epsilon, so the test is a harmless no-op.
//
// ---------------------------------------------------------------------------
// WHAT THIS MODULE DOES NOT DO
// ---------------------------------------------------------------------------
//
// These functions detect and clean ZERO. They do not make floating-point
// arithmetic exact, and they do not clean up residue in non-zero results —
// formatting at output (toPrecision / toFixed) handles that, and does it
// better.
//
// Multiplication and division need none of this: they cannot manufacture a
// spurious near-zero out of non-zero operands, so ordinary `*` and `/` are
// correct, with output formatting removing any visible residue.
//
// ===========================================================================

/**
 * Doubling Number.EPSILON leaves headroom for a small number of accumulated
 * rounding steps without widening the tolerance into the 15th digit, which
 * would start discarding real information.
 */
const EPSILON_FACTOR = 2 * Number.EPSILON;

/**
 * 10^309 overflows to Infinity, so very large scales are computed in two
 * steps. Splitting at 200 keeps both intermediates comfortably finite:
 * EPSILON_FACTOR * 1e200 is about 4.4e184, and multiplying that by up to
 * 1e109 stays below Number.MAX_VALUE.
 */
const SCALE_SPLIT = 200;

/**
 * The decade scale of a number: the power of ten `s` such that
 * `|n|` lies in `[10^(s-1), 10^s)`.
 *
 * This is `floor(log10(|n|)) + 1`. The `+ 1` shifts the mantissa range
 * `[0.1, 1)` — where Number.EPSILON is the correct absolute tolerance — to a
 * scale of 0, so that `relativeEpsilonFromScale(0)` reproduces the plain
 * epsilon and every other decade scales from there.
 *
 * @param n A non-zero, finite number.
 * @returns The decade scale. Meaningless for `0` (which has no logarithm) —
 * callers must handle zero before calling.
 */
export function decadeScale(n: number): number {
	return Math.floor(Math.log10(Math.abs(n))) + 1;
}

/**
 * The relative epsilon for a given decade scale: the largest magnitude that
 * should be regarded as indistinguishable from zero at that scale.
 *
 * @param scale A decade scale, as returned by {@link decadeScale}.
 * @returns The tolerance. May be `0` for subnormal scales (below about -308),
 * where no floating-point slack exists and only exact equality is meaningful.
 */
export function relativeEpsilonFromScale(scale: number): number {
	if (scale <= SCALE_SPLIT) {
		return EPSILON_FACTOR * 10 ** scale;
	}
	// Split the exponent so neither intermediate overflows to Infinity.
	return EPSILON_FACTOR * 10 ** SCALE_SPLIT * 10 ** (scale - SCALE_SPLIT);
}

/**
 * The relative epsilon appropriate to a single number's magnitude.
 *
 * @param n The number whose scale sets the tolerance.
 * @returns The tolerance. Falls back to `Number.EPSILON` for `0`, which has
 * no decade scale.
 */
export function relativeEpsilon(n: number): number {
	if (n === 0) return Number.EPSILON;
	return relativeEpsilonFromScale(decadeScale(n));
}

/**
 * Tests whether a residue is indistinguishable from zero at a given scale.
 *
 * @param residue The value to test — typically the result of a subtraction or
 * a sum expected to cancel.
 * @param scale The decade scale of the largest magnitude that contributed to
 * `residue`. Using the result's own scale would be wrong: a cancelled result
 * is tiny by construction, so it carries no information about how much noise
 * the computation could have produced.
 * @returns `true` if `residue` lies within the relative epsilon of zero.
 */
export function isZeroAtScale(residue: number, scale: number): boolean {
	if (residue === 0) return true;
	if (!Number.isFinite(residue)) return false;

	const epsilon = relativeEpsilonFromScale(scale);
	// A zero epsilon means subnormal territory, where there is no rounding
	// slack to absorb: only an exact zero counts, and that was handled above.
	if (epsilon === 0) return false;

	return Math.abs(residue) < epsilon;
}

/**
 * Equality to the reliable precision of a double (~15 significant digits).
 *
 * Two numbers are equal when their difference falls within the relative
 * epsilon of the larger operand — that is, when they differ only in digits
 * that carry no information.
 *
 * Non-finite handling follows IEEE-754: `NaN` is equal to nothing including
 * itself, and infinities are equal only to infinities of the same sign (both
 * of which fall out of the `a === b` fast path and the finiteness check).
 *
 * @param a First number.
 * @param b Second number.
 * @returns `true` if the two are equal within floating-point noise.
 */
export function areEqual(a: number, b: number): boolean {
	// Covers exact equality, both-zero, and matching infinities.
	if (a === b) return true;

	// Any remaining non-finite pair is unequal: NaN against anything, or
	// infinities of opposite sign, or an infinity against a finite value.
	if (!Number.isFinite(a) || !Number.isFinite(b)) return false;

	// Exactly one is zero. The other is non-zero, so the difference is the
	// non-zero value itself; test it against its own scale.
	if (a === 0 || b === 0) {
		const nonZero = a === 0 ? b : a;
		return isZeroAtScale(nonZero, decadeScale(nonZero));
	}

	// The larger operand sets the tolerance. Note this deliberately does NOT
	// require the two to share a decade: 0.9999999999999999 and
	// 1.0000000000000002 differ only in the 16th digit yet fall in different
	// decades, and must still compare equal.
	const scale = Math.max(decadeScale(a), decadeScale(b));
	return isZeroAtScale(a - b, scale);
}

/**
 * Addition that collapses a cancelled result to exactly `0`.
 *
 * When two values of similar magnitude and opposite sign are added, the true
 * sum may be zero while the floating-point sum is a residue in the 16th digit
 * or beyond. That residue is noise, not data, and is replaced by `0`.
 *
 * Non-finite inputs pass through with ordinary IEEE semantics.
 *
 * @param a First addend.
 * @param b Second addend.
 * @returns `a + b`, or `0` if that sum is within the relative epsilon of zero.
 */
export function safeAdd(a: number, b: number): number {
	const sum = a + b;

	// Nothing to clean: an exact zero is already exact, and non-finite results
	// must not be rewritten.
	if (sum === 0 || !Number.isFinite(sum)) return sum;

	// Adding to zero cannot cancel — the result is the other operand exactly.
	if (a === 0 || b === 0) return sum;

	const scale = Math.max(decadeScale(a), decadeScale(b));
	return isZeroAtScale(sum, scale) ? 0 : sum;
}

/**
 * Subtraction that collapses a cancelled result to exactly `0`.
 *
 * @param a Minuend.
 * @param b Subtrahend.
 * @returns `a - b`, or `0` if that difference is within the relative epsilon
 * of zero.
 */
export function safeSubtract(a: number, b: number): number {
	return safeAdd(a, -b);
}

/**
 * Sums a list of numbers with compensated summation, then collapses a
 * cancelled total to exactly `0`.
 *
 * Two problems are solved here that a naive `reduce(safeAdd)` does not solve:
 *
 * 1. **Error accumulation.** Each ordinary addition rounds, and over many
 *    terms those roundings compound. This uses Neumaier's variant of Kahan
 *    summation, which carries a running compensation term holding the low-order
 *    bits lost at each step and adds them back at the end. Neumaier's form is
 *    used rather than plain Kahan because it also handles the case where the
 *    incoming term is larger than the running total — which plain Kahan gets
 *    wrong, and which is common when a list is not sorted by magnitude.
 *
 * 2. **Premature zeroing.** Folding `safeAdd` across the list would test for
 *    zero at every intermediate step, using only the two operands at hand.
 *    An intermediate that legitimately cancels to zero mid-way would then
 *    discard the scale information needed to judge the final result. Instead
 *    the largest magnitude seen anywhere in the computation — across both the
 *    input terms and the running partial sums — is tracked, and a single zero
 *    test is applied at the end.
 *
 * @param values The numbers to sum.
 * @returns The compensated sum, or `0` if that total is within the relative
 * epsilon of the largest magnitude involved. Returns `0` for an empty list —
 * the additive identity.
 */
export function safeSum(...values: number[]): number {
	return safeSumAll(values);
}

/**
 * Array form of {@link safeSum}, for callers that already hold an array and
 * would otherwise spread it.
 *
 * @param values The numbers to sum.
 * @returns The compensated sum, with a cancelled total collapsed to `0`.
 */
export function safeSumAll(values: readonly number[]): number {
	if (values.length === 0) return 0;

	let sum = 0;
	// Low-order bits discarded by each addition, accumulated and restored at
	// the end.
	let compensation = 0;
	// The largest magnitude seen anywhere in the computation, which sets the
	// tolerance for the final zero test.
	let maxMagnitude = 0;
	let allFinite = true;

	for (const value of values) {
		if (!Number.isFinite(value)) {
			allFinite = false;
			sum += value;
			continue;
		}

		const magnitude = Math.abs(value);
		if (magnitude > maxMagnitude) maxMagnitude = magnitude;

		const next = sum + value;

		// Recover the bits lost in `sum + value`. Which operand is larger
		// determines which subtraction recovers them, hence the branch.
		if (Math.abs(sum) >= magnitude) {
			compensation += sum - next + value;
		} else {
			compensation += value - next + sum;
		}

		sum = next;

		const partialMagnitude = Math.abs(sum);
		if (partialMagnitude > maxMagnitude) maxMagnitude = partialMagnitude;
	}

	// A non-finite term poisons the total; IEEE semantics decide the result and
	// no cleaning applies.
	if (!allFinite) return sum + compensation;

	const total = sum + compensation;

	if (total === 0 || !Number.isFinite(total)) return total;
	if (maxMagnitude === 0) return total;

	return isZeroAtScale(total, decadeScale(maxMagnitude)) ? 0 : total;
}

// ===========================================================================
// ROUNDING
// ---------------------------------------------------------------------------
//
// Rounding a double at a decimal position is not the simple operation it
// appears to be, because the value being rounded is almost never the decimal
// the author wrote.
//
// The double nearest 1.005 is
//
//   1.00499999999999989341858963598497211933135986328125
//
// which is genuinely BELOW 1.005. So `(1.005).toFixed(2)` returns "1.00", and
// it is right to: the value it was handed rounds down. `toFixed` is not
// truncating — it rounds half away from zero, so `(2.5).toFixed(0)` is "3" and
// `(-2.5).toFixed(0)` is "-3", which is the behaviour money wants and is
// better than `Math.round`, whose `Math.round(-0.5)` gives `-0`.
//
// The problem is purely that the binary value carries no record of which
// decimal produced it. Rounding it "up first" cannot help, because there is
// nothing to consult.
//
// What CAN be recovered is the author's intent, approximately, by nudging the
// value up by one relative epsilon before rounding. A value sitting a few bits
// below a half IS that half as far as 15 reliable digits can tell, and two
// separate causes put it there: the binary approximation of the author's
// literal, and error accumulated through earlier arithmetic. One nudge covers
// both, because both are of the same order — a fraction of an ULP — while the
// nudge is several ULP.
//
// This gives decimal-intent rounding: the digit sequence the author wrote, or
// computed to within 15 reliable digits, is what gets rounded, and half always
// goes away from zero.
// ===========================================================================

/**
 * Moves a number's decimal point by a whole number of places.
 *
 * Negative shifts divide by a positive power rather than multiplying by a
 * negative one: `10 ** 2` is exactly representable while `10 ** -2` is not, so
 * dividing costs one correctly-rounded operation where multiplying would
 * compound the power's own representation error into the product.
 *
 * Powers of ten are exact up to `10 ** 22`. Beyond that the shift carries a
 * small error of its own, but a shift that large is rounding at a decimal
 * place a double cannot resolve anyway.
 *
 * @param n A finite number.
 * @param shift Places to move the decimal point; positive moves right.
 * @returns The shifted value, or `Infinity` if the shift overflows.
 */
function shiftDecimalPoint(n: number, shift: number): number {
	return shift >= 0 ? n * 10 ** shift : n / 10 ** -shift;
}

/**
 * Rounds to a fixed number of decimal places, rounding the decimal the author
 * wrote rather than its binary approximation.
 *
 * Half always rounds away from zero, symmetrically for positive and negative
 * values — the rule used for money everywhere.
 *
 *     fixedRound(1.005, 2)   ->  1.01
 *     fixedRound(-1.005, 2)  -> -1.01
 *     fixedRound(2.675, 2)   ->  2.68
 *     fixedRound(2.5, 0)     ->  3
 *
 * Plain `toFixed` returns 1.00, -1.00 and 2.67 for the first three, because it
 * rounds the binary value. Arithmetic rounding (`Math.round(x * 100) / 100`)
 * gets those right or wrong depending on the value and additionally lands on
 * whichever double the scaling and division happen to produce, often with a
 * long tail.
 *
 * @param n The number to round.
 * @param places Decimal places. Negative values round to the left of the
 * decimal point: `-3` rounds to the nearest thousand.
 * @returns The rounded value, or `n` unchanged if it is not finite or if the
 * requested shift overflows the exponent range.
 */
export function fixedRound(n: number, places = 0): number {
	if (!Number.isFinite(n)) return n;
	if (n === 0) return 0;

	const shift = Math.trunc(places);
	const sign = n < 0 ? -1 : 1;

	// Round the magnitude so that halves go away from zero. Math.round alone is
	// asymmetric: it rounds halves toward positive infinity, so -0.5 becomes -0.
	const shifted = shiftDecimalPoint(Math.abs(n), shift);
	if (!Number.isFinite(shifted)) return n;

	// Nudge up by one relative epsilon before rounding. Shifting the decimal
	// point introduces a fraction of an ULP of its own error, and the value may
	// already sit a little below the half from its literal's binary form or
	// from earlier arithmetic. The nudge is several ULP, so it absorbs all
	// three. Anything it moves across a boundary differed from that boundary
	// beyond the reliable precision of a double.
	const nudged = shifted + relativeEpsilon(shifted);

	return sign * shiftDecimalPoint(Math.round(nudged), -shift);
}

/**
 * Rounds to a number of significant digits, rounding the decimal the author
 * wrote rather than its binary approximation.
 *
 * Implemented in terms of {@link fixedRound}: the decimal exponent is read
 * exactly from the number's own exponential form, then the significant-digit
 * request is converted into a decimal-place request.
 *
 *     precisionRound(1.005, 3)    ->  1.01
 *     precisionRound(123456, 3)   ->  123000
 *     precisionRound(0.00012345, 3) -> 0.000123
 *
 * @param n The number to round.
 * @param sigDigits Significant digits. Clamped to 1..15, since digits beyond
 * the 15th carry no reliable information in a double — which is also why
 * `.R:n` caps at 15.
 * @returns The rounded value, or `n` unchanged if it is not finite.
 */
export function precisionRound(n: number, sigDigits: number): number {
	if (!Number.isFinite(n)) return n;
	if (n === 0) return 0;

	const digits = Math.min(Math.max(Math.trunc(sigDigits), 1), 15);

	// Read the decimal exponent from the string form rather than via
	// Math.log10, which is inexact for some powers of ten and would put the
	// decimal point one place out. This is a read, not arithmetic, so it costs
	// nothing in precision.
	const exponent = Number(n.toExponential().split("e")[1]);

	return fixedRound(n, digits - 1 - exponent);
}
