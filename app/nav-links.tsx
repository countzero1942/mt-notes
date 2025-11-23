"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";

import { useEffect, useState } from "react";
import { Divider, NavLink } from "@mantine/core";
import { FaChevronRight } from "react-icons/fa";
import {
	getCurrentNavLinks,
	NavLinksInfo,
} from "@/client-data/nav-links";

export default function NavLinks() {
	const pathName = usePathname();

	const [navLinksInfo, setNavLinksInfo] = useState<
		NavLinksInfo | undefined
	>(undefined);

	useEffect(() => {
		const newNavLinksInfo = getCurrentNavLinks(pathName);
		setNavLinksInfo(newNavLinksInfo);
	}, [pathName]); // Only render on 'pathName' change

	const HomeBreadCrumb = () => {
		if (navLinksInfo !== undefined && navLinksInfo.dir !== "/") {
			return (
				<>
					<NavLink
						key="Home"
						label="Home"
						component={Link}
						href="/"
					/>
					<Divider my="0.5rem" />
				</>
			);
		}
		return null;
	};

	const getChildrenIcon = (children?: boolean) => {
		if (children === true) {
			return (
				<FaChevronRight
					size="0.5rem"
					style={{ marginTop: "0.25rem" }}
				/>
			);
		}
		return null;
	};

	const NavLinksBody = () => {
		if (navLinksInfo === undefined) {
			return <div>Loading...</div>;
		}
		return (
			<>
				<HomeBreadCrumb />
				{navLinksInfo.links.map(({ label, href, children }) => {
					return (
						<NavLink
							key={label}
							label={label}
							component={Link}
							href={href}
							active={pathName === href}
							rightSection={getChildrenIcon(children)}
						/>
					);
				})}
			</>
		);
	};

	return <NavLinksBody />;
}
