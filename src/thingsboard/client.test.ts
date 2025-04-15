import {BadCredentialsError, ThingsBoardClient} from "./client";

const THINGSBOARD_WEBSOCKET_URL = process.env.THINGSBOARD_WEBSOCKET_URL;
const PUBLIC_USERNAME = process.env.PUBLIC_USERNAME;
const PUBLIC_PASSWORD = process.env.PUBLIC_PASSWORD;

// writing tests is soo hard...
describe('ThingsBoardClient auth', () => {
  if (!THINGSBOARD_WEBSOCKET_URL) {
    throw new Error("Couldn't run client test because THINGSBOARD_WEBSOCKET_URL variable wasn't found")
  }

  it("connects with valid credentials", async () => {
    if (!PUBLIC_PASSWORD || !PUBLIC_USERNAME) {
      throw new Error("Couldn't run client valid credentials test because credentials variables were not found.")
    }

    const client = new ThingsBoardClient();
    await client.setup(THINGSBOARD_WEBSOCKET_URL, {
      username: PUBLIC_USERNAME,
      password: PUBLIC_PASSWORD,
    })

    await new Promise(resolve => setTimeout(resolve, 1000));

    expect(client.isConnected()).toBe(true);
  });

  it("disconnects with valid credentials", async () => {
    const client = new ThingsBoardClient();
    try {
      await client.setup(THINGSBOARD_WEBSOCKET_URL, {
        username: "invalid",
        password: "invalid",
      })
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BadCredentialsError);
    }
  })
})