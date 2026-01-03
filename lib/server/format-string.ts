// lib/formatHtml.ts
import prettier from "prettier";

export async function formatHtml(
	html: string,
	options?: prettier.Options,
): Promise<string> {
	try {
		const defaultOptions: prettier.Options = {
			parser: "html",
			printWidth: 80,
			tabWidth: 2,
			useTabs: false,
			htmlWhitespaceSensitivity: "ignore",
		};
		const formatted = await prettier.format(html, {
			...defaultOptions,
			...options,
		});
		return formatted;
	} catch (error) {
		console.error("Error formatting HTML:", error);
		return html; // Return original if formatting fails
	}
}
