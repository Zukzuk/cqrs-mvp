import { ICommand } from '@daveloper/interfaces';

export class CreateOrder implements ICommand {
  readonly type = 'CreateOrder';
  constructor(
    public payload: { orderId: string; userId: string, total: number },
    public correlationId: string,
  ) { }
}