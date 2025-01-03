import { LoroDoc, type LoroEventBatch, type Subscription, VersionVector } from "loro-crdt";
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
  // 最后一次发送到服务端的版本向量
  lastSentVersion?: VersionVector;
  // 最后一次收到的 event batch
  lastEB: LoroEventBatch | null;
  subscriptions: Subscription[];
};

// 说明：
// 视图层的同步状态不能直接根据 docSynced 得到
// 因为 docSynced 只是表示同步层的数据已经和服务端同步了
// 而视图层需要处理完同步层发送的相关事件（blockDataMapChange, blockInfoMapChange）
// 根据这些事件更新 blocks，才真正完成了同步
// 但要注意：也有可能同步层的数据一开始就和服务端一致，那么同步层就不会发送
// blockDataMapChange, blockInfoMapChange 事件通知视图层更新视图层状态
// 此时视图层无从得知自己的状态是否和同步层 & 服务端一致
// 为此，我们在所有可能触发同步事件的地方，都检查到底有没有同步事件
// 并将这一信息通过 docSynced.hasSyncEvent 传递给外界
export type WsSynchronizerEvent = {
  docSynced: { docId: string; hasSyncEvent: boolean };
  disconnected: void;
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
  private eventBus: Emitter<WsSynchronizerEvent>;

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
    console.info(`[wsSynchronizer] Received startSyncMessage, docId: ${docController.docId}`);
    const doc = docController.doc;
    doc.import(msg.updates); // 导入 msg 中包含的服务端更新
    console.info(`[wsSynchronizer] Doc ${docController.docId} after import updates:`, doc.toJSON());
    const vv = VersionVector.decode(msg.vv);
    docController.lastSentVersion = vv;
    const clientUpdates = doc.export({ mode: "update", from: vv }); // Export client-side updates
    if (clientUpdates.length > 0) {
      const replyMsg = writePostUpdateMessage(msg.docId, clientUpdates);
      this._sendMessage(replyMsg);
      console.info(
        `[wsSynchronizer] Replied with postUpdateMessage, docId: ${docController.docId}`,
      );
    }
    // 等待同步事件，这里要用 queueMicrotask 推迟到下一个微任务循环
    // 这是因为 Loro 的内部限制，同步事件需要等到下一个微任务循环才能发送
    docController.lastEB = null;
    queueMicrotask(() => {
      const hasSyncEvent = docController.lastEB !== null;
      this.eventBus.emit("docSynced", { docId: docController.docId, hasSyncEvent });
    });
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
    console.info(`[wsSynchronizer] Received postUpdateMessage, docId: ${docController.docId}`);
    doc.import(msg.updates);
    console.info(
      `[wsSynchronizer] Received postUpdateMessage, doc ${docController.docId} after import updates:`,
      doc.toJSON(),
    );
    // 等待同步事件，这里要用 queueMicrotask 推迟到下一个微任务循环
    // 这是因为 Loro 的内部限制，同步事件需要等到下一个微任务循环才能发送
    docController.lastEB = null;
    queueMicrotask(() => {
      const hasSyncEvent = docController.lastEB !== null;
      this.eventBus.emit("docSynced", { docId: docController.docId, hasSyncEvent });
    });
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
        console.info("[wsSynchronizer] Connection opened");
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
        console.info("[wsSynchronizer] Connection closed");
        this.eventBus.emit("disconnected");
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
    console.info(`[wsSynchronizer] Sent postUpdateMessage, docId: ${docId}`);
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
    console.info(`[wsSynchronizer] Add new doc, docId: ${docId}`);
    const controller: LoroDocClientController = {
      docId,
      doc,
      lastSentVersion: undefined,
      lastEB: null,
      subscriptions: [],
    };

    // 订阅文档更新
    const sub = doc.subscribe((ev) => {
      console.info(`[wsSynchronizer] New event on doc ${docId}:`, ev);
      // 将所有本地更新推送到服务端
      if (ev.by === "local") {
        this._sendNewUpdatesToServer(docId);
      }
      controller.lastEB = ev; // 更新 lastEB
    });
    controller.subscriptions.push(sub);
    this.docs.set(docId, controller);
    // 当文档就绪时，发送 canSync 消息到服务端
    this.whenReady.then(() => {
      // 这里不知道为什么，不能用外部捕获的 doc，否则会报 rust 空指针异常
      const doc = this.docs.get(docId)?.doc;
      if (!doc) return;
      const msg = writeCanSyncMessage(docId, doc);
      this._sendMessage(msg);
      console.info(`[wsSynchronizer] Sent canSyncMessage, docId: ${docId}`);
    });
  }

  on<T extends keyof WsSynchronizerEvent>(
    event: T,
    listener: (data: WsSynchronizerEvent[T]) => void,
  ) {
    this.eventBus.on(event, listener);
  }

  off<T extends keyof WsSynchronizerEvent>(
    event: T,
    listener: (data: WsSynchronizerEvent[T]) => void,
  ) {
    this.eventBus.off(event, listener);
  }
}
