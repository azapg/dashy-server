export interface Message {}

export interface AuthCommand extends Message {
  cmdId: number;
  token: string;
}

export interface AuthMessage extends Message {
  authCmd: AuthCommand;
}

export interface Command {
  entityType: string;
  entityId: string;
  scope: string;
  cmdId: number;
  type: string;
}

export interface CommandMessage {
  cmds: Command[];
}

export enum Events {
  MESSAGE="EVENT_MESSAGE"
}