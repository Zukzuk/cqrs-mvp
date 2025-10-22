import { Server, Socket, Namespace } from 'socket.io'
import { RabbitMQBroker } from '@daveloper/broker'
import { userAuth } from '../auth'
import { TCalendarCommandUnion } from '@daveloper/interfaces'

export function registerWebClient(
    io: Server,
    broker: RabbitMQBroker,
    projectionNs: Namespace
) {
    // Apply user authentication middleware
    io.use(userAuth)

    // Handle WebClient connections
    io.on('connection', (socket: Socket) => {
        const userId = socket.data.userId as string
        console.log(`🔗 [bff-socket] WebClient connected to socket=${socket.id} as userId=${userId}`)
        socket.join(userId)

        // Ask for projection collections on connect
        projectionNs.emit('request_orders_snapshot', { userId })
        projectionNs.emit('request_calendars_snapshot', { userId })

        // Orders
        socket.on('order_command', async (raw, ack) => {
            // Ensure userId in payload
            raw.payload.userId = userId;
            try {
                await broker.send('commands.orders', raw)
                ack?.({ status: 'ok' })
            } catch (e: any) {
                ack?.({ status: 'error', error: e.message })
            }
        })

        // Calendars
        socket.on('calendar_command', async (raw: TCalendarCommandUnion, ack) => {
            // Ensure calendarId == userId (MVP convention)
            if (raw?.payload && 'calendarId' in raw.payload) {
                (raw as any).payload.calendarId = userId
            }
            try {
                await broker.send('commands.calendars', raw)
                ack?.({ status: 'ok' })
            } catch (e: any) {
                ack?.({ status: 'error', error: e.message })
            }
        })

        socket.on('disconnect', (reason) =>
            console.warn(`⚠️ [bff-socket] client disconnected: ${reason}`)
        )
    })
}