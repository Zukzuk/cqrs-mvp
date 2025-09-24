import { ICreateOrderCommand } from '@daveloper/interfaces';

export class CreateOrder implements ICreateOrderCommand {
  readonly type = 'CreateOrder';
  constructor(
    public payload: ICreateOrderCommand["payload"],
    public correlationId: string,
  ) { }
}