import { clamp } from "@/utils/math";
import { StrGraphemeSeq, StrSeq, Seq, Range } from "@/utils/seq";
import {
	getCodePointCharLength,
	isCodePointWhiteSpace,
} from "@/utils/string";

export const normalizeStartEnd = (
	length: number,
	startIncl?: number,
	endExcl?: number
): Range => {
	const safeLength = Math.max(0, length);
	const getStart = () => {
		let s = startIncl ?? 0;
		s = s < 0 ? safeLength + s : s;
		return clamp(s, 0, safeLength);
	};

	const getEnd = () => {
		let e = endExcl ?? safeLength;
		e = e < 0 ? safeLength + e : e;
		return clamp(e, 0, safeLength);
	};

	let s = getStart();
	let e = getEnd();

	if (s > e) {
		[s, e] = [e, s];
	}

	return Range.from(s, e);
};

export class ArraySlice<T> extends Seq<T> {
	public readonly startIncl: number;
	public readonly endExcl: number;

	public get length(): number {
		return this.endExcl - this.startIncl;
	}

	constructor(
		public readonly array: readonly T[],
		startIncl?: number,
		endExcl?: number
	) {
		super();

		const range = normalizeStartEnd(array.length, startIncl, endExcl);
		this.startIncl = range.startIncl;
		this.endExcl = range.endExcl;
	}

	public override *gen(): Generator<T, any, any> {
		for (let i = this.startIncl; i < this.endExcl; i++) {
			yield this.array[i] as T;
		}
	}

	public toArray() {
		return this.array.slice(this.startIncl, this.endExcl);
	}

	public static from<T>(
		array: readonly T[],
		startIncl?: number,
		endExcl?: number
	): ArraySlice<T> {
		return new ArraySlice(array, startIncl, endExcl);
	}
}

export class StrSlice {
	public readonly startIncl: number;

	public readonly endExcl: number;

	constructor(
		public readonly source: string,
		startIncl?: number,
		endExcl?: number
	) {
		const range = normalizeStartEnd(
			this.source.length,
			startIncl,
			endExcl
		);
		this.startIncl = range.startIncl;
		this.endExcl = range.endExcl;
		if (this.startIncl === 0 && this.endExcl === this.source.length) {
			this.sliceCache = this.source;
		}
	}

	get length(): number {
		return this.endExcl - this.startIncl;
	}

	get isEmpty(): boolean {
		return this.length === 0;
	}

	private sliceCache: string | undefined = undefined;

	get value(): string {
		if (this.sliceCache === undefined) {
			this.sliceCache = this.source.slice(this.startIncl, this.endExcl);
		}
		return this.sliceCache;
	}

	charCodeAt(index: number): number {
		const charIndex = this.startIncl + index;
		if (charIndex >= this.endExcl) {
			return -1;
		}
		return this.source.charCodeAt(charIndex);
	}

	codePointAt(index: number): number | undefined {
		const codePointIndex = this.startIncl + index;
		if (codePointIndex >= this.endExcl) {
			return undefined;
		}

		const codePoint = this.source.codePointAt(codePointIndex);
		if (codePoint === undefined) {
			return undefined;
		}

		const codePointLength = getCodePointCharLength(codePoint);
		if (codePointIndex + codePointLength > this.endExcl) {
			return undefined;
		}
		return codePoint;
	}

	trimStart(): StrSlice {
		let start = this.startIncl;
		while (
			start < this.endExcl &&
			isCodePointWhiteSpace(this.source.charCodeAt(start))
		) {
			start++;
		}
		return start === this.startIncl
			? this
			: new StrSlice(this.source, start, this.endExcl);
	}

	trimEnd(): StrSlice {
		let endIncl = this.endExcl - 1;
		while (
			endIncl >= this.startIncl &&
			isCodePointWhiteSpace(this.source.charCodeAt(endIncl))
		) {
			endIncl--;
		}
		return endIncl === this.endExcl - 1
			? this
			: new StrSlice(this.source, this.startIncl, endIncl + 1);
	}

