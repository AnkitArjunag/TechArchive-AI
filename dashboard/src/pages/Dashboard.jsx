import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../App.css";

const Dashboard = () => {

  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [tableData, setTableData] = useState([]);
  const [isThinking, setIsThinking] = useState(false);
  const [loadingInsights, setLoadingInsights] = useState(false);

  const chatEndRef = useRef(null);

  const API = "http://localhost:8000";
  const token = localStorage.getItem("token");

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // ----------------------------------------------------
  // FETCH THREADS
  // ----------------------------------------------------
  useEffect(() => {

    const fetchThreads = async () => {
      try {

        const res = await axios.get(`${API}/threads`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.threads.length > 0) {
          setThreads(res.data.threads);
          setActiveThread(res.data.threads[0]._id);
          setMessages(res.data.threads[0].messages || []);
        } else {

          const newRes = await axios.post(`${API}/threads`, {}, {
            headers: { Authorization: `Bearer ${token}` }
          });

          const newThread = {
            _id: newRes.data.thread_id,
            title: "New Chat",
            messages: []
          };

          setThreads([newThread]);
          setActiveThread(newThread._id);
          setMessages([]);
        }

      } catch (err) {
        console.error("THREAD ERROR:", err);
      }
    };

    if (token) fetchThreads();

  }, [token]);

  // ----------------------------------------------------
  // CREATE THREAD
  // ----------------------------------------------------
  const createThread = async () => {

    const res = await axios.post(`${API}/threads`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    const newThread = {
      _id: res.data.thread_id,
      title: "New Chat",
      messages: []
    };

    setThreads(prev => [newThread, ...prev]);
    setActiveThread(newThread._id);
    setMessages([]);
    setTableData([]);
  };

  const selectThread = (thread) => {
    setActiveThread(thread._id);
    setMessages(thread.messages || []);
    setTableData([]);
  };

  // ----------------------------------------------------
  // OPEN PDF
  // ----------------------------------------------------
  const openDocument = (doc) => {

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

    const file = pdfMap[docId];
    if (!file) return;

    const url = `http://localhost:8000/docs/${file}#page=${doc.pages}`;
    window.open(url, "_blank");
  };

  // ----------------------------------------------------
  // SEND MESSAGE (🔥 FIXED)
  // ----------------------------------------------------
  const handleSendMessage = async () => {

    if (!input.trim() || !activeThread) return;

    const userMessage = { role: "user", content: input };
    const updatedMessages = [...messages, userMessage];

    setMessages(updatedMessages);
    setInput("");
    setIsThinking(true);
    setLoadingInsights(true);
    setTableData([]);

    try {

      // Save user message
      await axios.post(
        `${API}/threads/${activeThread}/message`,
        userMessage,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // 🔥 CALL CHAT
      const chatRes = await axios.post(`${API}/chat`, {
        messages: updatedMessages
      });

      console.log("CHAT RESPONSE:", chatRes.data);

      // ✅ SET INSIGHTS
      setTableData(chatRes.data.chunks || []);

      const aiMessage = {
        role: "assistant",
        content: chatRes.data.answer
      };

      const finalMessages = [...updatedMessages, aiMessage];
      setMessages(finalMessages);

      // Save AI message
      await axios.post(
        `${API}/threads/${activeThread}/message`,
        aiMessage,
        { headers: { Authorization: `Bearer ${token}` } }
      );

    } catch (e) {

      console.error("CHAT ERROR:", e);

      setMessages([
        ...updatedMessages,
        { role: "assistant", content: "System error." }
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
        <div className="subtitle">Defense Research Intelligence Platform</div>
      </header>

      <div className="layout">

        {/* SIDEBAR */}
        <div className="sidebar">

          <button className="new-chat" onClick={createThread}>
            + New Chat
          </button>

          {threads.map(thread => (
            <div
              key={thread._id}
              className={activeThread === thread._id ? "thread active" : "thread"}
              onClick={() => selectThread(thread)}
            >
              {thread.title}
            </div>
          ))}

        </div>

        {/* CHAT */}
        <div className="chat-panel">

          <div className="chat-box">

            {messages.map((msg, i) => (
              <div key={i} className={`message ${msg.role}`}>
                {msg.content}
              </div>
            ))}

            {isThinking && (
              <div className="thinking">
                <div className="dots">
                  <span></span><span></span><span></span>
                </div>
                Agent reasoning...
              </div>
            )}

            <div ref={chatEndRef}></div>

          </div>

          <div className="input-area">

            <input
              value={input}
              placeholder="Ask the research agent..."
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage();
              }}
            />

            <button onClick={handleSendMessage}>
              Run
            </button>

          </div>

        </div>

        {/* INSIGHTS */}
        <div className="insights-panel">

          <h3>Extracted Insights</h3>

          {loadingInsights && <div>Analyzing documents...</div>}

          <div className="results">

            {tableData.length === 0 && !loadingInsights && (
              <div>No insights yet. Ask something.</div>
            )}

            {tableData.map((res, i) => (
              <div
                key={i}
                className="result-card"
                onClick={() => openDocument(res)}
              >
                <div className="hardware">
                  {res.hardware || "Relevant Chunk"}
                </div>

                <div className="content">
                  {res.content.substring(0, 140)}...
                </div>

                <div className="source">
                  📄 {res.source} • Page {res.pages}
                </div>
              </div>
            ))}

          </div>

        </div>

      </div>

    </div>
  );
};

export default Dashboard;