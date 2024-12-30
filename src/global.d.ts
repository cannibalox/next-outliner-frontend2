import type KeymapContext from "./context/keymap";
import type BlocksContext from "./context/blocks/blocks";
import type BlockTreeContext from "./context/blockTree";
import type FloatingMathInputContext from "./context/floatingMathInput";
import type RefSuggestionsContext from "./context/refSuggestions";
import type ImagesContext from "./context/images";
import type ServerInfoContext from "./context/serverInfo";
import type LastFocusContext from "./context/lastFocus";
import type PathsContext from "./context/paths";
import type MainTreeContext from "./context/mainTree";
import type BlockSelectDragContext from "./context/blockSelect";
import type SettingsContext from "./context/settings";
import type SettingsPanelContext from "./context/settingsPanel";
import type GtdContext from "./context/gtd";
import type IndexContext from "./context/index";
import type BasicSettingsContext from "./context/basicSettings";
import type FieldsManagerContext from "./context/fieldsManager";
import type BacklinksContext from "./context/backlinks";
import type PasteDialogContext from "./context/pasteDialog";
import type CreateNewTreeDialogContext from "./context/createNewTreeDialog";
import type FloatingEditorContext from "./context/floatingEditor";
import type ExporterContext from "./context/exporter";
import type DailyNoteContext from "./context/dailynote";
import type FusionCommandContext from "./context/fusionCommand";

export declare global {
  var getAxios: () => AxiosInstance | undefined;
  var getServerInfoContext: () => ReturnType<typeof ServerInfoContext.useContext> | undefined;
  var getKeymapContext: () => ReturnType<typeof KeymapContext.useContext> | undefined;
  var getBlocksContext: () => ReturnType<typeof BlocksContext.useContext> | undefined;
  var getBlockTreeContext: () => ReturnType<typeof BlockTreeContext.useContext> | undefined;
  var getFloatingMathInputContext: () =>
    | ReturnType<typeof FloatingMathInputContext.useContext>
    | undefined;
  var getRefSuggestionsContext: () =>
    | ReturnType<typeof RefSuggestionsContext.useContext>
    | undefined;
  var getImagesContext: () => ReturnType<typeof ImagesContext.useContext> | undefined;
  var getMainTreeContext: () => ReturnType<typeof MainTreeContext.useContext> | undefined;
  var getLastFocusContext: () => ReturnType<typeof LastFocusContext.useContext> | undefined;
  var getPathsContext: () => ReturnType<typeof PathsContext.useContext> | undefined;
  var getBlockSelectContext: () => ReturnType<typeof BlockSelectDragContext.useContext> | undefined;
  var getSettingsContext: () => ReturnType<typeof SettingsContext.useContext> | undefined;
  var getSettingsPanelContext: () => ReturnType<typeof SettingsPanelContext.useContext> | undefined;
  var getGtdContext: () => ReturnType<typeof GtdContext.useContext> | undefined;
  var getBlockMoverContext: () => ReturnType<typeof BlockMoverContext.useContext> | undefined;
  var getIndexContext: () => ReturnType<typeof IndexContext.useContext> | undefined;
  var getBasicSettingsContext: () => ReturnType<typeof BasicSettingsContext.useContext> | undefined;
  var getFieldsManagerContext: () => ReturnType<typeof FieldsManagerContext.useContext> | undefined;
  var getBacklinksContext: () => ReturnType<typeof BacklinksContext.useContext> | undefined;
  var getPasteDialogContext: () => ReturnType<typeof PasteDialogContext.useContext> | undefined;
  var getCreateNewTreeDialogContext: () =>
    | ReturnType<typeof CreateNewTreeDialogContext.useContext>
    | undefined;
  var getFloatingEditorContext: () =>
    | ReturnType<typeof FloatingEditorContext.useContext>
    | undefined;
  var getExporterContext: () => ReturnType<typeof ExporterContext.useContext> | undefined;
  var getDailyNoteContext: () => ReturnType<typeof DailyNoteContext.useContext> | undefined;
  var getFusionCommandContext: () => ReturnType<typeof FusionCommandContext.useContext> | undefined;
}
