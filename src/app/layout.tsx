import "./globals.css";
import "./layout.css";
import { Inter } from "next/font/google";
import ClientRootLayout from "./ClientRootLayout";

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
	return <ClientRootLayout>{children}</ClientRootLayout>;
}
