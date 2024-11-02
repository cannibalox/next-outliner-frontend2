<template>
  <div class="h-[100vh] w-[100vw]">
    <ToastProvider>
      <TooltipProvider>
        <ThemeProvider.Provider>
          <TokenProvider.Provider>
            <AxiosContext.Provider>
              <router-view />
            </AxiosContext.Provider>
          </TokenProvider.Provider>
        </ThemeProvider.Provider>
      </TooltipProvider>
    </ToastProvider>
  </div>
</template>

<script setup lang="ts">
import { TooltipProvider } from "../components/ui/tooltip";
import { ToastProvider } from "../components/ui/toast";
import TokenProvider from "../context/token";
import ThemeProvider from "../context/theme";
import AxiosContext from "../context/axios";
</script>
