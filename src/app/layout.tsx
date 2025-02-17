
"use client";

import "./globals.css";
import './layout.css';
import React, { useEffect } from 'react';
import { Inter } from "next/font/google";
import TagContainer from "@/components/tag-container";
import useStore from '@/stores/tag-store';
// import { metadata } from '@/app/metadata';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
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
        <div className='pageContainer'>
          <div className='pageHeaderWrapper'>OpenForge Catalog</div>
          <div className='columnContainer'>
            <div className='tagContainerWrapper'>
              <TagContainer />
            </div>
            <div className='modelsContainerWrapper'>Models</div>
            <div className='modelDetailsContainerWrapper'>Model Details</div>
          </div>
        </div>
			</body>
		</html>
	);
}
