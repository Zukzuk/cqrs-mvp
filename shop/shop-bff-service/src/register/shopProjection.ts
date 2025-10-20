import { Namespace, Server, Socket } from 'socket.io'
import { serviceAuth } from '../auth'

export function registerShopProjection(projectionNs: Namespace, io: Server) {
    projectionNs.use(serviceAuth)

    projectionNs.on('connection', (socket: Socket) => {
        console.log(`🔗 [bff-socket] ProjectionService connected on socket=${socket.id} as serviceId=${socket.data.serviceId}`)

        socket.on('orders_snapshot', (view: { userId: string; orders: any[] }) => {
            io.to(view.userId).emit('orders_snapshot', view.orders)
        })
        socket.on('order_update', async (order: { userId: string;[k: string]: any }) => {
            io.to(order.userId).emit('order_update', order)
        })

        socket.on('calendars_snapshot', (payload: { userId: string; calendar: any }) => {
            io.to(payload.userId).emit('calendars_snapshot', payload.calendar)
        })
        socket.on('calendar_update', async (payload: { userId: string;[k: string]: any }) => {
            io.to(payload.userId).emit('calendar_update', payload)
        })
    })
}