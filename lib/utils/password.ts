import { div } from "@/utils/log";
import { log } from "console";
import cryptoRandomString from "crypto-random-string";

export const generatePassword = (
	length: number = 15
): string => {
	const pwCharsAlphaLower = "abcdefghijklmnopqrstuvwxyz";
	const pwCharsAlphaUpper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	const pwCharsAlpha = `${pwCharsAlphaLower}${pwCharsAlphaUpper}`;
	const pwCharsNumeric = "123456789";
	const pwCharsSpecial = "!@#$%&*_+-=";

	const pwChars = `${pwCharsAlpha}${pwCharsNumeric}${pwCharsSpecial}`;

	let attempts = 1;
	while (true) {
		const pw = cryptoRandomString({
			length,
			characters: pwChars,
		});
		if (
			/^[a-zA-Z]/.test(pw) &&
			/[a-zA-Z]$/.test(pw) &&
			/[1-9].*[1-9].*[1-9]/.test(pw) &&
			/[!@#$%&*_+-=].*[!@#$%&*_+-=]/.test(pw)
		) {
			return pw;
		}
		log(`--> Failed attempt ${attempts}. Retrying...`);
		attempts++;
	}
};

export const logGeneratePassword = (
	length: number = 15
) => {
	const pw = generatePassword(length);
	div();
	log();
	log(pw);
	log();
	div();
};
