import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import "./globals.css";
import "./layout.css";
import { AppSidebar } from "@/components/app-sidebar";
import HeaderApp from "@/components/header-app";
import { Inter } from "next/font/google";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
	title: "OpenForge Catalog",
	description: "OpenForge Catalog",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className={inter.className}>
				<div className='Layout__Container'>
					<div className='Layout__Header'>header</div>
					<div className='Layout__Content'>
						<div className='Layout__Filters'>filters</div>
						<div className='Layout__Models'>models</div>
						<div className='Layout__Details'>details</div>
					</div>
				</div>

				{/* <SidebarProvider
					style={
						{
							"--sidebar-width": "350px",
						} as React.CSSProperties
					}
				>
					<AppSidebar />
					<SidebarInset>
						<HeaderApp />
						{children}
					</SidebarInset>
				</SidebarProvider> */}
			</body>
		</html>
	);
}
