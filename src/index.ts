import WebSocket, { WebSocketServer } from "ws";
import {ThingsBoardClient} from "./thingsboard/client.ts";
import {Events} from "./thingsboard/types.ts";

import 'dotenv/config';

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

const wss = new WebSocketServer({ port: 4000 });
console.log("WebSocket server started on port 4000");

wss.on("connection", (ws) => {
  connectedClients.add(ws);

  if (dataStack.length > 0) {
    const recentData = dataStack.slice(-50);
    recentData.forEach(point => {
      ws.send(JSON.stringify(point));
    });
  }

  ws.on('message', (message) => {
    // I don't know what messages could Dashy send
    console.log("Received message from oldClient:", message.toString());
  });

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