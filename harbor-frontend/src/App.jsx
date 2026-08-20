import { useState } from "react";

function App() {
  const [status, setStatus] = useState("Not checked yet");

  const checkBackend = async () => {
    try {
      const res = await fetch("http://localhost:5037/api/Health/db");
      const data = await res.json();
      setStatus(`Backend says: ${data.status}, result: ${data.result}`);
    } catch (err) {
      setStatus("Could not reach backend");
    }
  };

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Harbor</h1>
      <button onClick={checkBackend}>Check backend + DB connection</button>
      <p>{status}</p>
    </div>
  );
}

export default App;