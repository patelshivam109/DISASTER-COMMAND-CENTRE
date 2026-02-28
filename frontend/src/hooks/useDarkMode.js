import { useEffect, useState } from "react";

export default function useDarkMode() {
  const [isDark, setIsDark] = useState(() => {
    if (typeof window !== "undefined") {
      if (localStorage.getItem("theme")) {
        return localStorage.getItem("theme") === "dark";
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    const html = document.documentElement;

    if (isDark) {
      html.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      html.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  }, [isDark]);

  return [isDark, setIsDark];
}