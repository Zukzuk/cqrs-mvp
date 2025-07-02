export interface Command { type: string; payload: any; }

export class CreateOrder implements Command {
  readonly type = 'CreateOrder';
  constructor(public payload: { orderId: string; userId: string, total: number }) { }
}

export type AnyCommand = CreateOrder;