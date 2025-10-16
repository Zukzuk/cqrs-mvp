import { ICommand } from "../Commands";

export interface ICreateOrderCommand extends ICommand<{
    orderId: string;
    userId: string;
    total: number;
  }> { readonly type: 'CreateOrder';}

export interface IShipOrderCommand extends ICommand<{
    orderId: string;
    shippedAt?: string; // ISO date, defaults to now
    carrier: string;
    trackingNumber: string;
  }> { readonly type: 'ShipOrder';}

export type TOrderCommandUnion =
  ICreateOrderCommand
  | IShipOrderCommand;