/**
 * A refusal the caller is meant to see. `message` is safe to show on screen;
 * `details` are extra fields placed beside code and message in the error shape.
 */
export class AppError extends Error {
  constructor(status, code, message, details = {}) {
    super(message);
    this.name = 'AppError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export const validationFailed = (message) => new AppError(400, 'VALIDATION_FAILED', message);

export const tableNotFound = () => new AppError(404, 'TABLE_NOT_FOUND', 'Table not found.');

export const orderNotFound = () => new AppError(404, 'ORDER_NOT_FOUND', 'Order not found.');

export const itemNotFound = () => new AppError(404, 'ITEM_NOT_FOUND', 'Menu item not found.');

export const orderStateConflict = (currentStatus) =>
  new AppError(409, 'ORDER_STATE_CONFLICT', `This order is already ${currentStatus}.`, {
    currentStatus,
  });

/** Builds the one error shape every API response uses. */
export function toErrorBody(error) {
  return { error: { code: error.code, message: error.message, ...error.details } };
}
