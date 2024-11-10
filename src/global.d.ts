import type KeymapContext from "./context/keymap";
import type BlocksContext from "./context/blocks-provider/blocks";
import type BlockTreeContext from "./context/blockTree";
import type FloatingMathInputContext from "./context/floatingMathInput";
import type TokenContext from "./context/token";
import type RefSuggestionsContext from "./context/refSuggestions";
import type ImagesContext from "./context/images";
import type AxiosContext from "./context/axios";
import type LastFocusContext from "./context/lastFocus";
import type PathsContext from "./context/paths";
import type MainTreeContext from "./context/mainTree";

export declare global {
  var getAxios: () => AxiosInstance | undefined;
  var getAxiosContext: () => ReturnType<typeof AxiosContext.useContext> | undefined;
  var getKeymapContext: () => ReturnType<typeof KeymapContext.useContext> | undefined;
  var getBlocksContext: () => ReturnType<typeof BlocksContext.useContext> | undefined;
  var getBlockTreeContext: () => ReturnType<typeof BlockTreeContext.useContext> | undefined;
  var getFloatingMathInputContext: () => ReturnType<typeof FloatingMathInputContext.useContext> | undefined;
  var getTokenContext: () => ReturnType<typeof TokenContext.useContext> | undefined;
  var getRefSuggestionsContext: () => ReturnType<typeof RefSuggestionsContext.useContext> | undefined;
  var getImagesContext: () => ReturnType<typeof ImagesContext.useContext> | undefined;
  var getMainTreeContext: () => ReturnType<typeof MainTreeContext.useContext> | undefined;
  var getLastFocusContext: () => ReturnType<typeof LastFocusContext.useContext> | undefined;
  var getPathsContext: () => ReturnType<typeof PathsContext.useContext> | undefined;
}