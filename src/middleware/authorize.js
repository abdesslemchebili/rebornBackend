/**
 * Role-based access control middleware.
 * Use after authenticate(); restricts by allowed roles.
 */
const { ForbiddenError } = require('../utils/errors');

/**
 * @param {...string} allowedRoles - Roles that are allowed (e.g. ROLES.ADMIN, ROLES.COMMERCIAL)
 */
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ForbiddenError('Authentication required'));
    }
    const role = req.user.role;
    if (!allowedRoles.includes(role)) {
      return next(new ForbiddenError('Insufficient permissions'));
    }
    next();
  };
}

/** Single-role shorthand: requireRole(ROLES.ADMIN) => only ADMIN can access. */
function requireRole(role) {
  return authorize(role);
}

module.exports = { authorize, requireRole };
