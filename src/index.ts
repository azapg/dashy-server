import WebSocket, { WebSocketServer } from "ws";
import 'dotenv/config';
import { MessageFactory } from "./thingsboard/message-factory.ts";

type TemperatureDataPoint = {
  timestamp: number;
  value: number;
  device: string;
}

const dataStack: TemperatureDataPoint[] = [];
const connectedClients = new Set<WebSocket>();

const wsUrl = process.env.THINGSBOARD_WEBSOCKET_URL;
if (!wsUrl) {
  console.error("THINGSBOARD_WEBSOCKET_URL is not defined in environment");
  process.exit(1);
}

const client = new WebSocket(wsUrl);
client.on('open', () => {
  console.log("Connected to ThingsBoard WebSocket");
  const token = process.env.PUBLIC_USER_TOKEN;
  const entityId = process.env.PUBLIC_ENTITY_ID;
  if (!token) {
    console.error("TOKEN is not defined in environment");
    process.exit(1);
  }
  if (!entityId) {
    console.error("entityId is not defined in environment");
    process.exit(1);
  }

  const authMessage = JSON.stringify(MessageFactory.createAuthMessage(token, 0));
  const telemetryCommand = MessageFactory.createTelemetryCommand(entityId);
  const commandMessage = JSON.stringify(
    MessageFactory.createCommandMessage(telemetryCommand)
  );

  client.send(authMessage);
  client.send(commandMessage);
});

client.on('message', (message) => {
  const response = JSON.parse(message.toString());

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
});

client.on('error', (error) => {
  console.error("ThingsBoard WebSocket error:", error);
});

client.on('close', () => {
  console.log("ThingsBoard WebSocket connection closed");
  setTimeout(() => {
    console.log("Attempting to reconnect to ThingsBoard...");
    client.removeAllListeners();
  }, 5000);
});

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
    console.log("Received message from client:", message.toString());
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