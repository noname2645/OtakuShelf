import { DurableObject } from 'cloudflare:workers'

export class UserConnection extends DurableObject {
  constructor(state, env) {
    super(state, env)
    this.sessions = new Map()
  }

  async fetch(request) {
    const url = new URL(request.url)
    const userId = url.searchParams.get('userId')

    if (!userId) {
      return new Response('Missing userId', { status: 400 })
    }

    if (request.headers.get('Upgrade') !== 'websocket') {
      return new Response('Expected WebSocket', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [client, server] = Object.values(pair)

    this.ctx.acceptWebSocket(server)

    const id = crypto.randomUUID()
    this.sessions.set(id, { ws: server, userId })

    server.send(JSON.stringify({ type: 'connected', message: 'WebSocket connected' }))

    server.addEventListener('close', () => {
      this.sessions.delete(id)
    })

    server.addEventListener('error', (e) => {
      console.error(`[UserConnection] WS error for user ${userId}:`, e.message)
      this.sessions.delete(id)
    })

    return new Response(null, { status: 101, webSocket: client })
  }

  async broadcast(userId, message) {
    const data = typeof message === 'string' ? message : JSON.stringify(message)
    let sent = 0
    for (const [id, session] of this.sessions) {
      if (session.userId === userId && session.ws.readyState === 1) {
        try {
          session.ws.send(data)
          sent++
        } catch (e) {
          console.error(`[UserConnection] Broadcast error:`, e.message)
          this.sessions.delete(id)
        }
      }
    }
    return sent
  }

  async alarm() {
    // Cleanup stale sessions if needed
  }
}
