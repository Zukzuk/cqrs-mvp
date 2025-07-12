export interface ICommand {
    readonly type: string;
    readonly payload: any;
    readonly correlationId: string;
}