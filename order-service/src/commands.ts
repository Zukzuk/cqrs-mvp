export interface Command { type: string; payload: any; }
export class CreateOrderCommand implements Command {
  type = 'CreateOrder';
  constructor(public payload: { orderId: string; total: number }) {}
}