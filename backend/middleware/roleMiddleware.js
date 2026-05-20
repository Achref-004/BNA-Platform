// ============================================================
// middleware/roleMiddleware.js
// ------------------------------------------------------------
// Vérifie que l'utilisateur connecté possède l'un des rôles
// autorisés. Doit être placé APRÈS `verifyToken` car il s'appuie
// sur `req.auth.role`.
//
// Exemple d'usage dans un router :
//     router.delete(
//       "/:id",
//       verifyToken,
//       requireRole("Admin"),
//       userController.remove,
//     );
// ============================================================

/**
 * Construit un middleware autorisant uniquement les rôles fournis.
 * @param  {...string} allowed  Rôles autorisés (ex: "Admin", "Agence")
 * @returns {Function}          Middleware Express
 */
function requireRole(...allowed) {
  return function (req, res, next) {
    const role = req.auth?.role;
    if (!role) {
      return res.status(401).json({ error: "Non authentifié." });
    }
    if (!allowed.includes(role)) {
      return res.status(403).json({
        error: `Accès refusé. Rôle requis : ${allowed.join(" ou ")}.`,
      });
    }
    return next();
  };
}

module.exports = { requireRole };
