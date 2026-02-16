/**
 * Application roles for RBAC.
 * ADMIN: full access; COMMERCIAL: sales/clients; DELIVERY: deliveries/planning.
 */
const ROLES = {
  ADMIN: 'ADMIN',
  COMMERCIAL: 'COMMERCIAL',
  DELIVERY: 'DELIVERY',
};

const ALL_ROLES = Object.values(ROLES);

module.exports = { ROLES, ALL_ROLES };
