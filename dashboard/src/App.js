import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import './App.css';

const App = () => {
  // 1. Conversation History State
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  // Auto-scroll to latest message
  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    const updatedHistory = [...messages, userMessage];
    
    setMessages(updatedHistory);
    setInput('');
    setLoading(true);

    try {
      // 1. Update Parameter Table (Phase 3 Retrieval)
      const searchRes = await axios.get(`http://localhost:8000/search?q=${input}`);
      setTableData(searchRes.data.results);

      // 2. Post Full History for Multi-turn Reasoning
      const chatRes = await axios.post(`http://localhost:8000/chat`, { 
        messages: updatedHistory 
      });

      setMessages([...updatedHistory, { role: 'assistant', content: chatRes.data.answer }]);
    } catch (error) {
      console.error("System Error:", error);
      setMessages([...updatedHistory, { role: 'assistant', content: "Error: Intelligence Hub offline." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="status-badge">● LOCAL OLLAMA ACTIVE</div>
        <h1>TechArchive AI: Defense Research Portal</h1>
      </header>

      <main className="dashboard-main">
        {/* Modernized Chat Section */}
        <section className="interaction-panel card">
          <div className="chat-window">
            <h3>Interactive Research Assistant</h3>
            <div className="message-list">
              {messages.length === 0 && (
                <div className="welcome-prompt">
                  Query the archive to begin deep reasoning (e.g., "What is the SMT temp for MoS2?").
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={`chat-bubble ${msg.role}`}>
                  <div className="bubble-content">
                    <strong>{msg.role === 'user' ? 'You' : 'AI Assistant'}:</strong>
                    <p>{msg.content}</p>
                  </div>
                </div>
              ))}
              {loading && <div className="typing-indicator">Assistant is reasoning...</div>}
              <div ref={chatEndRef} />
            </div>

            <div className="input-box">
              <input 
                type="text" 
                placeholder="Ask follow-up questions or new specs..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              />
              <button onClick={handleSendMessage} disabled={loading}>
                {loading ? '...' : 'Send'}
              </button>
            </div>
          </div>
        </section>

        {/* Automated Parameter Table */}
        <section className="parameter-panel card">
          <h3>Automated Parameter Table</h3>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Hardware Module</th>
                  <th>Extracted Parameters</th>
                  <th>Source</th>
                </tr>
              </thead>
              <tbody>
                {tableData.length > 0 ? tableData.map((res, index) => (
                  <tr key={index}>
                    <td><strong>{res.hardware || "N/A"}</strong></td>
                    <td>{res.content.substring(0, 150)}...</td>
                    <td><span className="source-tag">{res.source}</span><br/>(Pg {res.pages})</td>
                  </tr>
                )) : (
                  <tr><td colSpan="3" className="no-data">Archive data will appear here.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;