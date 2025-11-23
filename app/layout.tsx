import "@mantine/core/styles.css";
import "@/styles/global.css";

import React from 'react';
import { ColorSchemeScript, mantineHtmlProps, MantineProvider } from '@mantine/core';
import { theme } from '../theme';
import TheApp from "./the-app";
import { Inter, Poppins, Lato } from "next/font/google";
import clsx from "clsx";

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
  title: 'Notes Related Stuff',
  description: 'Notes related stuff using Mantine with Next.js!',
};
  
export default function RootLayout({ children }: { children: any }) {
  return (
    <html lang="en" {...mantineHtmlProps}
    className={clsx(poppinsFont.className, latoFont.className)}>
      <head>
        <ColorSchemeScript />
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
