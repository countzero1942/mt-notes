import JS from "@/utils/js";
import { getType } from "@/utils/types";

/**
 * Puts together the Error.name and Error.message
 * @param item The Error object.
 * @returns The error message.
 */
export const getErrorMessage = (item: Error) =>
	`${item.name}: '${item.message}'`;

/**
 * Simple type for extracting error throw info
 *
 * @param type "ErrorType"
 * @param baseType The type of the error object
 * @param name The Name of Error. This will be RangeError
 * if RangeError thrown. Or CustomError is new CustomError
 * thrown. (The error object will be instanceOf Error)
 * @param message The message part of the error.
 */
export type ErrorType = {
	type: "ErrorType";
	baseType: "string" | "Error" | "class" | "Object" | "unknown";
	name: string;
	message: string;
	fullMessage: string;
};

/**
 * Simplifies thrown error extraction info
 *
 * @param error The thrown error object: can be string, Error,
 * javascript Errors, custom extended Error, custom class or Object
 * @returns ErrorType Object
 */
export const getError = (error: any): ErrorType => {
	const getReturn = (
		baseType: ErrorType["baseType"],
		name: string,
		message: string
	): ErrorType => {
		return {
			type: "ErrorType",
			baseType,
			name,
			message,
			fullMessage: `${name}: ${message}`,
		};
	};
	const getUnknownReturn = (
		baseType: ErrorType["baseType"]
	): ErrorType => {
		return getReturn(
			baseType,
			"UnknownErrorType",
			JS.stringify(error)
		);
	};

	// log(error);

	if (typeof error == "string") {
		return getReturn("string", "StringError", error);
	} else if (error instanceof Error) {
		return getReturn("Error", error.name, error.message);
	} else {
		const type = getType(error);

		switch (type) {
			case "Class":
				return getUnknownReturn("class");
			case "Object":
				return getUnknownReturn("Object");
			default:
				return getUnknownReturn("unknown");
		}
	}
};
