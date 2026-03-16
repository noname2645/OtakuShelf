/**
 * Formats a success response
 * @param {string} message - Description of the operation
 * @param {any} data - The response data
 */
export const successResponse = (message, data = null) => {
  return {
    status: "success",
    message,
    data
  };
};

/**
 * Formats an error response
 * @param {string} message - Explanation of the error
 * @param {any} data - Additional error details (optional)
 */
export const errorResponse = (message, data = null) => {
  return {
    status: "error",
    message,
    data
  };
};

/**
 * Success helper for Express response object
 */
export const success = (res, message, data = null, statusCode = 200) => {
  return res.status(statusCode).json(successResponse(message, data));
};

/**
 * Error helper for Express response object
 */
export const error = (res, message, statusCode = 500, data = null) => {
  return res.status(statusCode).json(errorResponse(message, data));
};
