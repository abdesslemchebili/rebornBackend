/**
 * Standard success response helper per BACKEND_INTEGRATION_REQUIREMENTS.
 * Format: { success: true, data: {} }
 */
function successResponse(res, statusCode = 200, data = null) {
  return res.status(statusCode).json({ success: true, data: data ?? {} });
}

module.exports = { successResponse };
