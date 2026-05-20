// ============================================================
// ForecastCharts.jsx — Visualisations ML (comparaison modèles + série temporelle)
// ============================================================
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BNA } from "../styles/theme";

const tooltipCursor = false;

const tooltipStyle = {
  background: "#fff",
  border: `1px solid ${BNA.border}`,
  borderRadius: 10,
  padding: "10px 12px",
  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
};

function shortModelName(name) {
  if (!name) return "—";
  if (name.includes("Régression")) return "Régression lin.";
  if (name.length <= 16) return name;
  return `${name.slice(0, 14)}…`;
}

function fmtMd(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  const n = Number(value);
  if (Math.abs(n) >= 1e9) return `${(n / 1e9).toFixed(2)} Md TND`;
  if (Math.abs(n) >= 1e6) return `${(n / 1e6).toFixed(1)} M TND`;
  return n.toLocaleString("fr-FR", { maximumFractionDigits: 0 });
}

function fmtMape(value) {
  if (value == null || Number.isNaN(Number(value))) return "—";
  return `${Number(value).toFixed(1)} %`;
}

function buildSeriesPoints(chartData) {
  if (!chartData?.history?.length) return [];
  const byDate = new Map();

  for (const h of chartData.history) {
    byDate.set(h.date, {
      date: h.date,
      label: formatMonthLabel(h.date),
      historique: h.montant,
      prevu: null,
    });
  }
  for (const f of chartData.forecast || []) {
    const existing = byDate.get(f.date) || {
      date: f.date,
      label: formatMonthLabel(f.date),
      historique: null,
      prevu: null,
    };
    existing.prevu = f.montant;
    byDate.set(f.date, existing);
  }

  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}

function formatMonthLabel(isoDate) {
  const d = new Date(isoDate);
  if (Number.isNaN(d.getTime())) return isoDate;
  return d.toLocaleDateString("fr-FR", { month: "short", year: "2-digit" });
}

function finiteOrNull(v) {
  if (v == null || Number.isNaN(Number(v))) return null;
  return Number(v);
}

function buildMapeBars(chartData, comparisonRanked) {
  const fromChart = chartData?.model_mape;
  if (fromChart?.length) {
    return fromChart.map((m) => ({
      name: shortModelName(m.modele),
      holdout: finiteOrNull(m.mape_holdout),
      cv: finiteOrNull(m.mape_cv),
    }));
  }
  return (comparisonRanked || [])
    .filter((r) => r.mape != null || r.mape_cv != null)
    .map((r) => ({
      name: shortModelName(r.modele),
      holdout: finiteOrNull(r.mape),
      cv: finiteOrNull(r.mape_cv),
    }));
}

function ModelTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={tooltipStyle}>
      <p style={{ fontWeight: 800, margin: "0 0 6px" }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ fontSize: 12, margin: 0, color: p.color }}>
          {p.name} : {fmtMape(p.value)}
        </p>
      ))}
    </div>
  );
}

function SeriesTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const p = payload.find((x) => x.value != null);
  if (!p) return null;
  const row = p.payload;
  const isHist = p.dataKey === "historique";
  return (
    <div style={tooltipStyle}>
      <p style={{ fontWeight: 800, margin: "0 0 6px" }}>{row.label}</p>
      <p style={{ fontSize: 12, margin: 0, color: isHist ? BNA.greenDark : BNA.gold }}>
        {p.name} : {fmtMd(p.value)}
      </p>
    </div>
  );
}

function LineHoverDot({ cx, cy, payload, dataKey, fill, name, onHover, onLeave }) {
  const value = payload?.[dataKey];
  if (value == null || cx == null || cy == null) return null;
  return (
    <circle
      cx={cx}
      cy={cy}
      r={5}
      fill={fill}
      stroke="#fff"
      strokeWidth={2}
      style={{ cursor: "pointer" }}
      onMouseEnter={() => onHover({ payload, dataKey, name, fill, value, cx, cy })}
      onMouseLeave={onLeave}
    />
  );
}

