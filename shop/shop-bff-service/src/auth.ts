import { Socket } from 'socket.io'

export function userAuth(socket: Socket, next: (err?: Error) => void) {
    const { userId } = socket.handshake.auth as { userId?: string }
    if (!userId) {
        console.error('❌ [bff-auth] Missing auth.userId')
        return next(new Error('auth error'))
    }
    socket.data.userId = userId
    console.log(`✅ [bff-auth] Accepted userId=${userId}`)
    next()
}

export function serviceAuth(socket: Socket, next: (err?: Error) => void) {
    const { serviceId } = socket.handshake.auth as { serviceId?: string }
    if (!serviceId) {
        console.error('❌ [bff-auth] Missing auth.serviceId')
        return next(new Error('auth error'))
    }
    socket.data.serviceId = serviceId;
    console.log(`✅ [bff-auth] Accepted serviceId=${serviceId}`)
    next()
}
