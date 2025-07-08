export interface Command { type: string; payload: any; correlationId: string; }

export class CreateOrder implements Command {
  readonly type = 'CreateOrder';
  constructor(
    public payload: { orderId: string; userId: string, total: number },
    public correlationId: string,
  ) { }
}

export type AnyCommand = CreateOrder;