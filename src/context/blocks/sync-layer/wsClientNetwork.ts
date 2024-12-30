import { type ClientConnection, type ClientNetwork } from "@/common/loro/network/client";
import * as url from "lib0/url";

export class WebsocketClientConnection implements ClientConnection {
  private ws: WebSocket;

  constructor(ws: WebSocket) {
    this.ws = ws;
  }

  send(message: Uint8Array): void {
    try {
      this.ws.send(message);
    } catch {
      this.close();
    }
  }

  close(): void {
    this.ws.close();
  }

  onMessage(handler: (msg: Uint8Array) => void): void {
    this.ws.onmessage = (event) => {
      // XXX maybe bad performance??
      event.data.arrayBuffer().then((buffer: ArrayBuffer) => {
        handler(new Uint8Array(buffer));
      });
    };
  }

  onClose(handler: () => void): void {
    this.ws.onclose = handler;
  }

  onError(handler: (error: any) => void): void {
    this.ws.onerror = handler;
  }

  onOpen(handler: () => void): void {
    this.ws.onopen = handler;
  }
}

export class WebsocketClientNetwork implements ClientNetwork {
  private params: any;
  private protocol?: string;

  constructor(params?: any, protocol?: string) {
    this.params = params;
    this.protocol = protocol;
  }

  // Establish a new client connection
  connect(serverUrl: string, protocol?: string): ClientConnection {
    const encodedParams = url.encodeQueryParams(this.params);
    const url_ = serverUrl + (encodedParams.length === 0 ? "" : "?" + encodedParams);
    const ws = new WebSocket(url_, this.protocol);
    return new WebsocketClientConnection(ws);
  }
}
