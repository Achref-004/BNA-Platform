// ============================================================
// Forecast.jsx — Module AI Forecasting (upload, train, résultats, visualisations)
// ============================================================
import { useCallback, useEffect, useMemo, useState } from "react";
import { BNA, GRADIENTS, GLASS } from "../styles/theme";
import ForecastCharts from "./ForecastCharts";
import {
  uploadForecastFile,
  trainForecast,
  getForecastResults,
  getForecastPreview,
  getForecastStatus,
} from "../services/forecastService";

/** Affiche une métrique ou « — » si absente (échec modèle / ancien export). */
function fmtMetric(v) {
  if (v == null || v === "" || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  if (Math.abs(n) >= 1e6) return n.toLocaleString("fr-FR", { maximumFractionDigits: 2 });
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 4 });
}

export default function Forecast() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [results, setResults] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [toast, setToast] = useState("");
  const [activeTab, setActiveTab] = useState("pipeline");

  const showToast = (m) => {
    setToast(m);
    setTimeout(() => setToast(""), 4000);
  };

  const refreshResults = useCallback(async () => {
    try {
      setResults(await getForecastResults());
    } catch {
      setResults(null);
    }
    try {
      setForecast(await getForecastPreview());
    } catch {
      setForecast(null);
    }
  }, []);

  useEffect(() => {
    getForecastStatus()
      .then((s) => {
        if (s.state?.status === "running") {
          setStatus("running");
          setStatusMsg(s.state.message);
        } else if (s.has_results) {
          setStatus("success");
          refreshResults();
        }
      })
      .catch(() => {});
  }, [refreshResults]);

  const handleUploadAndTrain = async () => {
    if (!file) {
      showToast("Choisissez un fichier CSV ou Excel.");
      return;
    }
    setStatus("running");
    setStatusMsg("Upload en cours…");
    try {
      await uploadForecastFile(file);
      setStatusMsg("Entraînement Prophet, ARIMA, Régression linéaire…");
      await trainForecast();
      setStatus("success");
      setStatusMsg("Entraînement terminé.");
      await refreshResults();
      showToast("Pipeline terminé avec succès.");
    } catch (e) {
      setStatus("error");
      setStatusMsg(e.message);
      showToast(e.message);
    }
  };

  const comparison = results?.comparison_ranked?.length
    ? results.comparison_ranked
    : (results?.comparison || []).filter((r) => r.rang != null);
  const failedModels = (results?.comparison || []).filter(
    (r) => r.validation === "Échec" || r.error,
  );
  const best = results?.best_model;

  const chartData = useMemo(
    () => resolveChartData(results, forecast),
    [results, forecast],
  );

  return (
    <div style={styles.page}>
      <header style={styles.header}>
        <div>
          <div style={styles.eyebrow}>
            <span style={styles.eyebrowDot} />
            AI FORECASTING · BNA
          </div>
          <h1 style={styles.title}>Prévision financière</h1>
          <p style={styles.subtitle}>
            Prophet · ARIMA · Régression linéaire — comparaison automatique et visualisations intégrées.
          </p>
        </div>
      </header>

      <div style={styles.tabs}>
        {[
          ["pipeline", "Pipeline ML"],
          ["results", "Résultats"],
          ["charts", "Visualisations"],
        ].map(([id, label]) => (
          <button
            key={id}
            type="button"
            style={{ ...styles.tabBtn, ...(activeTab === id ? styles.tabBtnActive : {}) }}
            onClick={() => setActiveTab(id)}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "pipeline" && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>1. Importer les données historiques</h2>
          <p style={styles.hint}>
            Colonnes : <code>date</code> et <code>montant</code>. Exemple :{" "}
            <code>ml-forecast/data/sample_placements.csv</code> (exemple fourni)
          </p>
          <input
            type="file"
            accept=".csv,.xlsx,.xls"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={styles.fileInput}
          />

          {file && (
            <div style={styles.fileName}>
              {file.name} ({Math.round(file.size / 1024)} Ko)
            </div>
          )}

          <div style={styles.statusBox}>
            <StatusPill status={status} />
            <span style={{ fontSize: 13, color: BNA.textMuted }}>{statusMsg || "En attente"}</span>
          </div>

          <button
            type="button"
            style={styles.primaryBtn}
            disabled={status === "running" || !file}
            onClick={handleUploadAndTrain}
          >
            {status === "running" ? "Entraînement en cours…" : "Lancer l'entraînement"}
          </button>

        </section>
      )}

      {activeTab === "results" && (
        <section style={styles.card}>
          {!comparison.length && (
            <p style={styles.muted}>Aucun résultat — lancez d'abord l'entraînement.</p>
          )}

          {best && (
            <div style={styles.bestBox}>
              <div style={styles.bestTitle}>Meilleur modèle : {best.name}</div>
              <p style={{ margin: "8px 0 0", fontSize: 13 }}>
                MAPE retenu {best.mape}%
                {results?.best_model?.selection_method && (
                  <> · via {results.best_model.selection_method}</>
                )}
                {best.mae != null && (
                  <> · MAE {fmtMetric(best.mae)} · RMSE {fmtMetric(best.rmse)}</>
                )}
              </p>
              <p style={{ margin: "12px 0 0", fontSize: 13, color: BNA.textMuted, lineHeight: 1.6 }}>
                {results?.explanation}
              </p>
            </div>
          )}

          <p style={{ ...styles.hint, marginTop: 12 }}>
            <b>Classement (Rang)</b> : pour chaque modèle, on prend le <b>plus petit MAPE</b> entre hold-out 80/20
            et TimeSeriesSplit ; le modèle retenu pour la prévision (année suivante) est celui au{" "}
            <b>MAPE minimal</b> global.
          </p>

          {failedModels.length > 0 && (
            <div style={styles.failBox}>
              <strong>Modèle(s) non classé(s) :</strong>
              {failedModels.map((r) => (
                <div key={r.modele} style={{ marginTop: 8, fontSize: 13 }}>
                  <b>{r.modele}</b> — {r.error || "échec à l'entraînement"}
                </div>
              ))}
            </div>
          )}

          {comparison.length > 0 && (
            <div style={{ overflowX: "auto", marginTop: 16 }}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th} rowSpan={2}>Rang</th>
                    <th style={styles.th} rowSpan={2}>Modèle</th>
                    <th style={styles.thGroup} colSpan={3}>Hold-out 80/20</th>
                    <th style={styles.thGroup} colSpan={3}>TimeSeriesSplit</th>
                  </tr>
                  <tr>
                    <th style={styles.thSub}>MAE</th>
                    <th style={styles.thSub}>RMSE</th>
                    <th style={styles.thSub}>MAPE (%)</th>
                    <th style={styles.thSub}>MAE</th>
                    <th style={styles.thSub}>RMSE</th>
                    <th style={styles.thSub}>MAPE (%)</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.modele} style={row.rang === 1 ? { background: BNA.greenLight } : undefined}>
                      <td style={styles.tdLeft}>{row.rang}</td>
                      <td style={styles.tdLeft}>
                        <b>{row.modele}</b>
                        {row.best_mape != null && (
                          <div style={{ fontSize: 10, color: BNA.textMuted, marginTop: 2 }}>
                            MAPE min {fmtMetric(row.best_mape)}%
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>{fmtMetric(row.mae)}</td>
                      <td style={styles.td}>{fmtMetric(row.rmse)}</td>
                      <td style={styles.td}>{fmtMetric(row.mape)}</td>
                      <td style={styles.td}>{fmtMetric(row.mae_cv)}</td>
                      <td style={styles.td}>{fmtMetric(row.rmse_cv)}</td>
                      <td style={styles.td}>{fmtMetric(row.mape_cv)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {forecast?.preview?.length > 0 && (
            <>
              <h3 style={{ ...styles.cardTitle, marginTop: 24 }}>Prévision — année suivante (aperçu)</h3>
              <table style={styles.tablePreview}>
                <thead>
                  <tr>
                    <th style={styles.thPreview}>Date</th>
                    <th style={styles.thPreview}>Montant prévu</th>
                  </tr>
                </thead>
                <tbody>
                  {forecast.preview.map((row) => (
                    <tr key={row.ds}>
                      <td style={styles.tdPreview}>{row.ds}</td>
                      <td style={styles.tdPreviewAmount}>
                        {Number(row.montant_prevu).toLocaleString("fr-FR")} TND
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </section>
      )}

      {activeTab === "charts" && (
        <section style={styles.card}>
          <h2 style={styles.cardTitle}>Visualisations</h2>
          <p style={styles.hint}>
            Comparaison des modèles (MAPE) et évolution des montants historiques avec la prévision
            de l&apos;année suivante.
          </p>
          <ForecastCharts
            chartData={chartData}
            comparisonRanked={comparison}
            bestModelName={best?.name}
          />
          {!chartData?.history?.length && comparison.length > 0 && (
            <p style={{ ...styles.hint, marginTop: 16 }}>
              Pour afficher la courbe historique, relancez un entraînement.
            </p>
          )}
        </section>
      )}

      {toast && <div style={styles.toast}>{toast}</div>}
    </div>
  );
}

function resolveChartData(results, forecast) {
  if (results?.chart_data?.history?.length) return results.chart_data;
  if (forecast?.chart_data?.history?.length) return forecast.chart_data;
  const ranked = results?.comparison_ranked || [];
  const modelMape = ranked.map((r) => ({
    modele: r.modele,
    mape_holdout: r.mape,
    mape_cv: r.mape_cv,
    mape_best: r.best_mape,
  }));
  const preview = forecast?.preview || [];
  if (!preview.length && !modelMape.length) return null;
  return {
    history: results?.chart_data?.history || [],
    forecast: preview.map((row) => ({
      date: row.ds,
      montant: row.montant_prevu,
    })),
    model_mape: modelMape,
  };
}

function StatusPill({ status }) {
  const map = {
    idle: { bg: BNA.gray, label: "Prêt" },
    running: { bg: BNA.goldSoft, label: "En cours" },
    success: { bg: BNA.greenLight, label: "Terminé" },
    error: { bg: BNA.dangerSoft, label: "Erreur" },
  };
  const s = map[status] || map.idle;
  return (
    <span style={{ background: s.bg, padding: "4px 12px", borderRadius: 999, fontSize: 11, fontWeight: 800 }}>
      {s.label}
    </span>
  );
}

const styles = {
  page: { padding: "26px 28px", flex: 1, minHeight: "100%", boxSizing: "border-box" },
  header: { marginBottom: 18 },
  eyebrow: {
    display: "inline-flex", alignItems: "center", gap: 8,
    background: BNA.greenLight, color: BNA.greenDark,
    padding: "5px 12px", borderRadius: 999,
    fontSize: 10.5, fontWeight: 800, letterSpacing: 1.3, marginBottom: 8,
  },
  eyebrowDot: { width: 6, height: 6, borderRadius: "50%", background: BNA.greenMid },
  title: { margin: 0, fontSize: 28, fontWeight: 800, color: BNA.textDark },
  subtitle: { margin: "6px 0 0", color: BNA.textMuted, fontSize: 14, maxWidth: 720 },
  tabs: { display: "flex", gap: 8, marginBottom: 16, flexWrap: "wrap" },
  tabBtn: {
    padding: "10px 16px", borderRadius: 12, border: `1.5px solid ${BNA.border}`,
    background: "#fff", cursor: "pointer", fontWeight: 700, fontSize: 13,
  },
  tabBtnActive: {
    background: GRADIENTS.brand, color: "#fff", border: "none",
    boxShadow: "0 8px 20px rgba(0,154,106,0.25)",
  },
  card: {
    ...GLASS.surface,
    borderRadius: 20,
    padding: 22,
    border: "1px solid rgba(0,154,106,0.12)",
  },
  cardTitle: { margin: "0 0 10px", fontSize: 17, fontWeight: 800, color: BNA.textDark },
  hint: { fontSize: 13, color: BNA.textMuted, lineHeight: 1.6, marginBottom: 14 },
  fileInput: { marginBottom: 12, fontSize: 13 },
  fileName: { fontSize: 13, fontWeight: 600, color: BNA.greenDark, marginBottom: 12 },
  statusBox: { display: "flex", alignItems: "center", gap: 12, marginBottom: 16 },
  primaryBtn: {
    background: GRADIENTS.brand, color: "#fff", border: "none",
    borderRadius: 12, padding: "12px 20px", fontWeight: 800, cursor: "pointer",
    boxShadow: "0 12px 28px rgba(0,154,106,0.28)",
  },
  bestBox: {
    background: BNA.greenLight, borderRadius: 14, padding: 16,
    border: "1px solid rgba(0,154,106,0.2)",
  },
  bestTitle: { fontWeight: 900, fontSize: 16, color: BNA.greenDark },
  table: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  th: {
    textAlign: "left", padding: "10px 12px", borderBottom: `2px solid ${BNA.border}`,
    color: BNA.textMuted, fontSize: 11, textTransform: "uppercase",
    verticalAlign: "middle",
  },
  thGroup: {
    textAlign: "center", padding: "10px 8px",
    borderBottom: `1px solid ${BNA.border}`,
    background: BNA.greenSoft,
    color: BNA.greenDark, fontSize: 11, fontWeight: 800,
    textTransform: "uppercase",
  },
  thSub: {
    textAlign: "right", padding: "8px 10px", fontSize: 10,
    color: BNA.textMuted, fontWeight: 700, textTransform: "uppercase",
    borderBottom: `2px solid ${BNA.border}`,
  },
  td: {
    padding: "10px 12px", borderBottom: `1px solid ${BNA.borderSoft}`,
    textAlign: "right", fontVariantNumeric: "tabular-nums",
  },
  tdLeft: {
    padding: "10px 12px", borderBottom: `1px solid ${BNA.borderSoft}`,
    textAlign: "left",
  },
  tablePreview: { width: "100%", borderCollapse: "collapse", fontSize: 13 },
  thPreview: {
    textAlign: "left", padding: "10px 12px", borderBottom: `2px solid ${BNA.border}`,
    color: BNA.textMuted, fontSize: 11, textTransform: "uppercase",
  },
  tdPreview: {
    padding: "10px 12px", borderBottom: `1px solid ${BNA.borderSoft}`,
    textAlign: "left",
  },
  tdPreviewAmount: {
    padding: "10px 12px", borderBottom: `1px solid ${BNA.borderSoft}`,
    textAlign: "left", fontWeight: 600,
  },
  muted: { color: BNA.textMuted, fontStyle: "italic" },
  failBox: {
    marginTop: 12,
    padding: 14,
    borderRadius: 12,
    background: BNA.dangerSoft,
    border: `1px solid ${BNA.danger}`,
    color: BNA.textDark,
    fontSize: 13,
  },
  toast: {
    position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)",
    background: BNA.greenDark, color: "#fff", padding: "12px 20px",
    borderRadius: 12, fontWeight: 700, zIndex: 10001,
  },
};
