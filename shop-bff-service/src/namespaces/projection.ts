import { Namespace, Server, Socket } from 'socket.io';
import { serviceAuth } from '../auth';

/**
 * Registers the projection namespace handlers on the BFF.
 * @param projectionNs - The Socket.IO Namespace for projections (e.g., '/order_projection').
 * @param io - The main Socket.IO Server instance, used to emit to web clients.
 */
export function registerProjection(
    projectionNs: Namespace,
    io: Server
) {
    projectionNs.use(serviceAuth);

    projectionNs.on('connection', (socket: Socket) => {
        console.log(
            `🔗 [bff-socket] ProjectionService connected socket=${socket.id} svc=${socket.data.serviceId}`
        );

        socket.on('orders_snapshot', (view: { userId: string; orders: any[] }) => {
            console.log('⬅️ [bff-socket] recieving orders_snapshot');
            io.to(view.userId).emit('orders_snapshot', view.orders);
            console.log(`➡️ [bff-socket] sending orders_snapshot → user=${view.userId}`);
        });

        socket.on('order_update', (order: { userId: string;[key: string]: any }) => {
            console.log('⬅️ [bff-socket] recieving order_update');
            io.to(order.userId).emit('order_update', order);
            console.log(`➡️ [bff-socket] sending order_update → user=${order.userId}`);
        });

        socket.on('disconnect', (reason) =>
            console.warn(`⚠️ [bff-socket] ProjectionService disconnected: ${reason}`)
        );
    });
}
