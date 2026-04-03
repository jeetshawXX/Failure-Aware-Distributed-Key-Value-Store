import { useEffect, useMemo, useState } from "react";
import axios from "axios";

const DEFAULT_NODES = {
  node1: true,
  node2: false,
  node3: false,
};

export default function App() {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [output, setOutput] = useState("Ready.");
  const [nodes, setNodes] = useState(DEFAULT_NODES);
  const [history, setHistory] = useState([]);
  const [dark, setDark] = useState(true);
  const [opsSeries, setOpsSeries] = useState([4, 6, 3, 7, 5, 8, 4, 6, 7, 5, 6, 8]);

  const API = "http://127.0.0.1:8000";
  const theme = useMemo(() => (dark ? darkTheme : lightTheme), [dark]);

  const pushEvent = (msg) => {
    setOutput(msg);
    setHistory((prev) => [msg, ...prev.slice(0, 9)]);
    setOpsSeries((prev) => {
      const nextValue = Math.max(1, Math.min(10, (msg.length % 10) + 1));
      return [...prev, nextValue].slice(-12);
    });
  };

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API}/status`);
      const data = res.data && Object.keys(res.data).length ? res.data : DEFAULT_NODES;
      setNodes(data);
    } catch {
      setNodes(DEFAULT_NODES);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handlePut = async () => {
    const k = key.trim();
    if (!k) {
      pushEvent("Key is required.");
      return;
    }

    try {
      const res = await axios.post(`${API}/kv`, {
        op: "PUT",
        key: k,
        value,
      });
      pushEvent(`PUT ${k} → ${res.data?.result ?? "OK"}`);
    } catch (err) {
      pushEvent(`PUT ${k} → ${err.response?.data?.detail || "Error"}`);
    }
  };

  const handleGet = async () => {
    const k = key.trim();
    if (!k) {
      pushEvent("Key is required.");
      return;
    }

    try {
      const res = await axios.post(`${API}/kv`, {
        op: "GET",
        key: k,
      });
      pushEvent(`GET ${k} → ${res.data?.result ?? "OK"}`);
    } catch (err) {
      pushEvent(`GET ${k} → ${err.response?.data?.detail || "Error"}`);
    }
  };

  const toggleNode = async (node) => {
    try {
      await axios.post(`${API}/node/${node}/toggle`);
      await fetchStatus();
    } catch {
      pushEvent(`Failed to toggle ${node}`);
    }
  };

  const entries = Object.entries(nodes);
  const aliveCount = entries.filter(([, v]) => v).length;
  const downCount = entries.length - aliveCount;

  return (
    <div style={theme.page}>
      <div style={theme.shell}>
        <header style={theme.header}>
          <div style={theme.headingBlock}>
            <div style={theme.badge}>Distributed KV Store</div>
            <h1 style={theme.title}>KV Store Dashboard</h1>
            <p style={theme.subtitle}>
              Replication, quorum, failure simulation, live cluster status, and request tracing.
            </p>
          </div>

          <button
            onClick={() => setDark((v) => !v)}
            style={theme.themeBtn}
            aria-label="toggle theme"
            title="toggle theme"
          >
            {dark ? "☀" : "🌙"}
          </button>
        </header>

        <section style={theme.statsGrid}>
          <StatCard label="Nodes" value={entries.length || 3} theme={theme} />
          <StatCard label="Alive" value={aliveCount} theme={theme} accent="good" />
          <StatCard label="Down" value={downCount} theme={theme} accent="bad" />
          <StatCard label="Ops" value={history.length} theme={theme} />
        </section>

        <main style={theme.grid}>
          <div style={theme.col}>
            <Panel title="KV Operations" theme={theme}>
              <div style={theme.form}>
                <label style={theme.label}>Key</label>
                <input
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="e.g. x"
                  style={theme.input}
                />

                <label style={theme.label}>Value</label>
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  placeholder="e.g. 100"
                  style={theme.input}
                />

                <div style={theme.buttonRow}>
                  <button onClick={handlePut} style={theme.putBtn}>
                    PUT
                  </button>
                  <button onClick={handleGet} style={theme.getBtn}>
                    GET
                  </button>
                </div>
              </div>
            </Panel>

            <Panel title="Output" theme={theme}>
              <div style={theme.outputBox}>
                <pre style={theme.output}>{output}</pre>
              </div>
            </Panel>

            <Panel title="Request Activity" theme={theme}>
              <div style={theme.chartWrap}>
                <div style={theme.chartHint}>Recent operations intensity</div>
                <div style={theme.barChart}>
                  {opsSeries.map((v, i) => (
                    <div key={i} style={theme.barSlot}>
                      <div
                        style={{
                          ...theme.bar,
                          height: `${v * 14}px`,
                          opacity: 0.5 + v / 12,
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            </Panel>
          </div>

          <div style={theme.col}>
            <Panel title="Cluster Topology" theme={theme}>
              <div style={theme.topologyBox}>
                <div style={theme.topologyLine} />
                <div style={theme.topologyNodes}>
                  {entries.length ? (
                    entries.map(([node, status]) => (
                      <div key={node} style={theme.topologyNodeWrap}>
                        <div
                          style={{
                            ...theme.topologyNode,
                            background: status ? theme.aliveColor : theme.deadColor,
                            boxShadow: status
                              ? `0 0 24px ${theme.aliveColor}66`
                              : `0 0 24px ${theme.deadColor}66`,
                          }}
                        />
                        <div style={theme.topologyName}>{node}</div>
                        <div style={status ? theme.statusUp : theme.statusDown}>
                          {status ? "Alive" : "Down"}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div style={theme.emptyState}>No node data yet.</div>
                  )}
                </div>
              </div>
            </Panel>

            <Panel title="Cluster Control" theme={theme}>
              <div style={theme.clusterList}>
                {entries.length ? (
                  entries.map(([node, status]) => (
                    <div
                      key={node}
                      style={{
                        ...theme.nodeRow,
                        background: status ? theme.rowUpBg : theme.rowDownBg,
                      }}
                    >
                      <div>
                        <div style={theme.nodeRowName}>{node}</div>
                        <div style={theme.nodeRowStatus}>{status ? "running" : "stopped"}</div>
                      </div>

                      <div style={theme.rowRight}>
                        <span style={status ? theme.dotUp : theme.dotDown} />
                        <button onClick={() => toggleNode(node)} style={theme.toggleBtn}>
                          Toggle
                        </button>
                      </div>
                    </div>
                  ))
                ) : (
                  <div style={theme.emptyState}>No nodes loaded.</div>
                )}
              </div>
            </Panel>

            <Panel title="History" theme={theme}>
              <div style={theme.historyBox}>
                {history.length ? (
                  history.map((item, i) => (
                    <div key={i} style={theme.historyItem}>
                      {item}
                    </div>
                  ))
                ) : (
                  <div style={theme.emptyState}>Nothing yet.</div>
                )}
              </div>
            </Panel>
          </div>
        </main>
      </div>
    </div>
  );
}

function Panel({ title, children, theme }) {
  return (
    <section style={theme.panel}>
      <div style={theme.panelHeader}>{title}</div>
      {children}
    </section>
  );
}

function StatCard({ label, value, theme, accent = "normal" }) {
  const borderColor =
    accent === "good" ? theme.aliveColor : accent === "bad" ? theme.deadColor : theme.border;

  const valueColor =
    accent === "good" ? theme.aliveColor : accent === "bad" ? theme.deadColor : theme.text;

  return (
    <div style={{ ...theme.statCard, borderColor }}>
      <div style={theme.statLabel}>{label}</div>
      <div style={{ ...theme.statValue, color: valueColor }}>{value}</div>
    </div>
  );
}

const common = {
  page: {
    minHeight: "100vh",
    padding: "28px",
    fontFamily:
      'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    position: "relative",
    overflowX: "hidden",
  },
  shell: {
    maxWidth: "1280px",
    margin: "0 auto",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    marginBottom: "18px",
  },
  headingBlock: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  badge: {
    display: "inline-flex",
    alignItems: "center",
    width: "fit-content",
    padding: "6px 10px",
    borderRadius: "999px",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
  },
  title: {
    margin: 0,
    fontSize: "clamp(32px, 4vw, 54px)",
    lineHeight: 1.02,
    letterSpacing: "-0.05em",
  },
  subtitle: {
    margin: 0,
    maxWidth: "820px",
    lineHeight: 1.6,
    fontSize: "15px",
    opacity: 0.82,
  },
  themeBtn: {
    width: "52px",
    height: "52px",
    borderRadius: "16px",
    border: "1px solid transparent",
    cursor: "pointer",
    fontSize: "16px",
    fontWeight: 800,
    flex: "0 0 auto",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
    gap: "14px",
    marginBottom: "18px",
  },
  statCard: {
    padding: "16px",
    borderRadius: "18px",
    border: "1px solid",
    backdropFilter: "blur(12px)",
    minHeight: "92px",
  },
  statLabel: {
    fontSize: "12px",
    opacity: 0.72,
    marginBottom: "10px",
    textTransform: "uppercase",
    letterSpacing: "0.08em",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: 900,
    lineHeight: 1,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)",
    gap: "18px",
    alignItems: "start",
  },
  col: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  panel: {
    borderRadius: "22px",
    border: "1px solid",
    backdropFilter: "blur(14px)",
    padding: "18px",
    boxShadow: "0 18px 60px rgba(15,23,42,0.10)",
  },
  panelHeader: {
    fontSize: "18px",
    fontWeight: 900,
    marginBottom: "14px",
    letterSpacing: "-0.03em",
  },
  form: {
    display: "grid",
    gap: "10px",
  },
  label: {
    fontSize: "13px",
    fontWeight: 800,
    opacity: 0.9,
    marginTop: "4px",
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "13px 14px",
    borderRadius: "14px",
    outline: "none",
    fontSize: "15px",
  },
  buttonRow: {
    display: "flex",
    gap: "10px",
    marginTop: "6px",
  },
  putBtn: {
    flex: 1,
    padding: "13px 14px",
    borderRadius: "14px",
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: "14px",
    color: "white",
  },
  getBtn: {
    flex: 1,
    padding: "13px 14px",
    borderRadius: "14px",
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    fontSize: "14px",
    color: "white",
  },
  outputBox: {
    minHeight: "110px",
    borderRadius: "16px",
    padding: "12px",
    border: "1px solid",
  },
  output: {
    margin: 0,
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    fontSize: "14px",
    lineHeight: 1.65,
    fontWeight: 600,
  },
  chartWrap: {
    padding: "2px 0 0",
  },
  chartHint: {
    fontSize: "12px",
    opacity: 0.72,
    marginBottom: "12px",
  },
  barChart: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
    minHeight: "132px",
    padding: "10px 4px 4px",
    borderRadius: "16px",
  },
  barSlot: {
    flex: 1,
    minWidth: "10px",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  bar: {
    width: "100%",
    maxWidth: "22px",
    borderRadius: "12px 12px 4px 4px",
  },
  topologyBox: {
    minHeight: "210px",
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  topologyLine: {
    position: "relative",
    height: "2px",
    margin: "58px 12% 0",
    borderRadius: "999px",
    background:
      "linear-gradient(90deg, rgba(148,163,184,0.0), rgba(148,163,184,0.55), rgba(148,163,184,0.0))",
  },
  topologyNodes: {
    display: "grid",
    gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
    gap: "12px",
    marginTop: "-44px",
  },
  topologyNodeWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    textAlign: "center",
  },
  topologyNode: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    transition: "transform 180ms ease, box-shadow 180ms ease, background 180ms ease",
  },
  topologyName: {
    fontWeight: 900,
    fontSize: "14px",
  },
  statusUp: {
    fontSize: "12px",
    color: "#22c55e",
    fontWeight: 700,
  },
  statusDown: {
    fontSize: "12px",
    color: "#ef4444",
    fontWeight: 700,
  },
  clusterList: {
    display: "grid",
    gap: "10px",
  },
  nodeRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    gap: "14px",
    padding: "14px",
    borderRadius: "16px",
  },
  nodeRowName: {
    fontWeight: 900,
    fontSize: "15px",
  },
  nodeRowStatus: {
    fontSize: "12px",
    opacity: 0.8,
    marginTop: "4px",
    fontWeight: 700,
  },
  rowRight: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    flexShrink: 0,
  },
  dotUp: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 12px rgba(34,197,94,0.7)",
    display: "inline-block",
  },
  dotDown: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#ef4444",
    boxShadow: "0 0 12px rgba(239,68,68,0.7)",
    display: "inline-block",
  },
  toggleBtn: {
    padding: "10px 14px",
    borderRadius: "12px",
    border: "none",
    cursor: "pointer",
    fontWeight: 900,
    minWidth: "90px",
  },
  historyBox: {
    display: "grid",
    gap: "8px",
    maxHeight: "240px",
    overflowY: "auto",
    paddingRight: "2px",
  },
  historyItem: {
    padding: "10px 12px",
    borderRadius: "12px",
    fontSize: "13px",
    lineHeight: 1.5,
    border: "1px solid",
    fontWeight: 600,
  },
  emptyState: {
    opacity: 0.7,
    fontSize: "14px",
    padding: "8px 2px",
  },
};

const darkTheme = {
  ...common,
  text: "#e5eefc",
  border: "rgba(148,163,184,0.16)",
  aliveColor: "#22c55e",
  deadColor: "#ef4444",
  page: {
    ...common.page,
    background:
      "radial-gradient(circle at top, rgba(59,130,246,0.16), transparent 28%), linear-gradient(180deg, #020617 0%, #0b1220 100%)",
    color: "#e5eefc",
  },
  badge: {
    ...common.badge,
    background: "rgba(59,130,246,0.14)",
    border: "1px solid rgba(59,130,246,0.22)",
    color: "#dbeafe",
  },
  themeBtn: {
    ...common.themeBtn,
    background: "#334155",
    color: "#fff",
    borderColor: "rgba(148,163,184,0.18)",
  },
  statCard: {
    ...common.statCard,
    background: "rgba(15,23,42,0.72)",
    color: "#e5eefc",
  },
  panel: {
    ...common.panel,
    background: "rgba(15,23,42,0.66)",
    borderColor: "rgba(148,163,184,0.16)",
    color: "#e5eefc",
  },
  input: {
    ...common.input,
    background: "rgba(2,6,23,0.74)",
    color: "#e5eefc",
    border: "1px solid rgba(148,163,184,0.18)",
  },
  outputBox: {
    ...common.outputBox,
    background: "rgba(2,6,23,0.62)",
    borderColor: "rgba(148,163,184,0.16)",
  },
  output: {
    ...common.output,
    color: "#a7f3d0",
  },
  putBtn: {
    ...common.putBtn,
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
  },
  getBtn: {
    ...common.getBtn,
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
  },
  toggleBtn: {
    ...common.toggleBtn,
    background: "#475569",
    color: "#fff",
  },
  historyItem: {
    ...common.historyItem,
    background: "rgba(2,6,23,0.5)",
    borderColor: "rgba(148,163,184,0.16)",
    color: "#e5eefc",
  },
  rowUpBg: "rgba(34,197,94,0.14)",
  rowDownBg: "rgba(239,68,68,0.14)",
};

const lightTheme = {
  ...common,
  text: "#0f172a",
  border: "rgba(15,23,42,0.10)",
  aliveColor: "#16a34a",
  deadColor: "#dc2626",
  page: {
    ...common.page,
    background:
      "radial-gradient(circle at top, rgba(59,130,246,0.10), transparent 28%), linear-gradient(180deg, #f8fbff 0%, #eef2ff 100%)",
    color: "#0f172a",
  },
  badge: {
    ...common.badge,
    background: "rgba(37,99,235,0.10)",
    border: "1px solid rgba(37,99,235,0.16)",
    color: "#1d4ed8",
  },
  themeBtn: {
    ...common.themeBtn,
    background: "#e2e8f0",
    color: "#0f172a",
    borderColor: "rgba(15,23,42,0.10)",
  },
  statCard: {
    ...common.statCard,
    background: "rgba(255,255,255,0.84)",
    color: "#0f172a",
  },
  panel: {
    ...common.panel,
    background: "rgba(255,255,255,0.86)",
    borderColor: "rgba(15,23,42,0.08)",
    color: "#0f172a",
  },
  input: {
    ...common.input,
    background: "#ffffff",
    color: "#0f172a",
    border: "1px solid rgba(15,23,42,0.10)",
  },
  outputBox: {
    ...common.outputBox,
    background: "#ffffff",
    borderColor: "rgba(15,23,42,0.08)",
  },
  output: {
    ...common.output,
    color: "#0f172a",
  },
  putBtn: {
    ...common.putBtn,
    background: "linear-gradient(135deg, #22c55e, #16a34a)",
  },
  getBtn: {
    ...common.getBtn,
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
  },
  toggleBtn: {
    ...common.toggleBtn,
    background: "#e2e8f0",
    color: "#0f172a",
  },
  historyItem: {
    ...common.historyItem,
    background: "#ffffff",
    borderColor: "rgba(15,23,42,0.08)",
    color: "#0f172a",
  },
  rowUpBg: "rgba(34,197,94,0.12)",
  rowDownBg: "rgba(239,68,68,0.12)",
};