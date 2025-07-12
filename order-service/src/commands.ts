import { ICommand } from '@daveloper/domain';

export class CreateOrder implements ICommand {
  readonly type = 'CreateOrder';
  constructor(
    public payload: { orderId: string; userId: string, total: number },
    public correlationId: string,
  ) { }
}