	trim(): StrSlice {
		return this.trimStart().trimEnd();
	}

	countOccurencesOf = (
		match: string,
		childStartIncl?: number
	): number => {
		if (match.length == 0) {
			return 0;
		}

		const range = normalizeStartEnd(this.length, childStartIncl);

		let i = range.startIncl;

		let count = 0;
		while (true) {
			i = this.indexOf(match, i);
			if (i >= 0) {
				count++;
				i += match.length;
			} else {
				break;
			}
		}
		return count;
	};

	indexOf(value: string, childStartIncl?: number): number {
		// abcde
		// 012345
		// length = 5
		//
		// value = "", length = 0
		// loopLength = 5 - 0 = 5
		// lastIndex = 4
		//
		// value = "e", length = 1
		// loopLength = 5 - 1 = 4
		// lastIndex = 3 => wrong
		// loopLength = 5 - 1 + 1 = 5
		// lastIndex = 4
		//
		// value = "de", length = 2
		// loopLength = 5 - 2 + 1 = 4
		// lastIndex = 3
		//
		// So always add the 1 because we exclude empty value

		const valueLength = value.length;
		if (valueLength === 0) {
			return -1;
		}

		const range = normalizeStartEnd(this.length, childStartIncl);

		const loopLength = this.endExcl - valueLength + 1;
		for (let i = this.startIncl + range.startIncl; i < loopLength; i++) {
			if (this.source.startsWith(value, i)) {
				return i - this.startIncl;
			}
		}
		return -1;
	}

	lastIndexOf(value: string, childEndExcl?: number): number {
		// hello world
		// 012345678901

		const l = value.length;
		if (l === 0) {
			return -1;
		}

		const range = normalizeStartEnd(this.length, 0, childEndExcl);

		for (
			let i = this.startIncl + range.endExcl - l;
			i >= this.startIncl;
			i--
		) {
			if (this.source.startsWith(value, i)) {
				return i - this.startIncl;
			}
		}
		return -1;
	}

	startsWith(value: string | StrSlice, startIncl?: number): boolean {
		const range = normalizeStartEnd(this.length, startIncl);

		if (
			value.length === 0 ||
			range.startIncl + value.length > this.length
		) {
			return false;
		}
		if (typeof value === "string") {
			return this.source.startsWith(
				value,
				this.startIncl + range.startIncl
			);
		} else {
			let valueIndex = value.startIncl;
			let sourceIndex = this.startIncl + range.startIncl;
			let valueStr = value.source;
			let sourceStr = this.source;
			while (valueIndex < value.endExcl && sourceIndex < this.endExcl) {
				if (
					valueStr.charCodeAt(valueIndex) !==
					sourceStr.charCodeAt(sourceIndex)
				) {
					return false;
				}
				valueIndex++;
				sourceIndex++;
			}
			return valueIndex === value.endExcl;
		}
	}

	endsWith(value: string | StrSlice, endExcl?: number): boolean {
		// hello world
		// 012345678901
		// 11 -

		const range = normalizeStartEnd(this.length, 0, endExcl);

		if (value.length === 0 || value.length > this.length) {
			return false;
		}
		const startsWithIndex = range.endExcl - value.length;
		return this.startsWith(value, startsWithIndex);
	}

	equals(value: string | StrSlice): boolean {
		// if (typeof value === "string") {
		// 	return (
		// 		this.length === value.length && this.startsWith(value)
		// 	);
		// } else {
		// 	return (
		// 		this.length === value.length &&
		// 		this.startsWith(value.string)
		// 	);
		// }
		if (value.length === 0 && this.length === 0) {
			return true;
		}

		return this.length === value.length && this.startsWith(value);
	}

