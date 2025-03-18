"use client";

import "./globals.css";
import './layout.css';

// import { metadata } from '@/app/metadata';
import React, { useEffect, useState } from 'react';
import { Inter } from "next/font/google";
import useStore from '@/stores/tag-store';
import TagContainer from "@/components/tag-container";
import ResultsContainer from "@/components/results-container";
import BlueprintContainer from "@/components/blueprint-container";
import { Blueprint } from '@/types';

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
  const fetchData = useStore((state) => state.fetchData);
  const [selectedBlueprint, setSelectedBlueprint] = useState<Blueprint | null>(null);


  useEffect(() => {
    fetchData();
  }, [fetchData]);

	return (
		<html lang="en">
			<body className={inter.className}>
        <div className='pageContainer'>
          <div className='pageHeaderWrapper'>OpenForge Catalog
            <div className='pageHeaderRight'>
              <a href='https://github.com/devonjones/openforge-tutorials/wiki' target="_blank">Wiki</a> |&nbsp;
              <a href='https://www.patreon.com/masterworktools' target="_blank">Support us on Patreon</a>
            </div>
          </div>
          <div className='columnContainer'>
            <div className='tagContainerWrapper'>
              <TagContainer />
            </div>
            <div className='modelsContainerWrapper'>
              <ResultsContainer onSelect={setSelectedBlueprint} />
            </div>
            <div className='modelDetailsContainerWrapper'>
              <BlueprintContainer blueprint={selectedBlueprint} />
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
