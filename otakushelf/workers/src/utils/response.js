export const successResponse = (message, data = null) => ({
  status: 'success',
  message,
  data,
})

export const errorResponse = (message, data = null) => ({
  status: 'error',
  message,
  data,
})

export const success = (c, message, data = null, statusCode = 200) =>
  c.json(successResponse(message, data), statusCode)

export const error = (c, message, statusCode = 500, data = null) =>
  c.json(errorResponse(message, data), statusCode)
