import { Namespace, Server, Socket } from 'socket.io';
import { serviceAuth } from '../auth';

export function registerShopProjection(
    projectionNs: Namespace,
    io: Server
) {
    projectionNs.use(serviceAuth);

    projectionNs.on('connection', (socket: Socket) => {
        console.log(
            `🔗 [bff-socket] ProjectionService connected on socket=${socket.id} as serviceId=${socket.data.serviceId}`
        );

        socket.on('orders_snapshot', (view: { userId: string; orders: any[] }) => {
            console.log('⬅️ [bff-socket] recieving orders_snapshot');
            io.to(view.userId).emit('orders_snapshot', view.orders);
            console.log(`➡️ [bff-socket] sending orders_snapshot → user=${view.userId}`);
        });

        socket.on('order_update', (order: { userId: string;[key: string]: any }) => {
            console.log('⬅️ [bff-socket] receiving order_update');

            // --- Random delay between 0.5s and 2.5s ---
            const minMs = 500;
            const maxMs = 2500;
            const delay = Math.floor(Math.random() * (maxMs - minMs + 1)) + minMs;

            setTimeout(() => {
                io.to(order.userId).emit('order_update', order);
                console.log(`➡️ [bff-socket] sending order_update → user=${order.userId} (delayed ${delay} ms)`);
            }, delay);
        });

        socket.on('disconnect', (reason) =>
            console.warn(`⚠️ [bff-socket] ProjectionService disconnected: ${reason}`)
        );
    });
}
