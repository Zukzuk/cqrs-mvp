export interface ICommand<P = any> {
  readonly type: string;
  readonly payload: P;
  readonly correlationId?: string;
}

interface ICommandPayload {
  orderId: string; 
  userId: string; 
  total: number;
}

export interface ICreateOrderCommand extends ICommand<ICommandPayload> {
  readonly type: 'CreateOrder';
}

export type TCommandUnion = ICreateOrderCommand /* | IOtherCommand | … */;