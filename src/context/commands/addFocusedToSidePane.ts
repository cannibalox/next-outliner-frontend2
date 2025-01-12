import { DI_FILTERS } from "../blockTree";
import LastFocusContext from "../lastFocus";
import SidebarContext from "../sidebar";

const addFocusedToSidePane = async () => {
  const { lastFocusedBlockTree, lastFocusedDiId } = LastFocusContext.useContext()!;
  const { addToSidePane } = SidebarContext.useContext()!;

  const tree = lastFocusedBlockTree.value;
  const diId = lastFocusedDiId.value;
  if (!tree || !diId) return false;

  const di = tree.getDi(diId);
  if (!di || !DI_FILTERS.isBlockDi(di)) return false;

  addToSidePane(di.block.id);
  return true;
};

export default addFocusedToSidePane;
