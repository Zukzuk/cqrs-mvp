// Example: ShipButton.tsx
import { useMemo } from 'react';
import { io } from 'socket.io-client';
import { v4 as uuid } from 'uuid';

type Props = { orderId: string; disabled?: boolean };

export function ShipButton({ orderId, disabled }: Props) {
    const socket = useMemo(() => {
        // connects through Nginx to BFF; userId comes from your existing auth handshake
        return io('/', { transports: ['websocket'], auth: { userId: 'demo-user' } });
    }, []);

    const ship = () => {
        const correlationId = uuid();
        socket.emit('order_command', {
            type: 'ShipOrder',
            correlationId,
            payload: {
                orderId,
                // userId is injected by BFF on receive; optional extra fields:
                shippedAt: new Date().toISOString(),
                carrier: 'DHL',
                trackingNumber: 'TRACK-12345'
            }
        }, (ack: any) => {
            if (ack?.status !== 'ok') {
                console.error('ShipOrder failed:', ack?.error);
            }
        });
    };

    return (
        <button onClick={ship} disabled={disabled} style={{ padding: 8, borderRadius: 8 }}>
            Mark as SHIPPED
        </button>
    );
}
