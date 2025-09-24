import { ICommand } from "../Commands";

export interface ICreateOrderCommand extends ICommand<{
    orderId: string;
    userId: string;
    total: number;
  }> { readonly type: 'CreateOrder';}

export type TOrderCommandUnion =
  ICreateOrderCommand