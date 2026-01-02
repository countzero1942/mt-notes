import path from "node:path";

export type NavLink = {
	label: string;
	href: string;
	children?: boolean;
};

export type NavLinksInfo = {
	dir: string;
	links: NavLink[];
};

const navLinksDict: Record<string, NavLink[]> = {
	"/": [
		{ label: "Home", href: "/" },
		{ label: "Transmission", href: "/tx", children: true },
		{ label: "Styling", href: "/styling", children: true },
		{ label: "About", href: "/about" },
	],
	"/tx": [
		{ label: "Tx Home", href: "/tx" },
		{ label: "Tx Basics", href: "/tx/tx-basics" },
	],
	"/styling": [
		{ label: "Styling Home", href: "/styling" },
		{
			label: "Headings and Text",
			href: "/styling/headings-and-text",
		},
		{
			label: "Some Other Stuff",
			href: "/styling/some-other-stuff",
		},
	],
};

export const getCurrentNavLinks = (pathName: string): NavLinksInfo => {
	console.log("getCurrentNavLinks called with pathName: ", pathName);
	// lands on home page of folder
	const homePageLinks = navLinksDict[pathName];
	if (homePageLinks !== undefined) {
		return {
			dir: pathName,
			links: homePageLinks,
		};
	}
	// lands on a child page of folder
	const pathInfo = path.parse(pathName);
	const parentLinks = navLinksDict[pathInfo.dir];
	if (parentLinks !== undefined) {
		return {
			dir: pathInfo.dir,
			links: parentLinks,
		};
	}
	// defaults to root links
	return {
		dir: "/",
		links: navLinksDict["/"],
	};
};
