import { LoroDoc, type Subscription, VersionVector } from "loro-crdt";
import {
  MessageTypes,
  type ParsedMessageType,
  readMessage,
  writeCanSyncMessage,
  writePostUpdateMessage,
} from "@/common/loro/syncProtocol";
import { createPromise } from "@/utils/promise";
import type { ClientConnection, ClientNetwork } from "@/common/loro/network/client";
import mitt, { type Emitter } from "mitt";

export type LoroDocClientController = {
  docId: string;
  doc: LoroDoc;
  lastSentVersion?: VersionVector;
  subscriptions: Subscription[];
};

// 表示一个文档的同步状态
export type SyncStatus_Internal = "synced" | "disconnected";

export type LoroWebsocketSynchronizerEvent = {
  status: { syncStatus: "disconnected" } | { syncStatus: "synced"; docId: string };
};

// 同步器，其内部维护一个 websocket 连接
// 可以将多个文档通过 websocket 同步到服务端
export class LoroWebsocketSynchronizer {
  private connection: ClientConnection | null;
  private url: string;
  private protocol?: string;
  private network: ClientNetwork;
  private wsConnected: boolean;
  private wsConnecting: boolean;
  private docs: Map<string, LoroDocClientController>;
  private shouldReconnect: boolean;
  private unsuccessfulReconnects: number;
  private maxBackoffTime: number;
  private whenReady: Promise<void>;
  private whenReadyResolve: () => void;
  private eventBus: Emitter<any>;

  constructor(url: string, network: ClientNetwork, protocol?: string) {
    this.connection = null;
    this.url = url;
    this.protocol = protocol;
    this.network = network;
    this.docs = new Map();
    this.wsConnected = false;
    this.wsConnecting = false;
    this.shouldReconnect = false;
    this.unsuccessfulReconnects = 0;
    this.maxBackoffTime = 2500;
    const { promise, resolve } = createPromise<void>();
    this.whenReady = promise;
    this.whenReadyResolve = resolve;
    this.eventBus = mitt();
  }

  // 处理收到的 startSync 消息
  private _handleStartSyncMessage = (
    docController: LoroDocClientController,
    msg: ParsedMessageType<"startSync">,
  ) => {
    console.log(`[wsSynchronizer] Received startSyncMessage, docId: ${docController.docId}`);
    const doc = docController.doc;
    doc.import(msg.updates); // Import updates from server
    console.log(`[wsSynchronizer] Doc ${docController.docId} after import updates:`, doc.toJSON());
    const vv = VersionVector.decode(msg.vv);
    const clientUpdates = doc.export({ mode: "update", from: vv }); // Export client-side updates
    if (clientUpdates.length > 0) {
      const replyMsg = writePostUpdateMessage(msg.docId, clientUpdates);
      this._sendMessage(replyMsg);
      console.log(`[wsSynchronizer] Replied with postUpdateMessage, docId: ${docController.docId}`);
      this.eventBus.emit("status", { syncStatus: "synced", docId: docController.docId });
    }
  };

  // 处理收到的 postConflict 消息
  private _handlePostConflictMessage = (
    msg: ParsedMessageType<"postConflict">,
    docController: LoroDocClientController,
  ) => {
    throw new Error("PostConflictMessage handling not implemented");
  };

  // 处理收到的 postUpdate 消息
  private _handlePostUpdateMessage = (
    msg: ParsedMessageType<"postUpdate">,
    docController: LoroDocClientController,
  ) => {
    const doc = docController.doc;
    console.log("[wsSynchronizer] updates=", msg.updates);
    console.log(
      `[wsSynchronizer] Received postUpdateMessage, docId: ${docController.docId}, doc before import:`,
      doc.toJSON(),
    );

    doc.import(msg.updates);
    this.eventBus.emit("status", { syncStatus: "synced", docId: docController.docId });
    console.log(
      `[wsSynchronizer] Received postUpdateMessage, doc ${docController.docId} after import updates:`,
      doc.toJSON(),
    );
  };

  private _freeDocs() {
    for (const controller of this.docs.values()) {
      controller.doc.free();
    }
    this.docs.clear();
  }

