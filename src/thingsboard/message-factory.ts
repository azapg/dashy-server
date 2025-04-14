import type {AuthMessage, Command, CommandMessage} from "./types.ts";

export class MessageFactory {
  static createAuthMessage(token: string, cmdId: number): AuthMessage {
    return {
      authCmd: {
        cmdId,
        token,
      }
    }
  }

  static createCommandMessage(cmd: Command): CommandMessage {
    return {
      cmds: [cmd]
    }
  }

  static createMultipleCommandMessage(commands: Command[]): CommandMessage {
    return {
      cmds: commands
    }
  }

  static createTelemetryCommand(
    entityId: string,
    entityType: string = "DEVICE",
    scope: string = "LATEST_TELEMETRY",
    cmdId: number = 10,
    type: string = "TIMESERIES"
  ): Command {
    return {
      entityType,
      entityId,
      scope,
      cmdId,
      type,
    }
  }
}