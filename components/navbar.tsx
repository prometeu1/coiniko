"use client";

import * as React from "react";
import Link from "next/link";
import Image from "next/image"; // Import de 'next/image'
import { useState } from "react";

import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
} from "@/components/ui/navigation-menu";

export function NavigationMenuDemo() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", !isDarkMode);
    }
  };

  return (
    <div>
      {/* Navbar principale */}
      <div className="flex items-center justify-between w-full px-4 mt-4">
        {/* Logo en GIF */}
        <div className="flex items-center">
          <Image
            src="/COINIKO.gif" // Source du GIF
            alt="Logo"
            width={100} // Largeur
            height={40} // Hauteur
            priority // Optimisation du chargement
            className="object-contain" // Style pour un rendu propre
          />
        </div>

        {/* Navigation Menu */}
        <NavigationMenu>
          <NavigationMenuList className="flex items-center space-x-4">
            <NavigationMenuItem>
              <Link href="/" legacyBehavior passHref>
                <NavigationMenuLink
                  className={`text-md px-4 py-2 rounded bg-[#004aad] text-white hover:bg-blue-600`}
                >
                  Home
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/market-insight" legacyBehavior passHref>
                <NavigationMenuLink
                  className={`text-md px-4 py-2 rounded bg-[#004aad] text-white hover:bg-blue-600`}
                >
                  Market Insights
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
            <NavigationMenuItem>
              <Link href="/coinlisting" legacyBehavior passHref>
                <NavigationMenuLink
                  className={`text-md px-4 py-2 rounded bg-[#004aad] text-white hover:bg-blue-600`}
                >
                  Coin Listing
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>

        {/* Bouton pour changer le thème */}
        <button
          onClick={toggleTheme}
          className="px-4 py-2 rounded bg-[#004aad] text-white hover:bg-blue-600"
        >
          {isDarkMode ? "Light Mode" : "Dark Mode"}
        </button>
      </div>

      {/* Ligne de séparation */}
      <div className="w-full h-[1px] bg-gray-300 dark:bg-gray-700 mt-2"></div>
    </div>
  );
}
