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
import useToast from "../hooks/useToast";
import Toast from "./Toast";

/** Affiche une métrique ou « — » si absente (échec modèle / ancien export). */
function fmtMetric(v) {
  if (v == null || v === "" || Number.isNaN(Number(v))) return "—";
  const n = Number(v);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)} Md`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)} M`;
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

function fmtSmape(v) {
  if (v == null || v === "" || Number.isNaN(Number(v))) return "—";
  return `${Number(v).toFixed(2)} %`;
}

export default function Forecast() {
  const [file, setFile] = useState(null);
  const [status, setStatus] = useState("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [results, setResults] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [activeTab, setActiveTab] = useState("pipeline");
  const { toast, showToast } = useToast(4000);

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
      setStatusMsg("Entraînement en cours…");
      await trainForecast();
      setStatus("success");
      setStatusMsg("Entraînement terminé.");
      try {
        await refreshResults();
      } catch (refreshErr) {
        showToast(
          `Entraînement OK, mais chargement des résultats : ${refreshErr.message}`,
        );
      }
      showToast("Pipeline terminé avec succès.");
    } catch (e) {
      setStatus("error");
      setStatusMsg(e.message?.slice(0, 200) || "Échec de l'entraînement.");
      showToast(e.message || "Échec de l'entraînement.");
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
            </div>
          )}

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
                    <th style={styles.thGroup} colSpan={2}>Hold-out 80/20</th>
                    <th style={styles.thGroup} colSpan={2}>TimeSeriesSplit</th>
                  </tr>
                  <tr>
                    <th style={styles.thSub}>RMSE</th>
                    <th style={styles.thSub}>SMAPE</th>
                    <th style={styles.thSub}>RMSE</th>
                    <th style={styles.thSub}>SMAPE</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.map((row) => (
                    <tr key={row.modele} style={row.rang === 1 ? { background: BNA.greenLight } : undefined}>
                      <td style={styles.tdLeft}>{row.rang}</td>
                      <td style={styles.tdLeft}>
                        <b>{row.modele}</b>
                        {row.best_rmse != null && (
                          <div style={{ fontSize: 10, color: BNA.textMuted, marginTop: 2 }}>
                            RMSE min {fmtMetric(row.best_rmse)}
                          </div>
                        )}
                      </td>
                      <td style={styles.td}>{fmtMetric(row.rmse)}</td>
                      <td style={styles.td}>{fmtSmape(row.smape)}</td>
                      <td style={styles.td}>{fmtMetric(row.rmse_cv ?? row.rmse_wf)}</td>
                      <td style={styles.td}>{fmtSmape(row.smape_cv ?? row.smape_wf)}</td>
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

      <Toast message={toast} />
    </div>
  );
}

function resolveChartData(results, forecast) {
  if (results?.chart_data?.history?.length) return results.chart_data;
  if (forecast?.chart_data?.history?.length) return forecast.chart_data;
  const ranked = results?.comparison_ranked || [];
  const modelMetrics = ranked.map((r) => ({
    modele: r.modele,
    rmse_holdout: r.rmse,
    rmse_timeseries_split: r.rmse_cv ?? r.rmse_wf,
    rmse_best: r.best_rmse,
  }));
  const preview = forecast?.preview || [];
  if (!preview.length && !modelMetrics.length) return null;
  return {
    history: results?.chart_data?.history || [],
    forecast: preview.map((row) => ({
      date: row.ds,
      montant: row.montant_prevu,
    })),
    model_metrics: modelMetrics,
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
};
