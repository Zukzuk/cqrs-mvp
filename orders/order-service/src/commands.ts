import { ICreateOrderCommand, IShipOrderCommand } from '@daveloper/interfaces';

export class CreateOrder implements ICreateOrderCommand {
  readonly type = 'CreateOrder';
  constructor(
    public payload: ICreateOrderCommand["payload"], 
    public correlationId: string
  ) {}
}

export class ShipOrder implements IShipOrderCommand {
  readonly type = 'ShipOrder';
  constructor(
    public payload: IShipOrderCommand["payload"], 
    public correlationId: string
  ) {}
}
