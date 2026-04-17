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
  const [uploadResult, setUploadResult] = useState(null);

  const API = "http://localhost:8000/api";
  const token = localStorage.getItem("token");
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
      const res = await axios.post(`${API}/upload-pdf`, formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });

      setUploadResult(res.data);
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

  const getColor = (score) => {
    if (score > 85) return "text-green-400";
    if (score > 60) return "text-yellow-400";
    return "text-red-400";
  };

  // 🔥 FINAL DOCUMENT HANDLER (doc1–doc8 + uploads)
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

    const text = await response.text();

    setMessages([
      ...updatedMessages,
      { role: "assistant", content: text }
    ]);

    setLoading(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-900 via-gray-900 to-purple-900 text-white">
      <Navbar />

      <div className="flex flex-1 overflow-hidden">

        {/* SIDEBAR */}
        <div className="w-64 p-4 space-y-3 bg-white/5 border-r border-white/10 overflow-y-auto">
          <button
            onClick={createThread}
            className="w-full mb-4 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600"
          >
            + New Chat
          </button>

          {threads.map(t => (
            <div
              key={t._id}
              onClick={() => loadThread(t._id)}
              className={`group p-3 rounded-xl cursor-pointer flex justify-between ${
                activeThread === t._id
                  ? "bg-white/20"
                  : "bg-white/5 hover:bg-white/10"
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
        </div>

        {/* CHAT */}
        <div className="flex-1 flex flex-col">

          <div className="flex-1 overflow-y-auto px-6 py-10">
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
              <div className="max-w-3xl mx-auto space-y-6">

                {messages.map((m, i) => (
                  <div
                    key={i}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`px-5 py-3 rounded-2xl max-w-[75%] ${
                      m.role === "user"
                        ? "bg-gradient-to-r from-blue-500 to-purple-600"
                        : "bg-white/10"
                    }`}>
                      {m.content}
                    </div>
                  </div>
                ))}

                {loading && (
                  <div className="flex justify-start">
                    <div className="px-5 py-3 rounded-2xl bg-white/10">
                      Thinking...
                    </div>
                  </div>
                )}

                <div ref={chatEndRef}></div>
              </div>
            )}
          </div>

          {/* INPUT + UPLOAD */}
          <div className="p-4">
            <div className={`max-w-3xl mx-auto flex items-center gap-2 bg-white/10 rounded-2xl p-2 ${
              !activeThread ? "opacity-50 pointer-events-none" : ""
            }`}>

              <input
                type="file"
                accept="application/pdf"
                id="pdfUpload"
                onChange={(e) => setPdfFile(e.target.files[0])}
                className="hidden"
              />

              <label
                htmlFor="pdfUpload"
                className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 cursor-pointer"
              >
                📎
              </label>

              <input
                value={input}
                disabled={!activeThread}
                placeholder={activeThread ? "Ask anything..." : "Start a new chat"}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                className="flex-1 px-4 py-2 bg-transparent outline-none"
              />

              <button
                onClick={handlePDFUpload}
                disabled={!pdfFile || uploading}
                className="px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 disabled:opacity-50"
              >
                {uploading ? "..." : "⬆️"}
              </button>

              <button
                onClick={handleSend}
                disabled={!input.trim() || loading}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600"
              >
                Send
              </button>
            </div>

            {uploadResult && (
              <div className="max-w-3xl mx-auto mt-2 text-xs text-gray-300">
                Chunks: {uploadResult.chunks} |{" "}
                <span className={uploadResult.method === "ocr" ? "text-yellow-400" : "text-green-400"}>
                  {uploadResult.method.toUpperCase()}
                </span>
              </div>
            )}
          </div>

        </div>

        {/* INSIGHTS */}
        <div className="w-80 p-4 bg-white/5 border-l border-white/10 overflow-y-auto">
          <h3 className="mb-4">Insights</h3>

          {insights.map((r, i) => {
            const score = Math.round((r.score || 0) * 100);

            return (
              <div
                key={i}
                onClick={() => openDocument(r)}
                className={`mb-3 p-3 rounded-xl cursor-pointer ${
                  i === 0 ? "bg-white/20 border border-green-400" : "bg-white/10"
                }`}
              >
                <div
                  dangerouslySetInnerHTML={{
                    __html: highlightBestSentence(
                      r.content.substring(0, 200),
                      input
                    )
                  }}
                />

                <div className="text-xs text-gray-400">
                  {r.source} • Pages {Array.isArray(r.page) ? r.page.join(", ") : r.page}
                </div>

                <div className={`text-xs ${getColor(score)}`}>
                  Relevance: {score}%
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