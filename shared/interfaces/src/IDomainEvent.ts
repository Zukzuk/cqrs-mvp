export interface IDomainEvent {
  readonly type: string;
  readonly payload: any;
  readonly correlationId: string;
}