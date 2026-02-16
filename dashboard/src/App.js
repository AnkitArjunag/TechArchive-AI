import React, { useState } from 'react';
import axios from 'axios';
import './App.css';

const App = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [chatResponse, setChatResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    setChatResponse("Analyzing defense archive...");

    try {
      // 1. Fetch data for the Automated Parameter Table
      const searchRes = await axios.get(`http://localhost:8000/search?q=${query}`);
      setResults(searchRes.data.results);

      // 2. Fetch the Grounded AI Answer
      const chatRes = await axios.post(`http://localhost:8000/chat`, { user_query: query });
      setChatResponse(chatRes.data.answer);

    } catch (error) {
      console.error("System Error:", error);
      setChatResponse("Error: Could not reach the Intelligence Hub.");
    }
    setLoading(false);
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>TechArchive AI: Defense Research Portal</h1>
      </header>

      <main className="dashboard-main">
        <section className="interaction-panel">
          <div className="search-box">
            <input 
              type="text" 
              placeholder="Query archive (e.g., MoS2 SMT, xMIMO specs)..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            />
            <button onClick={handleSearch} disabled={loading}>
              {loading ? 'Processing...' : 'Search Archive'}
            </button>
          </div>

          <div className="chat-display">
            <h3>Interactive Research Assistant</h3>
            <div className="response-area">
              <p style={{ whiteSpace: 'pre-wrap' }}>{chatResponse || "Enter a query to begin analysis..."}</p>
            </div>
          </div>
        </section>

        <section className="parameter-panel">
          <h3>Automated Parameter Table</h3>
          <table>
            <thead>
              <tr>
                <th>Hardware Module</th>
                <th>Extracted Parameters</th>
                <th>Source (Page)</th>
              </tr>
            </thead>
            <tbody>
              {results.length > 0 ? results.map((res, index) => (
                <tr key={index}>
                  <td><strong>{res.hardware || "General"}</strong></td>
                  <td>{res.content.substring(0, 150)}...</td>
                  <td>{res.source}<br/>(Pg {res.pages})</td>
                </tr>
              )) : (
                <tr><td colSpan="3" style={{textAlign: 'center'}}>No data retrieved yet.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </main>
    </div>
  );
};

export default App;