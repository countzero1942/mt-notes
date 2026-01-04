// import "katex/dist/katex.min.css";
import "@mantine/core/styles.css";
import "@/styles/global.css";

import {
	ColorSchemeScript,
	MantineProvider,
	mantineHtmlProps,
} from "@mantine/core";
import clsx from "clsx";
import { Inter, Lato, Poppins } from "next/font/google";
import type React from "react";
import { theme } from "../theme";
import TheApp from "./the-app";

const interFont = Inter({
	subsets: ["latin"],
	weight: ["400", "700"],
	variable: "--iu-font-family-inter",
});

const poppinsFont = Poppins({
	subsets: ["latin"],
	weight: ["600", "700", "800", "900"],
	variable: "--iu-font-family-poppins",
});

const latoFont = Lato({
	subsets: ["latin"],
	weight: ["400", "700"],
	variable: "--iu-font-family-lato",
});

export const metadata = {
	title: "Notes Related Stuff",
	description: "Notes related stuff using Mantine with Next.js!",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			lang="en"
			{...mantineHtmlProps}
			className={clsx(poppinsFont.className, latoFont.className)}
		>
			<head>
				<ColorSchemeScript />
				<link
					rel="stylesheet"
					href="https://cdnjs.cloudflare.com/ajax/libs/KaTeX/0.16.9/katex.min.css"
					integrity="sha512-fHwaWebuwA7NSF5Qg/af4UeDx9XqUpYpOGgubo3yWu+b2IQR4UeQwbb42Ti7gVAjNtVoI/I9TEoYeu9omwcC6g=="
					crossOrigin="anonymous"
					referrerPolicy="no-referrer"
				/>

				<link rel="shortcut icon" href="/favicon.svg" />
				<meta
					name="viewport"
					content="minimum-scale=1, initial-scale=1, width=device-width, user-scalable=no"
				/>
			</head>
			<body>
				<MantineProvider theme={theme}>
					<TheApp>{children}</TheApp>
				</MantineProvider>
			</body>
		</html>
	);
}
