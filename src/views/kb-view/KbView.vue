<template>
  <PathsContext.Provider>
    <SidebarContext.Provider>
      <BlockTreeContext.Provider>
        <FocusModeContext.Provider>
          <FusionCommandContext.Provider>
            <MenubarContext.Provider>
              <TimeMachineContext.Provider>
                <FloatingMathInputContext.Provider>
                  <BlocksContext.Provider>
                    <LastFocusContext.Provider>
                      <KeymapContext.Provider>
                        <RefSuggestionsContext.Provider>
                          <AttachmentsManagerContext.Provider>
                            <ImagesContext.Provider>
                              <MainTreeContext.Provider>
                                <PomodoroContext.Provider>
                                  <KbViewContent />
                                </PomodoroContext.Provider>
                              </MainTreeContext.Provider>
                            </ImagesContext.Provider>
                          </AttachmentsManagerContext.Provider>
                        </RefSuggestionsContext.Provider>
                      </KeymapContext.Provider>
                    </LastFocusContext.Provider>
                  </BlocksContext.Provider>
                </FloatingMathInputContext.Provider>
              </TimeMachineContext.Provider>
            </MenubarContext.Provider>
          </FusionCommandContext.Provider>
        </FocusModeContext.Provider>
      </BlockTreeContext.Provider>
    </SidebarContext.Provider>
  </PathsContext.Provider>
</template>

<script setup lang="ts">
import BlocksContext from "@/context/blocks-provider/blocks";
import BlockTreeContext from "@/context/blockTree";
import FocusModeContext from "@/context/focusMode";
import FusionCommandContext from "@/context/fusionCommand";
import KeymapContext from "@/context/keymap";
import LastFocusContext from "@/context/lastFocus";
import MenubarContext from "@/context/menubar";
import SidebarContext from "@/context/sidebar";
import TimeMachineContext from "@/context/timeMachine";
import FloatingMathInputContext from "@/context/floatingMathInput";
import KbViewContent from "./KbViewContent.vue";
import RefSuggestionsContext from "@/context/refSuggestions";
import AttachmentsManagerContext from "@/context/attachmentsManager";
import ImagesContext from "@/context/images";
import PathsContext from "@/context/paths";
import MainTreeContext from "@/context/mainTree";
import { PomodoroContext } from "@/context/pomodoro";
</script>
