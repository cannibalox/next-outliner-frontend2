<template>
  <SettingsContext.Provider>
    <BasicSettingsContext.Provider>
      <PathsContext.Provider>
        <BlockTreeContext.Provider>
          <PasteDialogContext.Provider>
            <FocusModeContext.Provider>
              <FusionCommandContext.Provider>
                <MenubarContext.Provider>
                  <TimeMachineContext.Provider>
                    <FloatingMathInputContext.Provider>
                      <BlocksContext.Provider>
                        <CreateNewTreeDialogContext.Provider>
                          <IndexContext.Provider>
                            <BacklinksContext.Provider>
                              <SidebarContext.Provider>
                                <LastFocusContext.Provider>
                                  <KeymapContext.Provider>
                                    <RefSuggestionsContext.Provider>
                                      <BlockMoverContext.Provider>
                                        <AttachmentsManagerContext.Provider>
                                          <ImagesContext.Provider>
                                            <MainTreeContext.Provider>
                                              <PomodoroContext.Provider>
                                                <BlockSelectContext.Provider>
                                                  <GtdContext.Provider>
                                                    <SettingsPanelContext.Provider>
                                                      <FavoriteContext.Provider>
                                                        <PowerupManagerContext.Provider>
                                                          <KbViewContent />
                                                        </PowerupManagerContext.Provider>
                                                      </FavoriteContext.Provider>
                                                    </SettingsPanelContext.Provider>
                                                  </GtdContext.Provider>
                                                </BlockSelectContext.Provider>
                                              </PomodoroContext.Provider>
                                            </MainTreeContext.Provider>
                                          </ImagesContext.Provider>
                                        </AttachmentsManagerContext.Provider>
                                      </BlockMoverContext.Provider>
                                    </RefSuggestionsContext.Provider>
                                  </KeymapContext.Provider>
                                </LastFocusContext.Provider>
                              </SidebarContext.Provider>
                            </BacklinksContext.Provider>
                          </IndexContext.Provider>
                        </CreateNewTreeDialogContext.Provider>
                      </BlocksContext.Provider>
                    </FloatingMathInputContext.Provider>
                  </TimeMachineContext.Provider>
                </MenubarContext.Provider>
              </FusionCommandContext.Provider>
            </FocusModeContext.Provider>
          </PasteDialogContext.Provider>
        </BlockTreeContext.Provider>
      </PathsContext.Provider>
    </BasicSettingsContext.Provider>
  </SettingsContext.Provider>
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
import BlockSelectContext from "@/context/blockSelect";
import SettingsContext from "@/context/settings";
import SettingsPanelContext from "@/context/settingsPanel";
import GtdContext from "@/context/gtd";
import BlockMoverContext from "@/context/blockMover";
import FavoriteContext from "@/context/favorite";
import IndexContext from "@/context";
import BasicSettingsContext from "@/context/basicSettings";
import PowerupManagerContext from "@/context/powerupManager";
import BacklinksContext from "@/context/backlinks";
import PasteDialogContext from "@/context/pasteDialog";
import CreateNewTreeDialogContext from "@/context/createNewTreeDialog";
</script>
