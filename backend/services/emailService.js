// ============================================================
// services/emailService.js — Envoi SMTP (Nodemailer)
// ------------------------------------------------------------
// Configuration via variables d'environnement (.env) :
//
//   SMTP_HOST, SMTP_PORT, SMTP_SECURE=true|false (TLS)
//   SMTP_USER, SMTP_PASS
//   SMTP_FROM="BNA <noreply@bna.tn>"
//
// Si SMTP désactivé (SMTP_DISABLED=true ou host manquant), les
// appels sont no-op mais loguent un avertissement — pratique en dev.
//
// Fonctions métier métiers : sendWelcomeCredentials, sendUserReplyEmail
// ============================================================
require("dotenv").config();

let transporterPromise = null;

function isEmailEnabled() {
  if (process.env.SMTP_DISABLED === "true" || process.env.SMTP_DISABLED === "1") return false;
  if (!process.env.SMTP_HOST) return false;
  return true;
}

async function getTransporter() {
  if (!isEmailEnabled()) return null;
  if (!transporterPromise) {
    const nodemailer = require("nodemailer");
    transporterPromise = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) ,
      secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1",
      auth: process.env.SMTP_USER ? {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS || "",
      } : undefined,
    });
  }
  return transporterPromise;
}

/**
 * Envoi générique HTML + text fallback.
 *
 * @param {{ to: string, subject: string, html: string, text?: string }} opts
 */
async function sendMail({ to, subject, html, text }) {
  const t = await getTransporter();
  if (!t) {
    console.warn("📧 SMTP désactivé ou non configuré — email NON envoyé vers", to);
    return { skipped: true };
  }

  const from = process.env.SMTP_FROM || process.env.SMTP_USER || "BNA Dashboard <noreply@localhost>";

  await t.sendMail({
    from,
    to,
    subject,
    html,
    text: text || undefined,
  });
  return { sent: true };
}

const { renderWelcomeCredentials, renderUserReplyReceived } = require("../templates/email/welcomeCredentials.js");

async function sendWelcomeCredentialsEmail({ toEmail, nom, prenom, email, role, temporaryPassword }) {
  const loginUrl =
    process.env.FRONTEND_LOGIN_URL?.trim()
    || "http://localhost:3000/login";

  const html = renderWelcomeCredentials({
    nom, prenom, email, role,
    temporaryPassword,
    loginUrl,
  });

  return sendMail({
    to: toEmail,
    subject: "[BNA] Vos identifiants de connexion au portail",
    html,
    text: `${prenom} ${nom},\nEmail: ${email}\nRôle: ${role}\nMot de passe temporaire: ${temporaryPassword}\nConnexion: ${loginUrl}\nÀ changer au premier passage.`,
  });
}

async function sendUserReplyReceivedEmail({
  toEmail, recipientPrenom, threadSubject, replyPreview, messagesUrlOverride,
}) {
  const messagesUrl =
    messagesUrlOverride?.trim()
    || `${process.env.FRONTEND_BASE_URL?.replace(/\/+$/, "") || "http://localhost:3000"}/messagerie`;

  const html = renderUserReplyReceived({
    recipientPrenom,
    threadSubject,
    replyPreview,
    messagesUrl,
  });

  return sendMail({
    to: toEmail,
    subject: `[BNA] Réponse à votre message : ${threadSubject.slice(0, 70)}`,
    html,
    text: `Une réponse a été envoyée au sujet « ${threadSubject} ».\nVoir : ${messagesUrl}`,
  });
}

module.exports = {
  sendMail,
  sendWelcomeCredentialsEmail,
  sendUserReplyReceivedEmail,
  isEmailEnabled,
};
