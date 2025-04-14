import type {Message} from "./types.ts";
import WebSocket from "ws";

export class ThingsboardWebsocketClient {
  private socket: WebSocket;

  constructor(url: string) {
    this.socket = new WebSocket(url);
  }

  authenticate(client: WebSocket) {

  }



  private send(message: Message) {
    if(this.socket.readyState !== WebSocket.OPEN) {
      console.error("Cannot send message: WebSocket is not open!");
    }

    this.socket.send(JSON.stringify(message));
  }
}