import { Server, Socket, Namespace } from 'socket.io'
import { RabbitMQBroker } from '@daveloper/broker'
import { userAuth } from '../auth'

export function registerWebClient(
    io: Server,
    bus: RabbitMQBroker,
    projectionNs: Namespace
) {
    io.use(userAuth)

    io.on('connection', (socket: Socket) => {
        const userId = socket.data.userId as string
        console.log(
            `🔗 [bff-socket] WebClient connected to socket=${socket.id} as userId=${userId}`
        )
        socket.join(userId)

        // ask projection for snapshot
        console.log(`➡️ [bff-socket] requesting snapshot for user=${userId}`)
        projectionNs.emit('request_snapshot', { userId })

        /*
         * Commands go point-to-point: send() directly into the commands queue 
         * and consumeQueue() asserts and reads that same queue. There’s exactly one queue, one handler.
         */
        socket.on('command', async (raw, ack) => {
            console.log('⬅️ [bff-socket] recieving command from client:', raw)
            raw.payload.userId = userId
            try {
                await bus.send('commands', raw)
                console.log('✅ [bff-bus] command published')
                ack?.({ status: 'ok' })
            } catch (e: any) {
                console.error('❌ [bff-bus] command publish failed', e)
                ack?.({ status: 'error', error: e.message })
            }
        })

        socket.on('disconnect', reason =>
            console.warn(`⚠️ [bff-socket] client disconnected: ${reason}`)
        )
    })
}
