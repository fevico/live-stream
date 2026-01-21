import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';

@WebSocketGateway({
  cors: {
    origin: '*', // Allow all for local dev (change to your frontend URL later)
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Optional but helpful for debugging:
  transports: ['polling', 'websocket'], // Explicitly allow both
})
export class MatchEventsGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer() server: Server;
  private logger = new Logger('MatchGateway');

  // Change Map key to string (room name is always string)
  private connectedClients = new Map<string, Set<string>>(); // string (matchIdStr) → Set<socket.id>

  handleConnection(client: Socket) {
    this.logger.log(
      `Client connected: ${client.id} from IP ${client.handshake.address}`,
    );
    // Optional: client.emit('welcome', 'Hello from server!');
  }

  handleDisconnect(client: Socket) {
    // Cleanup: need to iterate and convert back if needed, but we'll adjust below
    for (const [matchIdStr, sockets] of this.connectedClients.entries()) {
      if (sockets.has(client.id)) {
        sockets.delete(client.id);
        if (sockets.size === 0) this.connectedClients.delete(matchIdStr);
        client.to(matchIdStr).emit('userLeft', { userId: client.id });
      }
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message') // or any event
  handleAny(@MessageBody() data: any, @ConnectedSocket() client: Socket) {
    this.logger.log(`Received message: ${JSON.stringify(data)}`);
  }
  
  @SubscribeMessage('joinMatch')
  handleJoinMatch(
    @MessageBody() matchId: number, // client sends number
    @ConnectedSocket() client: Socket,
  ) {
    if (!matchId) return client.emit('error', 'Match ID required');

    const matchIdStr = matchId.toString(); // ← Convert to string for room

    client.join(matchIdStr);
    if (!this.connectedClients.has(matchIdStr)) {
      this.connectedClients.set(matchIdStr, new Set());
    }
    this.connectedClients.get(matchIdStr)!.add(client.id);

    client.to(matchIdStr).emit('userJoined', { userId: client.id });
    client.emit('joinedMatch', { matchId }); // can keep as number for client
  }

  @SubscribeMessage('leaveMatch')
  handleLeaveMatch(
    @MessageBody() matchId: number,
    @ConnectedSocket() client: Socket,
  ) {
    const matchIdStr = matchId.toString();
    client.leave(matchIdStr);

    const room = this.connectedClients.get(matchIdStr);
    if (room) {
      room.delete(client.id);
      if (room.size === 0) this.connectedClients.delete(matchIdStr);
    }
    client.to(matchIdStr).emit('userLeft', { userId: client.id });
  }

  @SubscribeMessage('chatMessage')
  handleChatMessage(
    @MessageBody() data: { matchId: number; text: string; user?: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!data.text?.trim() || data.text.length > 500) {
      return client.emit('error', 'Invalid message');
    }

    const matchIdStr = data.matchId.toString(); // ← Convert here

    this.server.to(matchIdStr).emit('chatMessage', {
      text: data.text,
      user: data.user || `User-${client.id.slice(0, 6)}`,
      timestamp: new Date(),
    });
  }

  @SubscribeMessage('typing')
  handleTyping(
    @MessageBody() data: { matchId: number; isTyping: boolean },
    @ConnectedSocket() client: Socket,
  ) {
    const matchIdStr = data.matchId.toString(); // ← Convert
    client
      .to(matchIdStr)
      .emit('typing', { userId: client.id, isTyping: data.isTyping });
  }

  // Public method called from simulator/service — matchId is number
  broadcastToMatch(matchId: number, event: string, data: any) {
    const matchIdStr = matchId.toString(); // ← Convert to string for room
    this.server.to(matchIdStr).emit(event, data);
  }
}
