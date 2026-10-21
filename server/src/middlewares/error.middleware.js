const { errorResponse } = require('../utils/response.util');

const errorHandler = (err, req, res, next) => {
  console.error('[ERROR]:', err.message);
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Lỗi máy chủ nội bộ (Internal Server Error)';
  return errorResponse(res, message, statusCode);
};

module.exports = errorHandler;