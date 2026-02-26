"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderError = exports.ConflictError = exports.NotFoundError = exports.AppError = void 0;
class AppError extends Error {
    statusCode;
    code;
    constructor(message, statusCode = 400, code = 'BAD_REQUEST') {
        super(message);
        this.statusCode = statusCode;
        this.code = code;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}
exports.AppError = AppError;
class NotFoundError extends AppError {
    constructor(message = 'Resource not found') {
        super(message, 404, 'NOT_FOUND');
    }
}
exports.NotFoundError = NotFoundError;
class ConflictError extends AppError {
    constructor(message = 'Resource conflict') {
        super(message, 409, 'CONFLICT');
    }
}
exports.ConflictError = ConflictError;
class ProviderError extends AppError {
    constructor(message = 'Provider integration failed', code = 'PROVIDER_ERROR') {
        super(message, 502, code);
    }
}
exports.ProviderError = ProviderError;
//# sourceMappingURL=errors.js.map