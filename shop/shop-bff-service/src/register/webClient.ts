import { Server, Socket, Namespace } from 'socket.io'
import { RabbitMQBroker } from '@daveloper/broker'
import { trace } from '@daveloper/opentelemetry';
import { userAuth } from '../auth'

export function registerWebClient(
    io: Server,
    broker: RabbitMQBroker,
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
         * Commands go point-to-point
         */
        socket.on('command', async (raw, ack) => {
            console.log('⬅️ [bff-socket] recieving command from client:', raw)
            raw.payload.userId = userId;

            const span = trace.getActiveSpan();
            span?.setAttribute('messaging.message.conversation_id', raw.correlationId);
            span?.setAttribute('user.id', userId);

            try {
                await broker.send('commands.orders', raw)
                console.log('✅ [bff-broker] command published')
                ack?.({ status: 'ok' })
            } catch (e: any) {
                console.error('❌ [bff-broker] command publish failed', e)
                ack?.({ status: 'error', error: e.message })
            }
        })

        socket.on('disconnect', reason =>
            console.warn(`⚠️ [bff-socket] client disconnected: ${reason}`)
        )
    })
}
