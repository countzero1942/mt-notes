"use client";

import NavLinks from "@/app/nav-links";
import { NumSeq } from "@/utils/seq";
import {
	AppShell,
	Burger,
	Center,
	Group,
	Skeleton,
	Title,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import React from "react";

export default function TheApp({
	children,
}: {
	children: React.ReactNode;
}) {
	const [mobileOpened, { toggle: toggleMobile }] = useDisclosure();
	const [desktopOpened, { toggle: toggleDesktop }] =
		useDisclosure(true);

	return (
		// AppShell component provides a consistent layout for your app shell
		// It includes header, navbar, and main sections
		// You can customize it according to your needs
		// The AppShell.Header, AppShell.Navbar, and AppShell.Main
		// components are provided by Mantine library
		<AppShell
			header={{ height: 60 }}
			navbar={{
				width: 200,
				breakpoint: "sm",
				collapsed: {
					mobile: !mobileOpened,
					desktop: !desktopOpened,
				},
			}}
			padding="md"
		>
			<AppShell.Header display={Center}>
				<Group h="100%">
					<Group h="100%" px={10}>
						<Burger
							opened={mobileOpened}
							onClick={toggleMobile}
							hiddenFrom="sm"
							size="sm"
						/>
						<Burger
							opened={desktopOpened}
							onClick={toggleDesktop}
							visibleFrom="sm"
							size="sm"
						/>
					</Group>
					<Group h="100%" px={10} my={0}>
						<h2 style={{ margin: 0 }}>Database Stuff</h2>
					</Group>
				</Group>
			</AppShell.Header>
			<AppShell.Navbar p="md">
				<NavLinks />
			</AppShell.Navbar>
			<AppShell.Main>{children}</AppShell.Main>
		</AppShell>
	);
}