export default function ForecastCharts({ chartData, comparisonRanked, bestModelName }) {
  const [seriesHover, setSeriesHover] = useState(null);
  const mapeData = buildMapeBars(chartData, comparisonRanked);
  const seriesData = buildSeriesPoints(chartData);

  const lineTooltipPayload = seriesHover
    ? [{
        payload: seriesHover.payload,
        dataKey: seriesHover.dataKey,
        name: seriesHover.name,
        value: seriesHover.value,
        color: seriesHover.fill,
      }]
    : [];

  if (!mapeData.length && !seriesData.length) {
    return (
      <p style={{ color: BNA.textMuted, fontStyle: "italic", margin: 0 }}>
        Aucune donnée graphique — lancez d&apos;abord un entraînement.
      </p>
    );
  }

  return (
    <div style={chartsLayout}>
      {mapeData.length > 0 && (
        <section style={chartCard}>
          <h3 style={chartTitle}>Comparaison des modèles (MAPE %)</h3>
          <p style={chartHint}>
            Plus le MAPE est bas, meilleur est le modèle. Survolez une barre pour le détail.
            Barres : hold-out 80/20 et TimeSeriesSplit.
            {bestModelName ? (
              <>
                {" "}
                Modèle retenu : <b>{bestModelName}</b>.
              </>
            ) : null}
          </p>
          <div style={chartBox}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={mapeData} margin={{ top: 8, right: 16, left: 4, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BNA.borderSoft} />
                <XAxis
                  dataKey="name"
                  tick={{ fill: BNA.textMuted, fontSize: 11 }}
                  axisLine={{ stroke: BNA.border }}
                />
                <YAxis
                  tick={{ fill: BNA.textMuted, fontSize: 11 }}
                  axisLine={{ stroke: BNA.border }}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  cursor={tooltipCursor}
                  content={<ModelTooltip />}
                  shared={false}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar
                  dataKey="holdout"
                  name="Hold-out 80/20"
                  fill={BNA.green}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
                <Bar
                  dataKey="cv"
                  name="TimeSeriesSplit"
                  fill={BNA.steel}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={48}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}

      {seriesData.length > 0 && (
        <section style={chartCard}>
          <h3 style={chartTitle}>Historique et prévision (année suivante)</h3>
          <p style={chartHint}>
            Courbe verte : données historiques. Courbe dorée en pointillés : prévision sur 12 mois.
            Survolez un point pour afficher le détail du montant.
          </p>
          <div style={chartBoxTall}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={seriesData} margin={{ top: 12, right: 20, left: 8, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={BNA.borderSoft} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: BNA.textMuted, fontSize: 10 }}
                  axisLine={{ stroke: BNA.border }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: BNA.textMuted, fontSize: 11 }}
                  axisLine={{ stroke: BNA.border }}
                  tickFormatter={(v) => `${(v / 1e9).toFixed(0)}`}
                  label={{
                    value: "Md TND",
                    angle: -90,
                    position: "insideLeft",
                    style: { fill: BNA.textMuted, fontSize: 11 },
                  }}
                />
                <Tooltip
                  cursor={tooltipCursor}
                  active={Boolean(seriesHover)}
                  payload={lineTooltipPayload}
                  position={
                    seriesHover
                      ? { x: seriesHover.cx, y: seriesHover.cy }
                      : undefined
                  }
                  content={<SeriesTooltip />}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="historique"
                  name="Historique"
                  stroke={BNA.greenDark}
                  strokeWidth={2.5}
                  dot={(props) => (
                    <LineHoverDot
                      {...props}
                      dataKey="historique"
                      fill={BNA.greenDark}
                      name="Historique"
                      onHover={setSeriesHover}
                      onLeave={() => setSeriesHover(null)}
                    />
                  )}
                  activeDot={false}
                  connectNulls={false}
                />
                <Line
                  type="monotone"
                  dataKey="prevu"
                  name="Prévision"
                  stroke={BNA.gold}
                  strokeWidth={2.5}
                  strokeDasharray="6 4"
                  dot={(props) => (
                    <LineHoverDot
                      {...props}
                      dataKey="prevu"
                      fill={BNA.gold}
                      name="Prévision"
                      onHover={setSeriesHover}
                      onLeave={() => setSeriesHover(null)}
                    />
                  )}
                  activeDot={false}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>
      )}
    </div>
  );
}

const chartsLayout = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
};

const chartCard = { padding: 0 };

const chartTitle = {
  margin: "0 0 6px",
  fontSize: 16,
  fontWeight: 800,
  color: BNA.textDark,
};

const chartHint = {
  margin: "0 0 14px",
  fontSize: 13,
  color: BNA.textMuted,
  lineHeight: 1.5,
};

const chartBox = { width: "100%", height: 320 };

const chartBoxTall = { width: "100%", height: 380 };


