"use client";

import "./globals.css";
import "./layout.css";
import { useEffect } from "react";
import useStore from "@/store/store";
import { Inter } from "next/font/google";
import Filters from "@/components/Filters";

const inter = Inter({ subsets: ["latin"] });

export default function ClientRootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const fetchData = useStore((state) => state.fetchData);

    useEffect(() => {
      fetchData();
    }, [fetchData]);
    
    return (
        <html lang="en">
            <body className={inter.className}>
                <div className='Layout__Container'>
                    <div className='Layout__Header'>header</div>
                    <div className='Layout__Content'>
                        <div className='Layout__Filters'><Filters /></div>
                        <div className='Layout__Models'>models</div>
                        <div className='Layout__Details'>details</div>
                    </div>
                </div>
            </body>
        </html>
    );
}