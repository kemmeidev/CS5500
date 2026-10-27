// Transport-agnostic failures raised by services. The error controller maps each
// subclass to an HTTP status; services never see a status code.

export abstract class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = new.target.name;
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message);
  }
}

export class ConflictError extends DomainError {}

export class NotFoundError extends DomainError {
  constructor(message: string) {
    super("NOT_FOUND", message);
  }
}