	split(splitter: string, maxSplits?: number): StrSlice[] {
		const strs: StrSlice[] = [];
		let i = 0;
		let splits = 0;
		const safeMaxSplits =
			maxSplits === undefined ? Number.MAX_SAFE_INTEGER : maxSplits;
		while (true) {
			const j = this.indexOf(splitter, i);
			if (j > -1) {
				splits++;
			} else {
				strs.push(
					// new StrSlice(
					// 	this.source,
					// 	this.startIncl + start,
					// 	this.endExcl
					// ).trim()
					this.slice(i).trim()
				);
				break;
			}
			strs.push(this.slice(i, j).trim());

			i = j + splitter.length;

			if (splits >= safeMaxSplits) {
				strs.push(this.slice(i).trim());
				break;
			}
		}
		return strs;
	}

	indexOfMany(
		values: readonly (string | StrSlice)[],
		childStartIncl?: number
	): [number, number] {
		if (values.length === 0) {
			return [-1, -1];
		}

		const range = normalizeStartEnd(this.length, childStartIncl);

		for (let i = range.startIncl; i < this.length; i++) {
			for (let j = 0; j < values.length; j++) {
				const value = values[j];
				if (this.startsWith(value, i)) {
					return [i, j];
				}
			}
		}

		return [-1, -1];
	}

	lastIndexOfMany(
		values: readonly (string | StrSlice)[],
		childEndExcl?: number
	): [number, number] {
		if (values.length === 0) {
			return [-1, -1];
		}

		const range = normalizeStartEnd(
			this.length,
			undefined,
			childEndExcl
		);

		for (
			let i = Math.min(range.endExcl - 1, this.length - 1);
			i >= 0;
			i--
		) {
			for (let j = 0; j < values.length; j++) {
				const value = values[j];
				if (this.startsWith(value, i)) {
					return [i, j];
				}
			}
		}

		return [-1, -1];
	}

	slice(childStartIncl?: number, childEndExcl?: number): StrSlice {
		const range = normalizeStartEnd(
			this.length,
			childStartIncl,
			childEndExcl
		);

		return new StrSlice(
			this.source,
			this.startIncl + range.startIncl,
			this.startIncl + range.endExcl
		);
	}

	sliceByLength(childStartIncl: number, length: number): StrSlice {
		const range = normalizeStartEnd(
			this.length,
			childStartIncl,
			undefined
		);

		const end = Math.min(this.length, range.startIncl + length);

		return new StrSlice(
			this.source,
			this.startIncl + range.startIncl,
			this.startIncl + end
		);
	}

	sliceOf(value: string): StrSlice {
		const i = this.indexOf(value);
		if (i === -1) {
			return StrSlice.none(this.source);
		}
		return this.slice(i, i + value.length);
	}

	edgeSplitMany(values: readonly string[]): StrSlice[] {
		// note: 'values' can only have 'undefined' if out of bounds
		const slices: StrSlice[] = [];
		let start = 0;
		let next = start;
		const str = this.value;
		while (next <= this.length) {
			const [j, k] = this.indexOfMany(values, next);

			if (j === -1) {
				slices.push(
					// new StrSlice(
					// 	this.source,
					// 	this.startIncl + start,
					// 	this.endExcl
					// ).trim()
					this.slice(start).trim()
				);
				break;
			}
			if (start !== j) {
				// const entry = new StrSlice(
				// 	this.source,
				// 	this.startIncl + start,
				// 	this.startIncl + j
				// ).trim();
				const entry = this.slice(start, j).trim();

				const isEntryFirstAndEmpty =
					slices.length === 0 && entry.isEmpty;

				if (!isEntryFirstAndEmpty) {
					slices.push(entry);
				}
			}
			start = j;
			next = start + values[k]!.length;
		}
		return slices;
	}

	indexesOfOrdered(orderedValues: readonly string[]): readonly number[] {
		// note: 'orderedValues' can only be 'undefined' if indexed out of bounds
		const valuesLength = orderedValues.length;
		const indexes = Array.from({ length: valuesLength }, () => -1);
		let currentOrder = 0;
		for (
			let i = 0;
			i < this.endExcl && currentOrder < valuesLength;
			i++
		) {
			for (let j = currentOrder; j < valuesLength; j++) {
				const value = orderedValues[j] as string;
				if (this.startsWith(value, i)) {
					indexes[j] = i;
					i += value.length;
					currentOrder = j + 1;
					break;
				}
			}
		}
		return indexes;
	}

