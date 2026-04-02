import { useState, useEffect } from "react";
import axios from "axios";

export default function App() {
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [output, setOutput] = useState("");
  const [nodes, setNodes] = useState({});
  const [history, setHistory] = useState([]);

  const API = "http://127.0.0.1:8000";

  const fetchStatus = async () => {
    try {
      const res = await axios.get(`${API}/status`);
      setNodes(res.data);
    } catch (err) {
      console.log(err);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, []);

  const handlePut = async () => {
    try {
      const res = await axios.post(`${API}/kv`, {
        op: "PUT",
        key,
        value
      });

      const result = res.data.result;
      setOutput(result);

      setHistory(prev => [
        `PUT ${key} -> ${result}`,
        ...prev.slice(0, 9)
      ]);

    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Error occurred";
      setOutput(errorMsg);

      setHistory(prev => [
        `PUT ${key} -> ${errorMsg}`,
        ...prev.slice(0, 9)
      ]);
    }
  };

  const handleGet = async () => {
    try {
      const res = await axios.post(`${API}/kv`, {
        op: "GET",
        key
      });

      const result = res.data.result;
      setOutput(result);

      setHistory(prev => [
        `GET ${key} -> ${result}`,
        ...prev.slice(0, 9)
      ]);

    } catch (err) {
      const errorMsg = err.response?.data?.detail || "Error occurred";
      setOutput(errorMsg);

      setHistory(prev => [
        `GET ${key} -> ${errorMsg}`,
        ...prev.slice(0, 9)
      ]);
    }
  };

  const toggleNode = async (node) => {
  try {
    await axios.post(`${API}/node/${node}/toggle`);
    fetchStatus();
  } catch (err) {
    console.log(err);
  }
};






  return (
    <div style={{
      minHeight: "100vh",
      background: "#111",
      color: "white",
      padding: "40px"
    }}>
      <h1>Distributed KV Store Dashboard</h1>

      {/* Inputs */}
      <div style={{ marginTop: "20px" }}>
        <input
          placeholder="Key"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          style={{ marginRight: "10px" }}
        />

        <input
          placeholder="Value"
          value={value}
          onChange={(e) => setValue(e.target.value)}
        />
      </div>

      {/* Buttons */}
      <div style={{ marginTop: "20px" }}>
        <button onClick={handlePut} style={{ marginRight: "10px" }}>
          PUT
        </button>

        <button onClick={handleGet}>
          GET
        </button>
      </div>

      {/* Cluster Status */}
      <div style={{ marginTop: "20px" }}>
        <h3>Cluster Status</h3>
        {Object.entries(nodes).map(([node, status]) => (
          <div key={node}>
            {node}: {status ? "UP" : "DOWN"}
          </div>
        ))}
      </div>


      <div style={{ marginTop: "10px" }}>
        {Object.keys(nodes).map((node) => (
          <button
            key={node}
            onClick={() => toggleNode(node)}
            style={{ marginRight: "10px" }}
          >
          Toggle {node}
        </button>
        ))}
      </div>
      

      {/* Request History */}
      <div style={{ marginTop: "20px" }}>
        <h3>Request History</h3>
        <div style={{
          background: "#222",
          padding: "10px",
          maxHeight: "200px",
          overflowY: "auto"
        }}>
          {history.map((item, idx) => (
            <div key={idx}>{item}</div>
          ))}
        </div>
      </div>

      {/* Output */}
      <div style={{
        marginTop: "30px",
        background: "black",
        padding: "20px"
      }}>
        <pre>{output}</pre>
      </div>
    </div>
  );
}