"use client";

import * as React from "react";
import Image from "next/image";
import { useEffect, useState } from "react";
export function NavigationMenuDemo() {
  const [isDarkMode, setIsDarkMode] = useState(false);

  // Synchroniser l'état du thème avec la classe du document
  useEffect(() => {
    if (typeof document !== "undefined") {
      const isDark = document.documentElement.classList.contains("dark");
      setIsDarkMode(isDark);
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", !isDarkMode);
    }
  };

  return (
    <div>
      {/* Navbar principale */}
      <div className="flex items-center justify-center w-full px-4 mt-2 relative">
        {/* Logo centré et encore agrandi */}
        <div className="flex items-center">
          <Image
            src="/COINIKO.gif"
            alt="Logo"
            width={150} // Largeur augmentée
            height={60} // Hauteur augmentée
            priority
            className="object-contain"
          />
        </div>

        {/* Bouton pour changer le thème, moderne */}
        <button
          onClick={toggleTheme}
          className="absolute right-4 px-3 py-2 rounded-full border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-center shadow-md hover:shadow-lg transition-all"
        >
          <Image
            src={isDarkMode ? "/sun-icon.png" : "/moon-icon.png"}
            alt={isDarkMode ? "Light Mode" : "Dark Mode"}
            width={24}
            height={24}
            className="object-contain"
          />
        </button>
      </div>

      {/* Ligne de séparation */}
      <div className="w-full h-[1px] bg-gray-300 dark:bg-gray-700 mt-2"></div>
    </div>
  );
}
