import {Events, type Message} from "./types.ts";
import WebSocket from "ws";
import EventEmitter from 'node:events';
import {MessageFactory} from "./message-factory.ts";
import axios from 'axios'

export type UsernamePasswordCredentials = {
  username: string;
  password: string;
};

export type TokenCredentials = {
  token: string;
  refreshToken: string;
};


export function isEmailPasswordCredentials(credentials: ClientCredentials): credentials is UsernamePasswordCredentials {
  return 'username' in credentials && 'password' in credentials;
}

export function isTokenCredentials(credentials: ClientCredentials): credentials is TokenCredentials {
  return 'token' in credentials && 'refreshToken' in credentials;
}

export class BadCredentialsError extends Error {}

export type ClientCredentials = UsernamePasswordCredentials | TokenCredentials;

/**
 * A small wrapper of both the ThingsBoard's WebSocket and REST APIs.
 *
 */
export class ThingsBoardClient {
  private socket: WebSocket | undefined;
  private eventEmitter = new EventEmitter()
  private token: string = "";
  private refreshToken: string = "";
  private connected: boolean = false; // We should do heartbeats

  private THINGSBOARD_REST_API_URL = process.env.THINGSBOARD_REST_API_URL;

  // TODO: This should have a config parameter instead of the URL of the ws,
  //  that way you can also configurate the ThingsBoard's REST API URL
  async setup(url: string, credentials: ClientCredentials): Promise<void> {
    this.socket = new WebSocket(url);
    this.socket.on('open', async () => {
      this.connected = true;

      if (!this.THINGSBOARD_REST_API_URL) {
        this.connected = false;
        throw new Error("ThingsBoard REST API URL is missing!")
      }

      if (isEmailPasswordCredentials(credentials)) {
        await this.getToken(credentials);
      } else if (isTokenCredentials(credentials)) {
        this.token = credentials.token;
        this.refreshToken = credentials.refreshToken;
      } else {
        this.connected = false;
        throw new BadCredentialsError("Unable to parse ThingsBoard credentials!")
      }

      const authMessage = MessageFactory.createAuthMessage(this.token, 0);

      // When the token is invalid, the connection closes. Listen to that
      this.send(authMessage);
    })

    this.socket.on('message', (message) => {
      const content = JSON.parse(message.toString());
      // TODO: define parameters for each type of message.
      this.eventEmitter.emit(Events.MESSAGE, {content});
    })


    this.socket.on('close', (code, reason) => {
      this.connected = false;
      if(code === 1007) {
        throw new BadCredentialsError("ThingsBoard WebSocket connection closed due to invalid credentials!")
      }
    })
  }

  isConnected(): boolean {
    return this.connected
  }

  subscribe(entityId: string) {
    const subscriptionCommand = MessageFactory.createTelemetryCommand(entityId);
    const subscriptionMessage = MessageFactory.createCommandMessage(subscriptionCommand);

    this.send(subscriptionMessage);
  }

  on(event: Events, listener: (...args: any[]) => any) {
    this.eventEmitter.on(event, listener);
  }

  disconnect(): void {
    if(!this.socket) {
      return;
    }

    this.socket.close();
  }

  terminate(): void {
    if(!this.socket) {
      return;
    }

    this.socket.terminate();
  }

  private send(message: Message) {
    if(!this.socket) {
      throw new Error("ThingsBoard WS Client can't send messages because is not initialized!")
    }

    if(this.socket.readyState !== WebSocket.OPEN) {
      console.error("Cannot send message: WebSocket is not open!");
    }

    this.socket.send(JSON.stringify(message));
  }

  private async getToken(credentials: UsernamePasswordCredentials) {
    let data = JSON.stringify({
      "username": credentials.username,
      "password": credentials.password,
    });

    let config = {
      method: 'post',
      maxBodyLength: Infinity,
      url: `${this.THINGSBOARD_REST_API_URL}/api/auth/login`,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      data: data
    };

    const response = await axios.request(config);

    if(response.status !== 200) {
      throw new Error(`Couldn't retrieve token: ${response.data.message}`);
    }

    this.token = response.data.token;
    this.refreshToken = response.data.refreshToken;
  }
}