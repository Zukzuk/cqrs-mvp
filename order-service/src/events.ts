export interface DomainEvent { type: string; payload: any; }
export class OrderCreated implements DomainEvent {
  type = 'OrderCreated';
  constructor(public payload: { orderId: string; total: number }) {}
}