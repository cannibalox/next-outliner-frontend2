import { createContext } from "@/utils/createContext";
import { useColorMode } from '@vueuse/core';

export const ThemeContext = createContext(() => {
  const theme = useColorMode();

  const toggleTheme = () => {
    theme.value = theme.value === "dark" ? "light" : "dark";
  };

  return {
    theme,
    toggleTheme,
  };
});

export default ThemeContext;
