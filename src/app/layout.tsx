"use client";

import "./globals.css";
import './layout.css';

// import { metadata } from '@/app/metadata';
import React from 'react';
import { Inter } from "next/font/google";
import TabbedInterface from "@/components/tabbed-interface";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
	return (
		<html lang="en">
			<body className={inter.className}>
        <div className='pageContainer'>
          <div className='pageHeaderWrapper'>OpenForge Catalog
            <div className='pageHeaderRight'>
              Version 0.2.0 |&nbsp;
              <a className='visibleLink' href='https://github.com/devonjones/openforge-tutorials/wiki' target="_blank">Wiki</a> |&nbsp;
              <a className='visibleLink' href='https://www.patreon.com/masterworktools' target="_blank">Support us on Patreon</a>
            </div>
          </div>
          <TabbedInterface />
        </div>
      </body>
    </html>
  );
}
