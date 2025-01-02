<template>
  <SettingsContext.Provider>
    <BasicSettingsContext.Provider>
      <PathsContext.Provider>
        <BlockTreeContext.Provider>
          <PasteDialogContext.Provider>
            <FocusModeContext.Provider>
              <TimeMachineContext.Provider>
                <FloatingMathInputContext.Provider>
                  <BlocksContext.Provider>
                    <ExporterContext.Provider>
                      <CreateNewTreeDialogContext.Provider>
                        <IndexContext.Provider>
                          <BacklinksContext.Provider>
                            <AttachmentsManagerContext.Provider>
                              <ImagesContext.Provider>
                                <SidebarContext.Provider>
                                  <LastFocusContext.Provider>
                                    <KeymapContext.Provider>
                                      <RefSuggestionsContext.Provider>
                                        <BlockMoverContext.Provider>
                                          <MainTreeContext.Provider>
                                            <BlockSelectDragContext.Provider>
                                              <SettingsPanelContext.Provider>
                                                <FavoriteContext.Provider>
                                                  <FieldsManagerContext.Provider>
                                                    <FloatingEditorContext.Provider>
                                                      <FieldValueInspectorContext.Provider>
                                                        <DailyNoteContext.Provider>
                                                          <FusionCommandContext.Provider>
                                                            <KbViewContent />
                                                          </FusionCommandContext.Provider>
                                                        </DailyNoteContext.Provider>
                                                      </FieldValueInspectorContext.Provider>
                                                    </FloatingEditorContext.Provider>
                                                  </FieldsManagerContext.Provider>
                                                </FavoriteContext.Provider>
                                              </SettingsPanelContext.Provider>
                                            </BlockSelectDragContext.Provider>
                                          </MainTreeContext.Provider>
                                        </BlockMoverContext.Provider>
                                      </RefSuggestionsContext.Provider>
                                    </KeymapContext.Provider>
                                  </LastFocusContext.Provider>
                                </SidebarContext.Provider>
                              </ImagesContext.Provider>
                            </AttachmentsManagerContext.Provider>
                          </BacklinksContext.Provider>
                        </IndexContext.Provider>
                      </CreateNewTreeDialogContext.Provider>
                    </ExporterContext.Provider>
                  </BlocksContext.Provider>
                </FloatingMathInputContext.Provider>
              </TimeMachineContext.Provider>
            </FocusModeContext.Provider>
          </PasteDialogContext.Provider>
        </BlockTreeContext.Provider>
      </PathsContext.Provider>
    </BasicSettingsContext.Provider>
  </SettingsContext.Provider>
</template>

<script setup lang="ts">
import BlocksContext from "@/context/blocks/blocks";
import BlockTreeContext from "@/context/blockTree";
import FocusModeContext from "@/context/focusMode";
import FusionCommandContext from "@/context/fusionCommand";
import KeymapContext from "@/context/keymap";
import LastFocusContext from "@/context/lastFocus";
import SidebarContext from "@/context/sidebar";
import TimeMachineContext from "@/context/timeMachine";
import FloatingMathInputContext from "@/context/floatingMathInput";
import KbViewContent from "./KbViewContent.vue";
import RefSuggestionsContext from "@/context/refSuggestions";
import AttachmentsManagerContext from "@/context/attachmentsManager";
import ImagesContext from "@/context/images";
import PathsContext from "@/context/paths";
import MainTreeContext from "@/context/mainTree";
import BlockSelectDragContext from "@/context/blockSelect";
import SettingsContext from "@/context/settings";
import SettingsPanelContext from "@/context/settingsPanel";
// import GtdContext from "@/context/gtd";
import BlockMoverContext from "@/context/blockMover";
import FavoriteContext from "@/context/favorite";
import IndexContext from "@/context";
import BasicSettingsContext from "@/context/basicSettings";
import FieldsManagerContext from "@/context/fieldsManager";
import BacklinksContext from "@/context/backlinks";
import PasteDialogContext from "@/context/pasteDialog";
import CreateNewTreeDialogContext from "@/context/createNewTreeDialog";
import FloatingEditorContext from "@/context/floatingEditor";
import ExporterContext from "@/context/exporter";
import FieldValueInspectorContext from "@/context/fieldValueInspector";
import DailyNoteContext from "@/context/dailynote";
</script>
