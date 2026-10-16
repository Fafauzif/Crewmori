export class ServiceError extends Error {
  constructor(readonly code: string, message: string, readonly status = 400) {
    super(message);
    this.name = "ServiceError";
  }
}

export function assertService(value: unknown, code: string, message: string, status = 400): asserts value {
  if (!value) throw new ServiceError(code, message, status);
}
