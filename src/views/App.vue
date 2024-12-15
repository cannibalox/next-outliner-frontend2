<template>
  <div class="h-[100vh] w-[100vw]">
    <TooltipProvider>
      <ThemeProvider.Provider>
        <ServerInfoContext.Provider>
          <KbInfoContext.Provider>
            <router-view />
            <Toaster />
          </KbInfoContext.Provider>
        </ServerInfoContext.Provider>
      </ThemeProvider.Provider>
    </TooltipProvider>
  </div>
</template>

<script setup lang="ts">
import { TooltipProvider } from "../components/ui/tooltip";
import { Toaster } from "../components/ui/toast";
import ThemeProvider from "../context/theme";
import ServerInfoContext from "../context/serverInfo";
import { KbInfoContext } from "@/context/kbinfo";
</script>