  // 建立 websocket 连接
  private _setupConnection() {
    if (this.shouldReconnect && this.connection === null) {
      this.connection = this.network.connect(this.url, this.protocol);
      this.connection.onOpen(() => {
        console.log("[wsSynchronizer] Connection opened");
        this.wsConnecting = false;
        this.wsConnected = true;
        this.unsuccessfulReconnects = 0;
        this.whenReadyResolve();
      });

      this.connection.onMessage((data: Uint8Array) => {
        try {
          const parsedMsg = readMessage(data);
          const controller = this.docs.get(parsedMsg.docId);
          if (!controller) {
            console.error(`[wsSynchronizer] Doc not found: ${parsedMsg.docId}`);
            return;
          }
          if (parsedMsg.type === MessageTypes.startSync)
            this._handleStartSyncMessage(controller, parsedMsg);
          else if (parsedMsg.type === MessageTypes.postConflict)
            this._handlePostConflictMessage(parsedMsg, controller);
          else if (parsedMsg.type === MessageTypes.postUpdate)
            this._handlePostUpdateMessage(parsedMsg, controller);
          else console.error(`[wsSynchronizer] Unknown message type: ${parsedMsg.type}`);
        } catch (err) {
          console.error("[wsSynchronizer] Error handling message:", err);
        }
      });

      this.connection.onError((event) => {
        console.error("[wsSynchronizer] Connection error:", event);
      });

      this.connection.onClose(() => {
        console.log("[wsSynchronizer] Connection closed");
        this.eventBus.emit("status", { syncStatus: "disconnected" });
        this.connection = null;
        this.wsConnecting = false;
        if (this.wsConnected) {
          this.wsConnected = false;
          this._freeDocs();
          const { promise, resolve } = createPromise<void>();
          this.whenReady = promise;
          this.whenReadyResolve = resolve;
        } else {
          this.unsuccessfulReconnects++;
        }
        setTimeout(
          () => this._setupConnection(),
          Math.min(Math.pow(2, this.unsuccessfulReconnects) * 100, this.maxBackoffTime),
        );
      });

      this.wsConnecting = true;
      this.wsConnected = false;
      this._freeDocs();
    }
  }

  // 发送消息到服务端
  private _sendMessage(msg: Uint8Array) {
    const conn = this.connection;
    if (!conn) {
      console.error("[wsSynchronizer] Connection not established, cannot send message");
      return;
    }
    conn.send(msg);
  }

  // 将文档未发送的更新发送到服务端
  private _sendNewUpdatesToServer(docId: string) {
    const controller = this.docs.get(docId);
    if (!controller) {
      console.error(`[wsSynchronizer] Doc ${docId} not found`);
      return;
    }

    // Only send updates that are not sent before
    const updates = controller.doc.export({
      mode: "update",
      from: controller.lastSentVersion,
    });
    if (updates.length === 0) return;
    controller.lastSentVersion = controller.doc.version();
    const msg = writePostUpdateMessage(docId, updates);
    this._sendMessage(msg);
    console.log(`[wsSynchronizer] Sent postUpdateMessage, docId: ${docId}`);
  }

  connect() {
    this.shouldReconnect = true;
    if (!this.wsConnected && this.connection === null) {
      this._setupConnection();
    }
  }

  disconnect() {
    this.shouldReconnect = false;
    if (this.connection !== null) {
      this.connection.close();
      this.connection = null;
    }
  }

  destroy() {
    this.disconnect();
  }

  async addLoroDoc(docId: string, doc: LoroDoc) {
    if (this.docs.has(docId)) {
      console.error(`[wsSynchronizer] Doc already added, do nothing, docId: ${docId}`);
      return;
    }
    console.log(`[wsSynchronizer] Add new doc, docId: ${docId}`);
    // Subscribe to doc updates and send new local updates to server
    const sub = doc.subscribe((ev) => {
      console.log(`[wsSynchronizer] New event on doc ${docId}:`, ev);
      if (ev.by === "local") {
        this._sendNewUpdatesToServer(docId);
      }
    });
    const controller: LoroDocClientController = {
      docId,
      doc,
      lastSentVersion: undefined,
      subscriptions: [sub],
    };
    this.docs.set(docId, controller);
    // Send canSync message to server when ready
    this.whenReady.then(() => {
      // 这里不知道为什么，不能用外部捕获的 doc，否则会报 rust 空指针异常
      const doc = this.docs.get(docId)?.doc;
      if (!doc) return;
      const msg = writeCanSyncMessage(docId, doc);
      this._sendMessage(msg);
      console.log(`[wsSynchronizer] Sent canSyncMessage, docId: ${docId}`);
    });
  }

  on<T extends keyof LoroWebsocketSynchronizerEvent>(
    event: T,
    listener: (data: LoroWebsocketSynchronizerEvent[T]) => void,
  ) {
    this.eventBus.on(event, listener);
  }

  off<T extends keyof LoroWebsocketSynchronizerEvent>(
    event: T,
    listener: (data: LoroWebsocketSynchronizerEvent[T]) => void,
  ) {
    this.eventBus.off(event, listener);
  }
}