	edgeSplitOrdered(values: readonly string[]): StrSlice[] {
		// 'indexes' will be same length as 'values'
		const indexes = this.indexesOfOrdered(values);
		const slices: StrSlice[] = [];
		let start = 0;
		for (let i = 0; i < indexes.length; i++) {
			const end = indexes[i] as number;
			if (end !== -1) {
				// const entry = new StrSlice(
				// 	this.source,
				// 	this.startIncl + start,
				// 	this.startIncl + end
				// ).trim();
				const entry = this.slice(start, end).trim();

				const isEntryFirstAndEmpty =
					slices.length === 0 && entry.isEmpty;

				if (!isEntryFirstAndEmpty) {
					slices.push(entry);
				}

				start = end;
			}
		}
		slices.push(
			// new StrSlice(
			// 	this.source,
			// 	this.startIncl + start,
			// 	this.endExcl
			// ).trim()
			this.slice(start).trim()
		);
		return slices;
	}

	keyWordSplitMany(
		keywords: readonly string[],
		isForwardSearch: boolean = true
	): {
		startSlice: StrSlice;
		keywordSlice: StrSlice;
		keywordIndex: number;
		endSlice: StrSlice;
	} {
		const defaultReturn = {
			startSlice: this,
			keywordSlice: StrSlice.empty,
			keywordIndex: -1,
			endSlice: StrSlice.empty,
		};
		if (keywords.length === 0 || this.isEmpty) {
			return defaultReturn;
		}

		const [index, keywordIndex] = isForwardSearch
			? this.indexOfMany(keywords)
			: this.lastIndexOfMany(keywords);

		if (index === -1) {
			return defaultReturn;
		}

		const keyword = keywords[keywordIndex] as string;
		const keywordSlice = this.slice(
			index,
			index + keyword.length
		).trim();
		const startSlice = this.slice(0, index).trim();
		const endSlice = this.slice(index + keyword.length).trim();

		return {
			startSlice,
			keywordSlice,
			keywordIndex,
			endSlice,
		};
	}

	expandSlice(expandStart: number, expandEnd: number = 0): StrSlice {
		const start = Math.max(0, this.startIncl - expandStart);
		const end = Math.min(this.source.length, this.endExcl + expandEnd);
		return new StrSlice(this.source, start, end);
	}

	/**
	 * If StrSlice represents a string with a parser error in it
	 * this will return a string underlining the error.
	 *
	 * @returns
	 */
	getErrorString(): string {
		return this.endExcl > this.startIncl
			? `${" ".repeat(this.startIncl)}${"^".repeat(this.length)}`
			: "";
	}

	*codepoints(): Generator<number, any, any> {
		const endExcl = this.endExcl;
		let charIndex = this.startIncl;

		while (charIndex < endExcl) {
			const codePoint = this.source.codePointAt(charIndex);
			if (codePoint === undefined) {
				break;
			}
			yield codePoint;

			charIndex += getCodePointCharLength(codePoint);
		}
	}

	*chars(): Generator<number, any, any> {
		const endExcl = this.endExcl;
		let charIndex = this.startIncl;

		while (charIndex < endExcl) {
			const char = this.source.charCodeAt(charIndex);
			yield char;

			charIndex += 1;
		}
	}

	toString(): string {
		return this.value;
	}

	static from(
		source: string,
		startIncl?: number,
		endExcl?: number
	): StrSlice {
		return new StrSlice(source, startIncl, endExcl);
	}

	static fromLength(
		source: string,
		startIncl: number,
		length: number
	): StrSlice {
		return new StrSlice(source, startIncl, startIncl + length);
	}

	static fromIndexOfDefaultAll(
		source: string,
		startIncl: number
	): StrSlice {
		return startIncl >= 0
			? StrSlice.from(source, startIncl)
			: StrSlice.all(source);
	}

