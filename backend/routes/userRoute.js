// ============================================================
// routes/userRoute.js — CRUD utilisateurs (Admin uniquement)
//
// 🔒 Le middleware `requireRole("Admin")` garantit que SEUL l'admin
// principal du système peut accéder à ces routes. Combiné aux
// garde-fous du controller, cela empêche toute création/promotion
// d'un nouvel administrateur.
// ============================================================
const express = require("express");
const router  = express.Router();

const ctrl = require("../controllers/userController");
const { verifyToken } = require("../middleware/authMiddleware");
const { requireRole } = require("../middleware/roleMiddleware");
const { ensurePasswordChanged } = require("../middleware/ensurePasswordChanged");

router.use(verifyToken, ensurePasswordChanged(), requireRole("Admin"));

// Métadonnées (listes de rôles / statuts) — avant /:id
// `roles` = rôles ASSIGNABLES (sans Admin), utilisés dans les formulaires.
// `allRoles` = rôles existants en base (avec Admin), utilisés pour le filtre.
router.get("/_meta/options", (req, res) => {
  res.json({
    roles:    ctrl.ROLES,
    allRoles: ctrl.ALL_ROLES,
    statuts:  ctrl.STATUTS,
  });
});

router.get   ("/",      ctrl.list);
router.get   ("/:id",   ctrl.getOne);
router.post  ("/",      ctrl.create);
router.put   ("/:id",   ctrl.update);
router.delete("/:id",   ctrl.remove);

module.exports = router;
