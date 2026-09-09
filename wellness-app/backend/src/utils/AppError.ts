export class AppError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "ERROR") {
    super(message);
    this.status = status;
    this.code = code;
  }

  static badRequest(message: string, code = "BAD_REQUEST") {
    return new AppError(400, message, code);
  }
  static unauthorized(message = "Unauthorized", code = "UNAUTHORIZED") {
    return new AppError(401, message, code);
  }
  static forbidden(message = "Forbidden", code = "FORBIDDEN") {
    return new AppError(403, message, code);
  }
  static notFound(message = "Not found", code = "NOT_FOUND") {
    return new AppError(404, message, code);
  }
  static conflict(message: string, code = "CONFLICT") {
    return new AppError(409, message, code);
  }
}
