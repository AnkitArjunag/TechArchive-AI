import React, { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import Navbar from "../pages/Navbar";

const Dashboard = () => {
  const [threads, setThreads] = useState([]);
  const [activeThread, setActiveThread] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(false);

  const [pdfFile, setPdfFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const [user, setUser] = useState({ name: "", email: "" });

  const API = "http://localhost:8000/api";
  const token = localStorage.getItem("token");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ✅ Fetch user info
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const res = await axios.get(`${API}/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(res.data);
      } catch (err) {
        console.error("User fetch failed");
      }
    };

    if (token) fetchUser();
  }, [token]);

  const fetchThreads = useCallback(async () => {
    const res = await axios.get(`${API}/threads`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    setThreads(res.data.threads);
  }, [token]);

  useEffect(() => {
    if (token) fetchThreads();
  }, [token, fetchThreads]);

  const createThread = async () => {
    const res = await axios.post(`${API}/threads`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });

    setActiveThread(res.data.thread_id);
    setMessages([]);
    setInsights([]);
    fetchThreads();
  };

  const loadThread = async (id) => {
    const res = await axios.get(`${API}/threads/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    setActiveThread(id);
    setMessages(res.data.messages || []);
    setInsights([]);
  };

  const deleteThread = async (id) => {
    await axios.delete(`${API}/threads/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });

    setThreads(prev => prev.filter(t => t._id !== id));

    if (activeThread === id) {
      setActiveThread(null);
      setMessages([]);
      setInsights([]);
    }
  };

  const handlePDFUpload = async () => {
    if (!pdfFile) return alert("Select a PDF first");

    const formData = new FormData();
    formData.append("file", pdfFile);

    setUploading(true);

    try {
      await axios.post(`${API}/upload-pdf`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setPdfFile(null);
    } catch (err) {
      console.error(err);
      alert("Upload failed");
    }

    setUploading(false);
  };

  const highlightBestSentence = (text, query) => {
    if (!text || !query) return text;

    const sentences = text.split(/(?<=[.!?])\s+/);
    let best = "";
    let maxScore = 0;

    sentences.forEach(s => {
      let score = 0;
      query.split(" ").forEach(word => {
        if (s.toLowerCase().includes(word.toLowerCase())) score++;
      });
      if (score > maxScore) {
        maxScore = score;
        best = s;
      }
    });

    if (!best) return text;

    return text.replace(
      best,
      `<mark class="bg-green-400/30 text-white px-1 rounded">${best}</mark>`
    );
  };

  const openDocument = (r) => {
    if (!r?.source) return;

    const file = r.source;
    const page = Array.isArray(r.page) ? r.page[0] : r.page || 1;

    const pdfMap = {
      doc1: "doc1_cooling_sspa.pdf",
      doc2: "doc2_weapon_params.pdf",
      doc3: "doc3_rf_fingerprinting.pdf",
      doc4: "doc4_ugv_navigation.pdf",
      doc5: "doc5_rf_microwave_trends.pdf",
      doc6: "doc6_digital_twin.pdf",
      doc7: "doc7_defence_ecosystem.pdf",
      doc8: "doc8_brain_computer.pdf"
    };

    const match = file.match(/doc\d+/);

    if (match && pdfMap[match[0]]) {
      window.open(
        `http://localhost:8000/docs/${pdfMap[match[0]]}#page=${page}`,
        "_blank"
      );
    } else {
      window.open(
        `http://localhost:8000/uploads/${file}#page=${page}`,
        "_blank"
      );
    }
  };

  const handleSend = async () => {
  if (!input.trim() || loading || !activeThread) return;

  const userMsg = { role: "user", content: input };
  const updatedMessages = [...messages, userMsg];

  setMessages(updatedMessages);
  setInput("");
  setLoading(true);

  await axios.post(`${API}/threads/${activeThread}/message`, userMsg, {
    headers: { Authorization: `Bearer ${token}` }
  });

  const insightsRes = await axios.post(`${API}/insights`, {
    messages: updatedMessages
  });

  setInsights(insightsRes.data.insights || []);

  const response = await fetch(`${API}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages: updatedMessages })
  });

  const reader = response.body.getReader();
  const decoder = new TextDecoder("utf-8");

  let accumulated = "";

  // ✅ Add empty assistant message
  setMessages(prev => [...prev, { role: "assistant", content: "" }]);

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value || new Uint8Array(), { stream: true });
    accumulated += chunk;

    const newText = accumulated; // ✅ fixes ESLint warning

    setMessages(prev => {
      const updated = [...prev];
      updated[updated.length - 1] = {
        role: "assistant",
        content: newText
      };
      return updated;
    });
  }

  // ✅ FIX: use accumulated instead of undefined text
  const assistantMsg = { role: "assistant", content: accumulated };

  setMessages([...updatedMessages, assistantMsg]);

  await axios.post(
    `${API}/threads/${activeThread}/message`,
    assistantMsg,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  setLoading(false);
};

  return (
    <div className="h-screen flex flex-col bg-[#0B0F19] text-white">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">

        {/* SIDEBAR */}
        <div className="w-72 p-4 bg-[#0F1624] border-r border-white/10 flex flex-col overflow-y-auto">

          <button
            onClick={createThread}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 mb-4"
          >
            + New Chat
          </button>

          {threads.map(t => (
            <div
              key={t._id}
              onClick={() => loadThread(t._id)}
              className={`group p-3 rounded-lg cursor-pointer mb-2 flex justify-between ${
                activeThread === t._id
                  ? "bg-purple-600/30"
                  : "hover:bg-white/10"
              }`}
            >
              <span className="truncate">{t.title}</span>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteThread(t._id);
                }}
                className="opacity-0 group-hover:opacity-100"
              >
                🗑️
              </button>
            </div>
          ))}

          {/* USER INFO */}
          <div className="mt-auto pt-4 border-t border-white/10">
            <div className="font-medium">{user.name || "User"}</div>
            <div className="text-gray-400 text-xs">{user.email}</div>
          </div>
        </div>

        {/* CHAT */}
        <div className="flex-1 flex flex-col">

          <div className="flex-1 overflow-y-auto px-10 py-8">
            {!activeThread ? (
              <div className="flex flex-col items-center justify-center h-full">
                <h2 className="text-2xl mb-4">Welcome to TechArchive AI</h2>
                <button
                  onClick={createThread}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600"
                >
                  Start New Chat
                </button>
              </div>
            ) : (
              <div className="max-w-4xl mx-auto space-y-6">

                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`px-6 py-4 rounded-2xl max-w-[75%] ${
                      m.role === "user"
                        ? "bg-gradient-to-r from-purple-600 to-blue-500"
                        : "bg-white/5 border border-white/10"
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {loading && <div>Thinking...</div>}

                <div ref={chatEndRef}></div>
              </div>
            )}
          </div>

          {/* INPUT */}
          <div className="p-6 border-t border-white/10">
            <div className="max-w-3xl mx-auto flex items-center gap-2 bg-white/5 rounded-2xl p-3">

              <input
                type="file"
                accept="application/pdf"
                id="pdfUpload"
                onChange={(e) => setPdfFile(e.target.files[0])}
                className="hidden"
              />

              <label htmlFor="pdfUpload" className="px-3 py-2 bg-white/10 rounded-lg cursor-pointer">
                📎
              </label>

              <input
                value={input}
                placeholder="Type your message..."
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 bg-transparent outline-none px-4"
              />

              <button
  onClick={handlePDFUpload}
  disabled={!pdfFile || uploading}
  className="px-3 py-2 bg-green-500 rounded-lg"
>
  {uploading ? "..." : "⬆️"}
</button>

              <button onClick={handleSend} className="px-5 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600">
                Send
              </button>
            </div>
          </div>
        </div>

        {/* INSIGHTS */}
        <div className="w-72 p-3 bg-[#0F1624] border-l border-white/10 overflow-y-auto">

          <h3 className="mb-4 text-lg font-semibold">Insights</h3>

          {insights

          .filter(r => (r.score || 0) > 0.1)
          .slice(0, 3)
          .map((r, i) => {
            const score = Math.round((r.score || 0) * 100);

            const badge =
              score > 85
                ? "bg-green-500/20 text-green-400"
                : score > 60
                ? "bg-yellow-500/20 text-yellow-400"
                : "bg-red-500/20 text-red-400";

            return (
              <div
  key={i}
  className={`mb-3 p-3 rounded-xl transition cursor-pointer ${
    i === 0
      ? "bg-green-500/10 border border-green-400 shadow-lg"
      : "bg-white/5 border border-white/10 hover:bg-white/10"
  }`}
  onClick={() => openDocument(r)}
>
                <div className="flex justify-between mb-2">
                  <span className={`px-2 py-1 text-xs rounded ${badge}`}>
                    {score}% Relevance
                  </span>
                  <span className="text-xs text-gray-400">{r.source}</span>
                </div>

                <div
                  className="text-sm mb-3"
                  dangerouslySetInnerHTML={{
                    __html: highlightBestSentence(
                      r.content.substring(0, 140),
                      input
                    )
                  }}
                />

                <div className="text-blue-400 text-xs flex justify-between">
                  <span>View Source</span>
                  <span>↗</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
};

export default Dashboard;