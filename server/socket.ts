import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { query, queryOne } from './db.ts';

const JWT_SECRET = process.env.JWT_SECRET || 'campushub-africa-secret-key-2026-secure';

let ioInstance: SocketIOServer | null = null;

export function getIO(): SocketIOServer | null {
  return ioInstance;
}

export function broadcastRealtime(event: string, payload: any) {
  if (ioInstance) {
    ioInstance.to('broadcast:all').emit(event, payload);
    ioInstance.emit(event, payload);
  }
}

export function sendToUserRealtime(userId: string, event: string, payload: any) {
  if (ioInstance) {
    ioInstance.to(`user:${userId}`).emit(event, payload);
  }
}

export function setupSocketIO(httpServer: HttpServer) {
  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  ioInstance = io;

  // Socket Authentication middleware: allow both authenticated users AND guest viewers
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    if (token && typeof token === 'string') {
      jwt.verify(token, JWT_SECRET, (err, decoded) => {
        if (!err && decoded) {
          (socket as any).user = decoded;
        }
        next();
      });
    } else {
      // Allow guest/anonymous connections for real-time live updates
      next();
    }
  });

  const broadcastOnlineCount = () => {
    const count = io.sockets.sockets.size;
    io.emit('presence:count', { onlineCount: Math.max(1, count) });
  };

  io.on('connection', (socket: Socket) => {
    // All connected devices join the general broadcast room
    socket.join('broadcast:all');

    const user = (socket as any).user;
    if (user && user.id) {
      socket.join(`user:${user.id}`);
    }

    broadcastOnlineCount();

    // Allow re-authentication without dropping websocket
    socket.on('authenticate', (data: { token?: string }) => {
      const token = data?.token;
      if (token && typeof token === 'string') {
        jwt.verify(token, JWT_SECRET, (err, decoded) => {
          if (!err && decoded) {
            (socket as any).user = decoded;
            socket.join(`user:${(decoded as any).id}`);
            socket.emit('authenticated', { user: decoded });
          }
        });
      }
    });

    // Join active conversation room
    socket.on('join_conversation', (convId: string) => {
      if (convId) {
        socket.join(`conv:${convId}`);
      }
    });

    socket.on('leave_conversation', (convId: string) => {
      if (convId) {
        socket.leave(`conv:${convId}`);
      }
    });

    // Typing indicators
    socket.on('typing', ({ convId, isTyping }: { convId: string; isTyping: boolean }) => {
      const u = (socket as any).user;
      if (convId && u) {
        socket.to(`conv:${convId}`).emit('user_typing', {
          convId,
          userId: u.id,
          isTyping
        });
      }
    });

    // Real-time message sending
    socket.on('send_message', async ({ convId, content, attachments = [] }, callback) => {
      try {
        const u = (socket as any).user;
        if (!u || !u.id) {
          if (callback) callback({ error: 'Connexion requise' });
          return;
        }

        if (!content || !content.trim()) {
          if (callback) callback({ error: 'Message vide' });
          return;
        }

        // Verify participation
        const participant = await queryOne(
          'SELECT id FROM conversation_participants WHERE conversation_id = $1 AND user_id = $2',
          [convId, u.id]
        );

        if (!participant) {
          if (callback) callback({ error: 'Non autorisé' });
          return;
        }

        const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        await query(`
          INSERT INTO messages (id, conversation_id, sender_id, content, attachments)
          VALUES ($1, $2, $3, $4, $5)
        `, [msgId, convId, u.id, content.trim(), JSON.stringify(attachments)]);

        await query('UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = $1', [convId]);
        await query('UPDATE conversation_participants SET last_read_at = CURRENT_TIMESTAMP WHERE conversation_id = $1 AND user_id = $2', [convId, u.id]);

        const fullMsg = await queryOne(`
          SELECT
            m.*,
            sp.first_name as sender_first_name, sp.last_name as sender_last_name,
            sp.avatar_url as sender_avatar
          FROM messages m
          JOIN student_profiles sp ON sp.user_id = m.sender_id
          WHERE m.id = $1
        `, [msgId]);

        const formatted = {
          ...fullMsg,
          attachments: JSON.parse(fullMsg.attachments || '[]')
        };

        // Broadcast to everyone in the conversation
        io.to(`conv:${convId}`).emit('new_message', formatted);

        // Notify other participants in their private rooms
        const otherParticipants = await query(
          'SELECT user_id FROM conversation_participants WHERE conversation_id = $1 AND user_id != $2',
          [convId, u.id]
        );

        for (const p of otherParticipants) {
          io.to(`user:${p.user_id}`).emit('conversation_updated', {
            convId,
            lastMessage: formatted
          });
        }

        if (callback) callback({ success: true, message: formatted });
      } catch (err: any) {
        console.error('Socket message error:', err);
        if (callback) callback({ error: 'Erreur lors de l\'envoi du message' });
      }
    });

    socket.on('disconnect', () => {
      broadcastOnlineCount();
    });
  });

  return io;
}

