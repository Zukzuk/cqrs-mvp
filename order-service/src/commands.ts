import { ICreateOrderCommand } from '@daveloper/interfaces';

export class CreateOrder implements ICreateOrderCommand {
  readonly type = 'CreateOrder';
  constructor(
    public payload: { orderId: string; userId: string, total: number },
    public correlationId: string,
  ) { }
}