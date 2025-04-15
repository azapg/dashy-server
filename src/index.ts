import WebSocket, { WebSocketServer } from "ws";
import {ThingsBoardClient} from "./thingsboard/client.ts";
import {Events} from "./thingsboard/types.ts";
import https from 'https';

import 'dotenv/config';
import * as fs from "node:fs";

type TemperatureDataPoint = {
  timestamp: number;
  value: number;
  device: string;
}

const dataStack: TemperatureDataPoint[] = [];
const connectedClients = new Set<WebSocket>();

const THINGSBOARD_WEBSOCKET_URL = process.env.THINGSBOARD_WEBSOCKET_URL;
const PUBLIC_USERNAME = process.env.PUBLIC_USERNAME;
const PUBLIC_PASSWORD = process.env.PUBLIC_PASSWORD;
const PUBLIC_ENTITY_ID = process.env.PUBLIC_ENTITY_ID;

if (!THINGSBOARD_WEBSOCKET_URL) {
  console.error("THINGSBOARD_WEBSOCKET_URL is not defined in environment");
  process.exit(1);
}

if(!PUBLIC_USERNAME || !PUBLIC_PASSWORD) {
  console.error("Public credentials variables are missing in environment");
  process.exit(1);
}

if(!PUBLIC_ENTITY_ID) {
  console.error("PUBLIC_ENTITY_ID is not defined in environment");
  process.exit(1);
}

const client = new ThingsBoardClient();

await client.setup(THINGSBOARD_WEBSOCKET_URL, {
  username: PUBLIC_USERNAME,
  password: PUBLIC_PASSWORD,
})

// For testing, we have to wait just a little so the server responds to the setup
await new Promise((resolve) => {
  setInterval(resolve, 1000)
});

client.subscribe(PUBLIC_ENTITY_ID)

client.on(Events.MESSAGE, (message) => {
  const response = message.content;
  if (!response.subscriptionId) {
    return;
  }

  try {
    const point = response.data.temperature[0];

    const data: TemperatureDataPoint = {
      timestamp: point[0],
      value: point[1],
      device: "ThingsBoard",
    };

    dataStack.push(data);

    broadcast(data);
  } catch (error) {
    console.error("Error processing ThingsBoard message:", error);
  }
})

// TODO: These events should be managed by the ThingsBoardClient class
// client.on('error', (error) => {
//   console.error("ThingsBoard WebSocket error:", error);
// });
//
// client.on('close', () => {
//   console.log("ThingsBoard WebSocket connection closed");
//   setTimeout(() => {
//     console.log("Attempting to reconnect to ThingsBoard...");
//     oldClient.removeAllListeners();
//   }, 5000);

const SERVER_CERTIFICATE_PATH = process.env.SERVER_CERTIFICATE_PATH;
const PRIVATE_KEY_PATH = process.env.PRIVATE_KEY_PATH;
const CA_BUNDLE_PATH = process.env.CA_BUNDLE_PATH;

if(!PRIVATE_KEY_PATH) {
  console.error("PRIVATE_KEY_PATH is not defined in environment");
  process.exit(1)
}

if(!CA_BUNDLE_PATH) {
  console.error("CA_BUNDLE_PATH is not defined in environment");
  process.exit(1)

}
if(!SERVER_CERTIFICATE_PATH) {
  console.error("SERVER_CERTIFICATE_PATH is not defined in environment");
  process.exit(1)
}

const server = https.createServer({
  cert: fs.readFileSync(SERVER_CERTIFICATE_PATH),
  key: fs.readFileSync(PRIVATE_KEY_PATH),
  ca: fs.readFileSync(CA_BUNDLE_PATH),
});

const wss = new WebSocketServer({ server });

server.listen(443, () => {
  console.log('HTTPS & WSS server running on port 443');
});

wss.on("connection", (ws) => {
  connectedClients.add(ws);

  if (dataStack.length > 0) {
    const recentData = dataStack.slice(-50);
    recentData.forEach(point => {
      ws.send(JSON.stringify(point));
    });
  }

  ws.on('close', () => {
    connectedClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error("Client WebSocket error:", error);
    connectedClients.delete(ws);
  });
});

function broadcast(data: TemperatureDataPoint) {
  const message = JSON.stringify(data);
  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

wss.on('error', (error) => {
  console.error("WebSocket server error:", error);
});

setInterval(() => {
  if (dataStack.length > 1000) {
    dataStack.splice(0, dataStack.length - 1000);
  }
}, 60000);