	public static fromIndexOfDefaultNone(
		source: string,
		startIncl: number
	): StrSlice {
		return startIncl >= 0
			? StrSlice.from(source, startIncl)
			: StrSlice.none(source);
	}

	static fromCodePointIndices(
		source: string,
		startIncl?: number,
		endExcl?: number
	): StrSlice {
		const seq = StrSeq.from(source);
		const range = seq.getRange(startIncl, endExcl);

		return new StrSlice(source, range.startIncl, range.endExcl);
	}

	static fromGraphemeIndices(
		source: string,
		startIncl?: number,
		endExcl?: number
	): StrSlice {
		const seq = StrGraphemeSeq.from(source);
		const range = seq.getRange(startIncl, endExcl);

		return new StrSlice(source, range.startIncl, range.endExcl);
	}

	static to(source: string, endExcl: number): StrSlice {
		return new StrSlice(source, 0, endExcl);
	}

	/**
	 * Creates a StrSlice for the entire string.
	 *
	 * @param source The string to create a StrSlice for.
	 * @returns A StrSlice for the entire string.
	 */
	static all(source: string): StrSlice {
		return new StrSlice(source, 0);
	}

	/**
	 * Creates an empty StrSlice.
	 *
	 * @param source The string to create an empty StrSlice for.
	 * @returns An empty StrSlice.
	 */
	static none(source: string): StrSlice {
		return new StrSlice(source, 0, 0);
	}

	/**
	 * An empty StrSlice.
	 */
	private static readonly EMPTY = new StrSlice("", 0, 0);

	/**
	 * Returns an empty StrSlice.
	 *
	 * @returns An empty StrSlice.
	 */
	static get empty(): StrSlice {
		return StrSlice.EMPTY;
	}

	private static cachedBufferLength = 1024 * 8;
	private static _cachedBuffer: Buffer | null = null;

	/**
	 * Returns a cached buffer for use in join operations.
	 *
	 * @returns A cached buffer for use in join operations.
	 */
	private static get cachedBuffer() {
		if (!StrSlice._cachedBuffer) {
			StrSlice._cachedBuffer = Buffer.alloc(
				StrSlice.cachedBufferLength,
				0
			);
		}
		return StrSlice._cachedBuffer;
	}

	/**
	 * Joins an array of StrSlices into a single string.
	 *
	 * @param slices The array of StrSlices to join.
	 * @param sep The separator to use between StrSlices.
	 * @returns The joined string.
	 */
	static join(slices: readonly StrSlice[], sep: string = "") {
		const getBufferByteSize = (
			slices: readonly StrSlice[],
			sep: string
		) => {
			const getSlicesCharLength = (slices: readonly StrSlice[]) => {
				let totalBytes = 0;
				for (const slice of slices) {
					totalBytes += slice.length;
				}
				return totalBytes;
			};
			let totalBytes = 0;
			totalBytes += getSlicesCharLength(slices) * 2;
			totalBytes += sep.length * 2 * (slices.length - 1);
			return totalBytes;
		};

		const byteSize = getBufferByteSize(slices, sep);
		let buf =
			byteSize <= StrSlice.cachedBufferLength
				? StrSlice.cachedBuffer
				: Buffer.alloc(byteSize, 0);

		const last = slices.length - 1;
		let offset = 0;
		const slicesLength = slices.length;
		for (let i = 0; i < slicesLength; i++) {
			const slice = slices[i];
			const source = slice.source;
			const endExcl = slice.endExcl;
			for (
				let i_slice = slice.startIncl;
				i_slice < endExcl;
				i_slice++
			) {
				buf.writeUInt16LE(source.charCodeAt(i_slice), offset);
				offset += 2;
			}
			if (sep && i < last) {
				const sepLength = sep.length;
				for (let i_sep = 0; i_sep < sepLength; i_sep++) {
					buf.writeUInt16LE(sep.charCodeAt(i_sep), offset);
					offset += 2;
				}
			}
		}

		return buf.toString("utf16le", 0, offset);
	}
}
