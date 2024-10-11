import { defineModule } from "@/modules/registry";
import { settings } from "@/modules/settings";
import { ref } from "vue";
import * as Y from "yjs";
import type { BlockInfo } from "./types";
import type { WebsocketProvider } from "y-websocket";

export const YjsManager = defineModule(
  "yjsManager",
  [settings],
  ({ settings }) => {
    const baseDoc = ref<Y.Doc | null>(null);
    const blockInfoMap = ref<Y.Map<BlockInfo> | null>(null);
    const blockDataDocs = ref<Y.Map<Y.Doc> | null>(null);
    const wsProvider = ref<WebsocketProvider | null>(null); 
    
    return {};
  }
)

// export class YjsManager
//   implements ExposedSth<ReturnType<YjsManager["getExposed"]>>
// {
//   private _baseDoc: Ref<Y.Doc | null> = ref(null);
//   private _blockInfoMap: Ref<Y.Map<BlockInfo> | null> = ref(null);
//   private _blockDataDocs: Ref<Y.Map<Y.Doc> | null> = ref(null);
//   private _wsProvider: Ref<WebsocketProvider | null> = ref(null);

//   getExposed() {
//     return {
//       connect: this.connect,
//       disconnect: this.disconnect,
//       blockInfoMap: this._blockInfoMap,
//       blockDataDocs: this._blockDataDocs,
//     };
//   }

//   connect() {
//     const { serverUrl, location } = appState.settingsManager;
//     const { token } = appState.backendApi;

//     // close old ws
//     this._wsProvider.value?.disconnect();

//     if (serverUrl.value?.length > 0 && location.value?.length > 0 && token.value?.length > 0) {
//       // reconnect acc. new settings
//       this._baseDoc.value = new Y.Doc();
//       this._blockInfoMap.value = this._baseDoc.value.getMap("blockInfoMap");
//       this._blockDataDocs.value = this._baseDoc.value.getMap("blockDataDocs");
//       this._wsProvider.value = new WebsocketProvider(
//         serverUrl.value,
//         location.value,
//         this._baseDoc.value,
//         {
//           params: {
//             location: location.value,
//             authorization: token.value,
//           },
//         },
//       );

//       // listen to events

//     } else {
//       // reset
//       this._baseDoc.value = null;
//       this._blockInfoMap.value = null;
//       this._blockDataDocs.value = null;
//       this._wsProvider.value = null;
//     }
//   }

//   disconnect() {
//     this._wsProvider.value?.disconnect();
//     this._baseDoc.value = null;
//     this._blockInfoMap.value = null;
//     this._blockDataDocs.value = null;
//     this._wsProvider.value = null;
//   }
// }
