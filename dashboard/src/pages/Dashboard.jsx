import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import "../App.css";

function Dashboard() {

  const [threads,setThreads] = useState([]);
  const [activeThread,setActiveThread] = useState(null);
  const [messages,setMessages] = useState([]);
  const [input,setInput] = useState("");
  const [tableData,setTableData] = useState([]);
  const [isThinking,setIsThinking] = useState(false);
  const [loadingInsights,setLoadingInsights] = useState(false);

  const chatEndRef = useRef(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({behavior:"smooth"});
  };

  useEffect(()=>{scrollToBottom()},[messages]);

  useEffect(()=>{

    const defaultThread = {
      _id: "local-thread",
      title: "Research Thread",
      messages: []
    }

    setThreads([defaultThread])
    setActiveThread(defaultThread._id)

  },[])

  const selectThread = (thread) => {
    setActiveThread(thread._id)
    setMessages(thread.messages || [])
  }

  const createThread = async () => {

    const res = await axios.post("http://localhost:8000/threads")

    const newThread = {
      _id: res.data.thread_id,
      title: "New Chat",
      messages: []
    }

    setThreads([newThread,...threads])
    setActiveThread(newThread._id)
    setMessages([])

  }

  const openDocument = (doc) => {

    const match = doc.source.match(/doc\d+/)
    if(!match) return

    const docId = match[0]

    const pdfMap = {
      doc1:"doc1_cooling_sspa.pdf",
      doc2:"doc2_weapon_params.pdf",
      doc3:"doc3_rf_fingerprinting.pdf",
      doc4:"doc4_ugv_navigation.pdf",
      doc5:"doc5_rf_microwave_trends.pdf",
      doc6:"doc6_digital_twin.pdf",
      doc7:"doc7_defence_ecosystem.pdf",
      doc8:"doc8_brain_computer.pdf",
      doc9:"doc9_bio_toxins.pdf",
      doc10:"doc10_aircraft_aerodynamics.pdf"
    }

    const file = pdfMap[docId]

    if(!file) return

    const url = `http://localhost:8000/docs/${file}#page=${doc.pages}`

    window.open(url,"_blank")

  }

  const handleSendMessage = async () => {

    if(!input.trim()) return

    const userMessage = {role:"user",content:input}

    const updatedMessages = [...messages,userMessage]

    setMessages(updatedMessages)
    setInput("")
    setIsThinking(true)
    setLoadingInsights(true)
    setTableData([])

    await axios.post(
      `http://localhost:8000/threads/${activeThread}/message`,
      userMessage
    )

    try{

      const searchRes = await axios.get(
        `http://localhost:8000/search?q=${input}`
      )

      setTableData(searchRes.data.results)

      const chatRes = await axios.post(
        "http://localhost:8000/chat",
        {messages:updatedMessages}
      )

      const aiMessage = {
        role:"assistant",
        content:chatRes.data.answer
      }

      const finalMessages = [...updatedMessages,aiMessage]

      setMessages(finalMessages)

      await axios.post(
        `http://localhost:8000/threads/${activeThread}/message`,
        aiMessage
      )

    }
    catch(e){

      setMessages([
        ...updatedMessages,
        {role:"assistant",content:"System error."}
      ])

    }
    finally{

      setIsThinking(false)
      setLoadingInsights(false)

    }

  }

  return (

    <div className="app">

      <header className="topbar">

        <div className="logo">
          TechArchive AI
        </div>

        <div className="subtitle">
          Defense Research Intelligence Platform
        </div>

      </header>

      <div className="layout">

        {/* THREADS */}

        <div className="sidebar">

          <button
            className="new-chat"
            onClick={createThread}
          >
            + New Chat
          </button>

          {threads.map(thread=>(
            <div
              key={thread._id}
              className={
                activeThread===thread._id
                ? "thread active"
                : "thread"
              }
              onClick={()=>selectThread(thread)}
            >
              {thread.title || "Research Thread"}
            </div>
          ))}

        </div>

        {/* CHAT */}

        <div className="chat-panel">

          <div className="chat-box">

            {messages.map((msg,i)=>(
              <div
                key={i}
                className={`message ${msg.role}`}
              >
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
                Agent reasoning...
              </div>
            )}

            <div ref={chatEndRef}></div>

          </div>

          <div className="input-area">

            <input
              value={input}
              placeholder="Ask the research agent..."
              onChange={(e)=>setInput(e.target.value)}
              onKeyDown={(e)=>{
                if(e.key==="Enter") handleSendMessage()
              }}
            />

            <button
              onClick={handleSendMessage}
            >
              Run
            </button>

          </div>

        </div>

        {/* INSIGHTS */}

        <div className="insights-panel">

          <h3>Extracted Insights</h3>

          {loadingInsights &&
            <div className="loading">
              Searching documents...
            </div>
          }

          <div className="results">

            {tableData.map((res,i)=>(
              <div
                key={i}
                className="result-card"
                onClick={()=>openDocument(res)}
              >

                <div className="hardware">
                  {res.hardware || "General"}
                </div>

                <div className="content">
                  {res.content.substring(0,140)}...
                </div>

                <div className="source">
                  {res.source} • Pg {res.pages}
                </div>

              </div>
            ))}

          </div>

        </div>

      </div>

    </div>

  )

}

export default Dashboard;