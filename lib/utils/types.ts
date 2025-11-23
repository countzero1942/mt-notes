import { ReadonlyTuple } from "type-fest";

export type KeyType = string | number | symbol;

export type FullType = {
	type:
		| "Number"
		| "String"
		| "Boolean"
		| "Undefined"
		| "Null"
		| "RegEx"
		| "Date"
		| "Array"
		| "Function"
		| "Object"
		| "Class"
		| "Error"
		| "Map"
		| "Set";
	name: string;
};

const getPrototype = (item: any) => {
	return Object.prototype.toString.call(item).slice(8, -1);
};

/**
 * Gets the Name of a Class object.
 * @param item The Class object to retrieve Class name from
 * @returns The Class Name
 */
export const getClassName = (item: Object) => item.constructor.name;

/**
 * Checks any kind of object for type of "Class" and that is has
 * self or ancestor "className". Returns true, if so. Otherwise false.
 *
 * @param item Any kind of item/object to test for. E.g., number,
 * string, Object or class
 * @param className Self or ancestor class name to test for
 * (if 'item' is a class object.)
 * @returns True if item is type "Class" and has self or ancestor
 * "className". Otherwise, false.
 */
export const hasClassName = (item: any, className: string) => {
	const type = getType(item);

	if (type !== "Class") {
		return false;
	}

	let next = item;
	while (true) {
		next = Object.getPrototypeOf(next);
		const name = next?.constructor?.name;

		switch (true) {
			case next == null:
				return false;
			case name == null:
				return false;
			case name === "Object":
				return false;
			case name === className:
				return true;
			default:
				break;
		}
	}
};

// export const hasClassNameLog = (item: any, className: string) => {
// 	log(`===><hasClassName> has className: "${className}"`);
// 	const type = getType(item);
// 	log(`===><hasClassName> item type: ${type}`);

// 	if (type !== "Class") {
// 		log(`===><hasClassName> type !== "Class" -> return FALSE`);
// 		return false;
// 	}

// 	let next = item;
// 	while (true) {
// 		next = Object.getPrototypeOf(next);
// 		const name = next?.constructor?.name;

// 		switch (true) {
// 			case next == null:
// 				log(`===><hasClassName> next is null -> ret FALSE`);
// 				return false;
// 			case name == null:
// 				log(`===><hasClassName> name is null -> ret FALSE`);
// 				return false;
// 			case name === "Object":
// 				log(`===><hasClassName> name is "Object" -> ret FALSE`);
// 				return false;
// 			case name === className:
// 				log(`===><hasClassName> name: "${name}"`);
// 				log(`===><hasClassName> classsName: "${className}"`);
// 				log(`===><hasClassName> name is className -> ret TRUE`);
// 				return true;
// 			default:
// 				log(`===><hasClassName> name is "${name}" -> cont`);
// 				break;
// 		}
// 	}
// };

/**
 * Gets the Type name of an object. The return type covers
 * most Type name cases. But can cast as string to compare
 * those not listed in the Union.
 * @param item The object to get the Type of
 * @returns The object Type name
 */
export const getType = (item: any): FullType["type"] => {
	if (item === null) {
		return "Null";
	}
	if (typeof item === "undefined") {
		return "Undefined";
	}
	const prototype: ReturnType<typeof getType> = getPrototype(
		item
	) as ReturnType<typeof getType>;
	if (
		prototype === "Object" &&
		getClassName(item as Object) != "Object"
	) {
		return "Class";
	}
	return prototype;
};

export const getFullType = (item: any): FullType => {
	const type = getType(item);
	const getName = () => {
		switch (true) {
			case type === "Class":
			case type === "Error":
				return getClassName(item);
			case type === "Function":
				return item.name;
			default:
				return "";
		}
	};

	const name = getName();
	return { type, name };
};

export const isFullType = (item: any, fullType: FullType) => {
	const fullTypeItem = getFullType(item);
	return (
		fullTypeItem.type === fullType.type &&
		fullTypeItem.name === fullType.name
	);
};

/**
 * This compares the Types of two objects and returns
 * true if they match. Every object that is a class
 * will yield a Type match of Type "Class".
 *
 * @param a The object A to compare
 * @param b The object B to compare
 * @returns True if the Types are a match. All class objects
 * will match with the Type of "Class"
 */
export const isTypeMatch = (a: any, b: any) =>
	getType(a) === getType(b);

/**
 * This will match two objects for the same Type; and if both
 * are type "Class" then it will test to see if both Class-Names
 * are also a match.
 *
 * @param a The object A to compare
 * @param b The object B to compare
 * @returns True if Types are a match; and if Classes,
 * ClassNames are also a match.
 */
export const isTypeAndClassNameMatch = (a: any, b: any) => {
	const ta = getType(a);
	const tb = getType(b);

	if (ta === "Class" && tb === "Class") {
		return getClassName(a) === getClassName(b);
	}

	return ta === tb;
};

/**
 * This compares the Types and Class-Names of two objects
 * and returns the related info.
 *
 * @param a The object A to compare
 * @param b The object B to compare
 * @returns The related-info Object
 */
export const compareTypeAndClassName = (
	a: any,
	b: any
): {
	isTypeMatch: boolean;
	isClassNameMatch: boolean;
	isTypeAndClassNameMatch: boolean;
	typeA: ReturnType<typeof getType>;
	classNameA?: string;
	typeB: ReturnType<typeof getType>;
	classNameB?: string;
} => {
	const typeA = getType(a);
	const typeB = getType(b);

	const isTypeMatch = typeA === typeB;

	if (typeA === "Class" && typeB === "Class") {
		const classNameA = getClassName(a);
		const classNameB = getClassName(b);
		const isClassMatch = classNameA === classNameB;

		return {
			isTypeMatch,
			isClassNameMatch: isClassMatch,
			isTypeAndClassNameMatch: isClassMatch,
			typeA,
			typeB,
			classNameA,
			classNameB,
		};
	}

	return {
		isTypeMatch,
		isClassNameMatch: false,
		isTypeAndClassNameMatch: isTypeMatch,
		typeA,
		typeB,
	};
};

/**
 * Can be used with array.filter to filter out undefined members
 * Can also be used to narrow an array's type in a filter function.
 *
 * @param obj This is typically the element of an array
 * during a filter callback
 * @returns The 'obj' cast as T if it is defined.
 */
export const isDefined = <T>(obj: T | undefined): obj is T => {
	return obj !== undefined;
};

/**
 * This method can be called in the 'default' case of a switch
 * that matches the discriminated key-value in a discriminated
 * union to ensure each type is implemented.
 */
export const exhaustiveGuard = (_: never): never => {
	throw Error("Never");
};

/**
 * These are the keys to methods that mutate the contents
 * of an array. They are removed in FixedLengthArray of T, L
 */
export type ArrayLengthMutationKeys =
	| "splice"
	| "push"
	| "pop"
	| "shift"
	| "unshift";

export const toReadonlyTuple = <
	L extends number,
	TArray extends readonly any[],
>(
	arr: TArray,
	length: L
) => {
	if (length > arr.length) {
		throw RangeError(
			"FixedLengthArray L greater than 'arr.length'"
		);
	}

	return arr as unknown as ReadonlyTuple<ArrayElement<TArray>, L>;
};

export const isObject = (obj: any): obj is Record<KeyType, any> => {
	if (getType(obj) === "Object") {
		return true;
	}
	return false;
};
