import type { Server as IOServer } from 'socket.io';

let io: IOServer | null = null;

export function setIO(server: IOServer) {
  io = server;
}

export type BoardEvent = 'card.created' | 'card.moved' | 'card.updated' | 'card.archived' | 'ai.job.completed';

export function emitBoard(event: BoardEvent, data: unknown) {
  io?.to('board').emit(event, data);
}
