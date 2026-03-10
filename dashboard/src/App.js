import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "./App.css";

function App() {

  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [tableData, setTableData] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isThinking]);

  const openDocument = (doc) => {

  // Extract document number (doc4, doc10, etc.)
  const match = doc.source.match(/doc\d+/);

  if (!match) return;

  const docId = match[0];

  const pdfMap = {
    doc1: "doc1_cooling_sspa.pdf",
    doc2: "doc2_weapon_params.pdf",
    doc3: "doc3_rf_fingerprinting.pdf",
    doc4: "doc4_ugv_navigation.pdf",
    doc5: "doc5_rf_microwave_trends.pdf",
    doc6: "doc6_digital_twin.pdf",
    doc7: "doc7_defence_ecosystem.pdf",
    doc8: "doc8_brain_computer.pdf",
    doc9: "doc9_bio_toxins.pdf",
    doc10: "doc10_aircraft_aerodynamics.pdf"
  };

  const filename = pdfMap[docId];

  if (!filename) return;

  const url = `http://localhost:8000/docs/${filename}#page=${doc.pages}`;

  window.open(url, "_blank");

};

  const handleSendMessage = async () => {

    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    const updatedHistory = [...messages, userMessage];

    setMessages(updatedHistory);
    setInput("");

    setIsThinking(true);
    setLoadingInsights(true);

    setTableData([]); // clear previous results

    try {

      const searchRes = await axios.get(
        `http://localhost:8000/search?q=${input}`
      );

      setTableData(searchRes.data.results);

      const chatRes = await axios.post(
        `http://localhost:8000/chat`,
        { messages: updatedHistory }
      );

      setMessages(prev => [
        ...prev,
        { role: "assistant", content: chatRes.data.answer }
      ]);

    } catch (error) {

      setMessages(prev => [
        ...prev,
        {
          role: "assistant",
          content: "System error: Local AI node unavailable."
        }
      ]);

    } finally {

      setIsThinking(false);
      setLoadingInsights(false);

    }
  };

  return (

    <div className="app">

      <header className="topbar">

        <div className="logo">TechArchive AI</div>

        <div className="badges">
          <span className="badge">🧠 Llama 3.2</span>
          <span className="badge">💻 Local</span>
          <span className="badge active">Agent Active</span>
        </div>

      </header>

      <div className="layout">

        {/* CHAT PANEL */}

        <div className="chat-panel">

          <div className="panel-title">🤖 Research Agent</div>

          <div className="chat-box">

            {messages.length === 0 && (
              <div className="welcome">
                Ask something like:
                <div className="hint">
                  Compare SMT temp of MoS2 across docs
                </div>
              </div>
            )}

            {messages.map((msg, i) => (

              <div key={i} className={`message ${msg.role}`}>
                {msg.content}
              </div>

            ))}

            {isThinking && (
              <div className="thinking">
                <div className="dots">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
                Agent reasoning over documents...
              </div>
            )}

            <div ref={chatEndRef} />

          </div>

          <div className="input-area">

            <input
              value={input}
              placeholder="Ask the research agent..."
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
            />

            <button
              onClick={handleSendMessage}
              disabled={isThinking}
            >
              Run
            </button>

          </div>

        </div>


        {/* INSIGHTS PANEL */}

        <div className="data-panel">

          <div className="panel-title">Extracted Insights</div>

          {loadingInsights && (
            <div className="loading-insights">
              Searching documents...
            </div>
          )}

          <div className="results">

            {tableData.length === 0 && !loadingInsights && (
              <div className="no-data">
                Awaiting query...
              </div>
            )}

            {tableData.map((res, i) => (

              <div
                className="result-card"
                key={i}
                onClick={() => openDocument(res)}
              >

                <div className="hardware">
                  {res.hardware || "General"}
                </div>

                <div className="content">
                  {res.content.substring(0, 150)}...
                </div>

                <div className="source">
                  {res.source} • Pg {res.pages}
                </div>

              </div>

            ))}

          </div>

        </div>

      </div>

      <footer className="footer">
        Local Agentic RAG System
      </footer>

    </div>

  );

}

export default App;