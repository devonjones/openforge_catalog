import "./globals.css";
import './layout.css';
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
        <div className='pageContainer'>
          <div className='pageHeader'>OpenForge Catalog</div>
          <div className='columnContainer'>
            <div className='tagContainer'>Browse Tags</div>
            <div className='modelsContainer'>Models</div>
            <div className='modelDetailsContainer'>Model Details</div>
          </div>
        </div>
			</body>
		</html>
	);
}
