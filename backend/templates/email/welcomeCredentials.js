/**
 * ============================================================
 * templates/email/welcomeCredentials.js
 * ------------------------------------------------------------
 * HTML responsive style banque (BNA vert) pour l'email
 * credentials à la première création du compte.
 * Les images externes optionnelles : logo peut être désactivé en dev.
 * ============================================================
 * @param {object} opts
 */
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

module.exports.renderWelcomeCredentials = function renderWelcomeCredentials({
  nom, prenom, email, role, temporaryPassword, loginUrl,
}) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Vos accès BNA</title>
</head>
<body style="margin:0;padding:0;background:#f4f7f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f7f6;padding:28px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 14px 40px rgba(0,90,60,0.12);border:1px solid #e2ede8;">
          <!-- Bande vert BNA -->
          <tr><td style="height:8px;background:linear-gradient(90deg,#00C48A 0%,#009A6A 55%,#006B47 100%);"></td></tr>
          <tr>
            <td style="padding:26px 32px 8px;text-align:center;">
              <div style="display:inline-block;padding:14px 20px;background:#f0faf6;border-radius:14px;border:1px solid rgba(0,154,106,0.2);margin-bottom:8px;">
                <span style="font-size:22px;font-weight:900;color:#006B47;letter-spacing:2px;">BNA</span>
                <span style="display:block;font-size:10px;font-weight:700;color:#7B8985;letter-spacing:4px;text-transform:uppercase;">Bank</span>
              </div>
              <h1 style="margin:16px 0 8px;color:#0E2620;font-size:21px;font-weight:800;">
                Création de votre compte
              </h1>
              <p style="margin:0;color:#5A7A70;font-size:14px;line-height:1.55;">
                Bonjour ${escapeHtml(prenom)} ${escapeHtml(nom)},
                <br>un accès a été créé pour vous sur le portail <strong>Espace placements BNA</strong>.
              </p>
            </td>
          </tr>
          <!-- Bloc identifiants -->
          <tr>
            <td style="padding:10px 32px;">
              <table width="100%" cellspacing="0" cellpadding="14" style="background:#fafcfb;border-radius:12px;border:1px solid #e2ede8;font-size:14px;color:#0E2620;">
                <tr><td colspan="2" style="font-weight:700;color:#009A6A;font-size:12px;text-transform:uppercase;letter-spacing:.08em;padding-bottom:4px;border-bottom:1px solid #e2ede8;">
                  Récapitulatif
                </td></tr>
                <tr><td style="color:#7B8985;width:140px;padding-top:14px;font-weight:600;">Prénom</td><td style="padding-top:14px;font-weight:700;">${escapeHtml(prenom)}</td></tr>
                <tr><td style="color:#7B8985;font-weight:600;">Nom</td><td style="font-weight:700;">${escapeHtml(nom)}</td></tr>
                <tr><td style="color:#7B8985;font-weight:600;">Email</td><td style="font-weight:700;"><a href="mailto:${escapeHtml(email)}" style="color:#006B47;">${escapeHtml(email)}</a></td></tr>
                <tr><td style="color:#7B8985;font-weight:600;">Rôle</td><td style="font-weight:700;">${escapeHtml(role)}</td></tr>
                <tr><td style="color:#7B8985;font-weight:600;vertical-align:top;padding-bottom:14px;border-bottom:1px solid #e2ede8;">Mot de passe</td><td style="padding-bottom:14px;border-bottom:1px solid #e2ede8;">
                  <code style="font-size:15px;background:#fff;padding:10px 14px;border-radius:8px;border:1px dashed #009A6A;display:inline-block;font-weight:800;color:#0E2620;letter-spacing:.04em;">${escapeHtml(temporaryPassword)}</code><br>
                  <span style="display:block;margin-top:8px;color:#D53F3F;font-size:12px;font-weight:600;">⚠ Mot de passe temporaire — à changer à la première connexion.</span>
                </td></tr>
              </table>
            </td>
          </tr>
          <!-- Bouton connexion -->
          <tr>
            <td align="center" style="padding:14px 32px 32px;">
              <a href="${escapeHtml(loginUrl)}" target="_blank" rel="noopener noreferrer"
                 style="display:inline-block;text-decoration:none;background:linear-gradient(135deg,#00C48A 0%,#009A6A 52%,#006B47 100%);color:#ffffff;font-weight:800;font-size:14px;padding:14px 32px;border-radius:999px;box-shadow:0 12px 28px rgba(0,154,106,0.35);">
                Se connecter
              </a>
            
            </td>
          </tr>
          <tr>
            <td style="padding:0 32px 28px;color:#9aa;font-size:11px;line-height:1.5;text-align:center;border-top:1px solid #eef4f1;">
              <p style="margin-top:14px;color:#9aa;">
                Ce message est généré automatiquement pour des raisons de sécurité. Ne communiquez jamais ce mot de passe par courrier.
              </p>
              <p style="margin-top:10px;color:#b5c;font-size:11px;font-weight:bold;">© BNA Banque Nationale Agricole</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
};

/**
 * Réponse administrative — notification utilisateur réponse reçue
 */
module.exports.renderUserReplyReceived = function renderUserReplyReceived({
  recipientPrenom, threadSubject, replyPreview, messagesUrl,
}) {
  const prev = escapeHtml(replyPreview.slice(0, 280));
  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;background:#f4f7f6;font-family:-apple-system,Segoe UI,Roboto,sans-serif;">
  <table width="100%" cellpadding="28"><tr><td align="center">
    <table width="560" cellpadding="24" style="background:#fff;border-radius:14px;border:1px solid #e2ede8;">
      <tr><td style="height:6px;background:linear-gradient(90deg,#00C48A,#006B47);border-radius:6px;"></td></tr>
      <tr><td>
        <h2 style="color:#006B47;margin:0 0 10px;font-size:18px;">Nouvelle réponse de l’administration</h2>
        <p style="color:#5A7A70;font-size:14px;margin:0 0 12px;">Bonjour ${escapeHtml(recipientPrenom)}, vous avez reçu une réponse pour : <strong>${escapeHtml(threadSubject)}</strong>.</p>
        <p style="font-size:13px;color:#0E2620;background:#f0faf6;padding:14px;border-radius:10px;margin:14px 0;border:1px solid #e2ede8;line-height:1.5">${prev}${replyPreview.length > 280 ? "…" : ""}</p>
        <div style="text-align:center;margin-top:20px;">
          <a href="${escapeHtml(messagesUrl)}" style="display:inline-block;background:#009A6A;color:#fff;font-weight:800;padding:12px 24px;border-radius:999px;text-decoration:none;font-size:14px;">Voir la conversation</a>
        </div>
      </td></tr></table></td></tr></table>
</body></html>`;
};
