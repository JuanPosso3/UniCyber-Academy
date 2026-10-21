import type { ErrorRequestHandler } from 'express';

/**
 * Error de aplicación con un código estable y un mensaje apto para el
 * cliente. Los mensajes de validación y autenticación están en español.
 */
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    public readonly code: string,
    message: string,
    public readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

/**
 * Formato uniforme de error de la API:
 *
 * {
 *   "error": {
 *     "code": "...",
 *     "message": "...",
 *     "fields": { "email": "..." }
 *   }
 * }
 */
export const errorHandler: ErrorRequestHandler = (
  error,
  _req,
  res,
  next,
) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    });
    return;
  }

  const bodyError = error as { type?: string };

  if (bodyError.type === 'entity.parse.failed') {
    res.status(400).json({
      error: {
        code: 'INVALID_JSON',
        message: 'La solicitud no contiene un JSON válido.',
      },
    });
    return;
  }

  if (bodyError.type === 'entity.too.large') {
    res.status(413).json({
      error: {
        code: 'PAYLOAD_TOO_LARGE',
        message: 'La solicitud es demasiado grande.',
      },
    });
    return;
  }

  console.error('Error no controlado:', error);

  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: 'Ocurrió un error inesperado. Inténtalo de nuevo.',
    },
  });
};
