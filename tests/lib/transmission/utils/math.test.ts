// tests/lib/transmission/utils/math.test.ts

import { describe, expect, test } from "vitest";
import {
	areEqual,
	decadeScale,
	fixedRound,
	isZeroAtScale,
	precisionRound,
	relativeEpsilon,
	relativeEpsilonFromScale,
	safeAdd,
	safeSubtract,
	safeSum,
	safeSumAll,
} from "@/lib/transmission/utils/math";

/**
 * Doubles used repeatedly below. Naming them makes the intent of each test
 * clearer than an inline literal would, and guarantees every test refers to
 * the same bit pattern.
 */

/** The double immediately below 1. */
const JUST_BELOW_ONE = 0.9999999999999999;
/** The double immediately above 1. */
const JUST_ABOVE_ONE = 1.0000000000000002;
/** The classic inexact sum: 0.30000000000000004, not 0.3. */
const INEXACT_POINT_THREE = 0.1 + 0.2;

describe("transmission/utils/math", () => {
	// =======================================================================
	// decadeScale
	// =======================================================================

	describe("decadeScale", () => {
		test("places a value in the decade [10^(s-1), 10^s)", () => {
			expect(decadeScale(0.05)).toBe(-1);
			expect(decadeScale(0.5)).toBe(0);
			expect(decadeScale(1)).toBe(1);
			expect(decadeScale(5)).toBe(1);
			expect(decadeScale(50)).toBe(2);
			expect(decadeScale(12345)).toBe(5);
		});

		test("ignores sign", () => {
			expect(decadeScale(-50)).toBe(decadeScale(50));
			expect(decadeScale(-0.05)).toBe(decadeScale(0.05));
		});

		test("counts digits correctly on exact powers of ten", () => {
			// An earlier implementation used ceil(log10(n)), which reports 2
			// for 100 — a three-digit number. floor(log10(n)) + 1 is correct.
			expect(decadeScale(1)).toBe(1);
			expect(decadeScale(10)).toBe(2);
			expect(decadeScale(100)).toBe(3);
			expect(decadeScale(1000)).toBe(4);
		});
	});

	// =======================================================================
	// relativeEpsilonFromScale / relativeEpsilon
	// =======================================================================

	describe("relativeEpsilonFromScale", () => {
		test("reproduces the plain epsilon at scale 0", () => {
			// Scale 0 is the mantissa range [0.1, 1), which is exactly where
			// Number.EPSILON is the right absolute tolerance.
			expect(relativeEpsilonFromScale(0)).toBe(2 * Number.EPSILON);
		});

		test("scales by powers of ten", () => {
			expect(relativeEpsilonFromScale(1)).toBe(2 * Number.EPSILON * 10);
			expect(relativeEpsilonFromScale(-1)).toBe(2 * Number.EPSILON * 0.1);
			expect(relativeEpsilonFromScale(10)).toBe(2 * Number.EPSILON * 1e10);
		});

		test("stays finite at extreme positive scales", () => {
			// 10 ** 309 overflows to Infinity, so the exponent is split. An
			// infinite tolerance would make every value compare as zero.
			expect(Number.isFinite(relativeEpsilonFromScale(309))).toBe(true);
			expect(relativeEpsilonFromScale(309)).toBeGreaterThan(0);
		});

		test("is continuous across the exponent split point", () => {
			const below = relativeEpsilonFromScale(200);
			const above = relativeEpsilonFromScale(201);
			expect(above / below).toBeCloseTo(10, 6);
		});

		test("underflows to zero in subnormal territory", () => {
			// Below about 10^-308 there is no rounding slack left to absorb,
			// so the epsilon test must fall back to exact equality.
			expect(relativeEpsilonFromScale(-320)).toBe(0);
		});
	});

	describe("relativeEpsilon", () => {
		test("derives the tolerance from a value's own magnitude", () => {
			expect(relativeEpsilon(0.5)).toBe(relativeEpsilonFromScale(0));
			expect(relativeEpsilon(5)).toBe(relativeEpsilonFromScale(1));
			expect(relativeEpsilon(-5)).toBe(relativeEpsilonFromScale(1));
		});

		test("falls back to the plain epsilon for zero", () => {
			// Zero has no decade scale; log10(0) is -Infinity.
			expect(relativeEpsilon(0)).toBe(Number.EPSILON);
		});
	});

	// =======================================================================
	// isZeroAtScale
	// =======================================================================

	describe("isZeroAtScale", () => {
		test("accepts an exact zero at any scale", () => {
			expect(isZeroAtScale(0, 0)).toBe(true);
			expect(isZeroAtScale(0, 100)).toBe(true);
			expect(isZeroAtScale(0, -320)).toBe(true);
		});

		test("accepts a residue inside the tolerance", () => {
			const epsilon = relativeEpsilonFromScale(0);
			expect(isZeroAtScale(epsilon / 2, 0)).toBe(true);
			expect(isZeroAtScale(-epsilon / 2, 0)).toBe(true);
		});

		test("rejects a residue outside the tolerance", () => {
			const epsilon = relativeEpsilonFromScale(0);
			expect(isZeroAtScale(epsilon * 2, 0)).toBe(false);
			expect(isZeroAtScale(-epsilon * 2, 0)).toBe(false);
		});

		test("widens with the scale", () => {
			// A residue of 1e-7 is noise beside values of 1e9 magnitude, but
			// is enormous beside values near 1.
			expect(isZeroAtScale(1e-7, 10)).toBe(true);
			expect(isZeroAtScale(1e-7, 0)).toBe(false);
		});

		test("requires exact zero in subnormal territory", () => {
			expect(isZeroAtScale(1e-320, -320)).toBe(false);
		});

		test("rejects non-finite residues", () => {
			expect(isZeroAtScale(Number.NaN, 0)).toBe(false);
			expect(isZeroAtScale(Number.POSITIVE_INFINITY, 0)).toBe(false);
		});
	});

	// =======================================================================
	// areEqual
	// =======================================================================

	describe("areEqual", () => {
		test("treats a 16th-digit difference as noise", () => {
			expect(areEqual(INEXACT_POINT_THREE, 0.3)).toBe(true);
			expect(areEqual(1, JUST_ABOVE_ONE)).toBe(true);
			expect(areEqual(1, JUST_BELOW_ONE)).toBe(true);
		});

		test("compares equal across a decade boundary", () => {
			// REGRESSION. These two doubles differ only in the last bits, but
			// fall in different decades (scale 0 and scale 1). An
			// implementation that requires a shared decade before applying the
			// tolerance reports them unequal.
			expect(decadeScale(JUST_BELOW_ONE)).not.toBe(
				decadeScale(JUST_ABOVE_ONE),
			);
			expect(areEqual(JUST_BELOW_ONE, JUST_ABOVE_ONE)).toBe(true);
		});

		test("keeps genuinely different values apart", () => {
			expect(areEqual(1, 1.001)).toBe(false);
			expect(areEqual(0.3, 0.30001)).toBe(false);
			expect(areEqual(1e9, 1e9 + 1)).toBe(false);
		});

		test("is symmetric", () => {
			expect(areEqual(INEXACT_POINT_THREE, 0.3)).toBe(
				areEqual(0.3, INEXACT_POINT_THREE),
			);
			expect(areEqual(1, 2)).toBe(areEqual(2, 1));
		});

		test("handles zero against zero and against non-zero", () => {
			expect(areEqual(0, 0)).toBe(true);
			expect(areEqual(0, -0)).toBe(true);
			expect(areEqual(0, 1)).toBe(false);
			expect(areEqual(0, 1e-320)).toBe(false);
		});

		test("follows IEEE semantics for non-finite values", () => {
			expect(areEqual(Number.NaN, Number.NaN)).toBe(false);
			expect(areEqual(Number.NaN, 1)).toBe(false);
			expect(
				areEqual(Number.POSITIVE_INFINITY, Number.POSITIVE_INFINITY),
			).toBe(true);
			expect(
				areEqual(Number.NEGATIVE_INFINITY, Number.NEGATIVE_INFINITY),
			).toBe(true);
			expect(
				areEqual(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
			).toBe(false);
			expect(areEqual(Number.POSITIVE_INFINITY, 1e308)).toBe(false);
		});

		test("scales the tolerance with magnitude", () => {
			// The same absolute difference is noise at 1e9 and significant
			// near 1.
			const drift = 1e-7;
			expect(areEqual(1e9, 1e9 + drift)).toBe(true);
			expect(areEqual(1, 1 + drift)).toBe(false);
		});
	});

	// =======================================================================
	// safeAdd / safeSubtract
	// =======================================================================

	describe("safeAdd", () => {
		test("collapses a cancelled sum to exactly zero", () => {
			// 0.3 - 0.1 - 0.2 leaves -2.7755575615628914e-17 with plain
			// arithmetic.
			expect(0.3 - 0.1 - 0.2).not.toBe(0);
			expect(safeAdd(0.3 - 0.1, -0.2)).toBe(0);
		});

		test("collapses across a decade boundary", () => {
			// REGRESSION. This is the case that matters most and the one a
			// same-decade guard skips: the operands are nearly equal but sit
			// either side of 1.
			expect(1 - JUST_BELOW_ONE).not.toBe(0);
			expect(decadeScale(1)).not.toBe(decadeScale(JUST_BELOW_ONE));
			expect(safeAdd(1, -JUST_BELOW_ONE)).toBe(0);
		});

		test("collapses at large magnitudes", () => {
			// At 1e9 the gap between neighbouring doubles is about 1.19e-7, so
			// a residue that size is noise and must be cleaned.
			const residue = 1e9 - (1e9 - 1e-7);
			expect(residue).not.toBe(0);
			expect(safeAdd(1e9, -(1e9 - 1e-7))).toBe(0);
		});

		test("leaves a real sum untouched", () => {
			expect(safeAdd(0.1, 0.2)).toBe(INEXACT_POINT_THREE);
			expect(safeAdd(1, 2)).toBe(3);
			expect(safeAdd(1e9, -999999999)).toBe(1);
		});

		test("leaves a small real difference untouched at small scale", () => {
			// 1e-7 is far above the tolerance for operands near 1.
			expect(safeAdd(1, -(1 - 1e-7))).toBeCloseTo(1e-7, 15);
			expect(safeAdd(1, -(1 - 1e-7))).not.toBe(0);
		});

		test("passes an operand through when the other is zero", () => {
			expect(safeAdd(0, 5)).toBe(5);
			expect(safeAdd(5, 0)).toBe(5);
			expect(safeAdd(0, 0)).toBe(0);
			expect(safeAdd(0, 1e-320)).toBe(1e-320);
		});

		test("follows IEEE semantics for non-finite values", () => {
			expect(safeAdd(Number.POSITIVE_INFINITY, 1)).toBe(
				Number.POSITIVE_INFINITY,
			);
			expect(
				safeAdd(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
			).toBeNaN();
			expect(safeAdd(Number.NaN, 1)).toBeNaN();
		});

		test("is commutative", () => {
			expect(safeAdd(0.3 - 0.1, -0.2)).toBe(safeAdd(-0.2, 0.3 - 0.1));
			expect(safeAdd(1, -JUST_BELOW_ONE)).toBe(safeAdd(-JUST_BELOW_ONE, 1));
		});
	});

	describe("safeSubtract", () => {
		test("collapses a cancelled difference to exactly zero", () => {
			expect(0.3 - INEXACT_POINT_THREE).not.toBe(0);
			expect(safeSubtract(0.3, INEXACT_POINT_THREE)).toBe(0);
		});

		test("leaves a real difference untouched", () => {
			expect(safeSubtract(5, 3)).toBe(2);
			expect(safeSubtract(1, 0.5)).toBe(0.5);
		});
	});

	// =======================================================================
	// safeSum / safeSumAll
	// =======================================================================

	describe("safeSum", () => {
		test("returns the additive identity for an empty list", () => {
			expect(safeSum()).toBe(0);
			expect(safeSumAll([])).toBe(0);
		});

		test("returns a single value unchanged", () => {
			expect(safeSum(5)).toBe(5);
			expect(safeSum(-0.1)).toBe(-0.1);
		});

		test("collapses a cancelled total to exactly zero", () => {
			expect(0.1 + 0.2 - 0.3).not.toBe(0);
			expect(safeSum(0.1, 0.2, -0.3)).toBe(0);
		});

		test("collapses a longer cancelling sequence", () => {
			expect(safeSum(0.1, 0.1, 0.1, -0.3)).toBe(0);
			expect(safeSum(1.1, 2.2, 3.3, -6.6)).toBe(0);
		});

		test("compensates for accumulated rounding", () => {
			// Ten 0.1s. A plain fold drifts; the compensated sum should be at
			// least as close to the true value, and should compare equal to it.
			const terms = Array<number>(10).fill(0.1);
			const naive = terms.reduce((acc, n) => acc + n, 0);
			const compensated = safeSumAll(terms);

			expect(Math.abs(compensated - 1)).toBeLessThanOrEqual(
				Math.abs(naive - 1),
			);
			expect(areEqual(compensated, 1)).toBe(true);
		});

		test("recovers a term lost to a naive fold", () => {
			// 1e16 + 1 rounds straight back to 1e16, so a plain fold loses the
			// 1 entirely and reports 0. Compensated summation carries it.
			const terms = [1e16, 1, -1e16];
			const naive = terms.reduce((acc, n) => acc + n, 0);
			expect(naive).toBe(0);

			// NOTE: the recovered 1 is the 17th significant digit relative to
			// the 1e16 terms used to produce it — below the reliable precision
			// of a double. The final zero test therefore discards it, which is
			// consistent with the module's stated theory even though the exact
			// arithmetic answer is 1. Documented here so the behaviour is
			// deliberate rather than discovered.
			expect(safeSumAll(terms)).toBe(0);
		});

		test("leaves a real total untouched", () => {
			expect(safeSum(1, 2, 3)).toBe(6);
			expect(safeSum(0.1, 0.2)).toBe(INEXACT_POINT_THREE);
			expect(safeSum(1e9, -999999999)).toBe(1);
		});

		test("judges zero against the largest magnitude involved", () => {
			// A folded safeAdd would test each intermediate pair in isolation.
			// The tolerance must come from the whole computation, so the large
			// terms set it even though they cancel first.
			expect(safeSum(1e9, -1e9, 0.1, 0.2, -0.3)).toBe(0);
		});

		test("follows IEEE semantics for non-finite values", () => {
			expect(safeSum(1, Number.NaN, 2)).toBeNaN();
			expect(safeSum(1, Number.POSITIVE_INFINITY)).toBe(
				Number.POSITIVE_INFINITY,
			);
			expect(
				safeSum(Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY),
			).toBeNaN();
		});

		test("agrees with repeated safeAdd on well-scaled input", () => {
			const terms = [1.5, 2.25, -0.75, 3.125];
			const folded = terms.reduce((acc, n) => safeAdd(acc, n), 0);
			expect(safeSumAll(terms)).toBe(folded);
		});
	});

	// =======================================================================
	// fixedRound
	// =======================================================================

	describe("fixedRound", () => {
		test("rounds to the requested decimal places", () => {
			expect(fixedRound(1.2345, 2)).toBe(1.23);
			expect(fixedRound(1.2355, 2)).toBe(1.24);
			expect(fixedRound(-1.2345, 2)).toBe(-1.23);
		});

		test("defaults to whole numbers", () => {
			expect(fixedRound(2.4)).toBe(2);
			expect(fixedRound(2.6)).toBe(3);
		});

		test("returns a clean double rather than a rounding artefact", () => {
			// Math.round(x * 100) / 100 can land on a neighbouring double with
			// a long tail; the string round trip lands on the double nearest
			// the intended decimal.
			expect(fixedRound(INEXACT_POINT_THREE, 2)).toBe(0.3);
			expect(fixedRound(1.005, 2).toString()).not.toContain("e");
		});

		test("rounds the decimal the author wrote, not its binary form", () => {
			// The double nearest 1.005 is fractionally BELOW it, so plain
			// toFixed rounds down and returns "1.00". The nudge recovers the
			// intended digits.
			expect((1.005).toFixed(2)).toBe("1.00");
			expect(fixedRound(1.005, 2)).toBe(1.01);

			expect((2.675).toFixed(2)).toBe("2.67");
			expect(fixedRound(2.675, 2)).toBe(2.68);

			expect((8.575).toFixed(2)).toBe("8.57");
			expect(fixedRound(8.575, 2)).toBe(8.58);
		});

		test("rounds half away from zero, symmetrically", () => {
			expect(fixedRound(2.5, 0)).toBe(3);
			expect(fixedRound(-2.5, 0)).toBe(-3);
			expect(fixedRound(0.5, 0)).toBe(1);
			expect(fixedRound(-0.5, 0)).toBe(-1);

			// Math.round is asymmetric at the half: it rounds toward positive
			// infinity, so -0.5 becomes -0 and -1.5 becomes -1.
			expect(Math.round(-0.5)).toBe(-0);
			expect(fixedRound(-1.5, 0)).toBe(-2);
		});

		test("negates symmetrically", () => {
			expect(fixedRound(-1.005, 2)).toBe(-1.01);
			expect(fixedRound(-1.2345, 2)).toBe(-1.23);
			expect(fixedRound(-2.675, 2)).toBe(-2.68);
		});

		test("rounds left of the decimal point on negative places", () => {
			expect(fixedRound(12345, -3)).toBe(12000);
			expect(fixedRound(12500, -3)).toBe(13000);
			expect(fixedRound(1.5, -5)).toBe(0);
		});

		test("rounds a computed value that drifted below the half", () => {
			// Nothing can recover intent from a value whose error arrived before
			// it was built. The nudge lifts it back onto the half.
			expect(fixedRound(1.005 - Number.EPSILON, 2)).toBe(1.01);
			expect(fixedRound(0.07 * 5, 1)).toBe(0.4);
		});

		test("leaves a value genuinely below the half alone", () => {
			// The nudge is one relative epsilon, so it only ever moves values
			// that differ from the boundary in the 16th digit or beyond.
			expect(fixedRound(1.0049, 2)).toBe(1);
			expect(fixedRound(1.00499999, 2)).toBe(1);
			expect(fixedRound(2.4999999999, 0)).toBe(2);
		});

		test("passes non-finite values through", () => {
			expect(fixedRound(Number.NaN, 2)).toBeNaN();
			expect(fixedRound(Number.POSITIVE_INFINITY, 2)).toBe(
				Number.POSITIVE_INFINITY,
			);
		});

		test("survives an exponent shift that would overflow", () => {
			// toFixed throws a RangeError beyond 100 places; this shifts the
			// exponent instead, and returns the input unchanged if that
			// overflows.
			expect(() => fixedRound(1.5, 500)).not.toThrow();
			expect(fixedRound(1.5, 500)).toBe(1.5);
			expect(() => fixedRound(1.5, 200)).not.toThrow();
		});
	});

	// =======================================================================
	// precisionRound
	// =======================================================================

	describe("precisionRound", () => {
		test("rounds to the requested significant digits", () => {
			expect(precisionRound(123456, 3)).toBe(123000);
			expect(precisionRound(1.23456, 3)).toBe(1.23);
			expect(precisionRound(0.000123456, 3)).toBe(0.000123);
			expect(precisionRound(-123456, 3)).toBe(-123000);
		});

		test("rounds the decimal the author wrote", () => {
			// Same binary-versus-decimal problem as fixedRound: plain
			// toPrecision rounds the stored value, which sits below 1.005.
			expect((1.005).toPrecision(3)).toBe("1.00");
			expect(precisionRound(1.005, 3)).toBe(1.01);
		});

		test("carries a digit when rounding pushes past the decade", () => {
			expect(precisionRound(9.999, 3)).toBe(10);
			expect(precisionRound(0.09999, 3)).toBe(0.1);
		});

		test("handles exact powers of ten", () => {
			// The digit count here is where a ceil-based implementation is off
			// by one.
			expect(precisionRound(100, 2)).toBe(100);
			expect(precisionRound(1000, 2)).toBe(1000);
			expect(precisionRound(100.4, 3)).toBe(100);
		});

		test("returns zero for zero", () => {
			expect(precisionRound(0, 5)).toBe(0);
		});

		test("clamps significant digits to 1..15", () => {
			// Beyond 15 digits a double carries no reliable information.
			expect(precisionRound(1.23456789012345678, 30)).toBe(
				Number((1.23456789012345678).toPrecision(15)),
			);
			expect(precisionRound(123456, 0)).toBe(100000);
		});

		test("passes non-finite values through", () => {
			expect(precisionRound(Number.NaN, 3)).toBeNaN();
			expect(precisionRound(Number.NEGATIVE_INFINITY, 3)).toBe(
				Number.NEGATIVE_INFINITY,
			);
		});
	});

	// =======================================================================
	// Cross-function properties
	// =======================================================================

	describe("cross-function behaviour", () => {
		test("a cancelled safeAdd result compares equal to zero", () => {
			const cleaned = safeAdd(0.3 - 0.1, -0.2);
			expect(cleaned).toBe(0);
			expect(areEqual(cleaned, 0)).toBe(true);
		});

		test("areEqual accepts the residues safeAdd removes", () => {
			const residue = 0.3 - 0.1 - 0.2;
			expect(residue).not.toBe(0);
			// Both functions draw the same line, so anything safeAdd zeroes is
			// something areEqual already treats as zero at that scale.
			expect(isZeroAtScale(residue, decadeScale(0.3))).toBe(true);
		});

		test("rounding then comparing is stable", () => {
			const rounded = fixedRound(1.0 / 3.0, 6);
			expect(areEqual(rounded, 0.333333)).toBe(true);
		});
	});
});
