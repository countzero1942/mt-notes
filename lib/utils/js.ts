import { getError } from "@/utils/error";

namespace JS {
	/**
	 * Uses JSON.stringify to stringify as JS Object.
	 *
	 * @param obj The Object to stringify
	 * @param tabSize If set, the number of spaces per tab.
	 * Otherwise a tab string.
	 * @returns The stringified JSObject: or Error message,
	 * if e.g. Object has a BigInt member.
	 */
	export const stringify = (obj: any, tabSize?: number): string => {
		const defTabSize = tabSize ? tabSize : "\t";
		try {
			const jsObjStr = JSON.stringify(
				obj,
				null,
				defTabSize
			).replace(/\"([\w_]+?)\"\:/gm, "$1: ");
			return jsObjStr;
		} catch (error) {
			return getError(error).fullMessage;
		}
	};
}

export default JS;
