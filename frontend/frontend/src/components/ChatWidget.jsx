import { useState, useRef, useEffect } from "react";
import { useLanguage } from "../i18n/LanguageContext";
import { API_BASE } from "../api/apiClient";
import "./ChatWidget.css";

const BACKEND_URL = import.meta.env.VITE_CHATBOT_API_URL || `${API_BASE}/api/chat`;

export default function ChatWidget() {
  const { isUrdu } = useLanguage();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  const greeting = isUrdu
    ? "السلام علیکم! میں Trace اسسٹنٹ ہوں۔ لاپتہ افراد کی رپورٹ، کیسز تلاش کرنے، یا سائٹ استعمال کرنے میں مدد چاہیے؟"
    : "Assalam-o-Alaikum! I’m the Trace Assistant. If you need to report a missing person, search for cases, or need help using the website  just ask!";

  useEffect(() => {
    if (open && messages.length === 0) {
      setMessages([{ role: "assistant", content: greeting }]);
    }
  }, [open]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const nextMessages = [...messages, { role: "user", content: text }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
          lang: "auto",
        }),
      });
      const data = await res.json();

      if (data.reply) {
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        throw new Error("no reply");
      }
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isUrdu
            ? "معذرت، سرور سے رابطہ نہیں ہو سکا۔ دوبارہ کوشش کریں۔"
            : "Maazrat, server se connect nahi ho saka. Dobara koshish karein.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") sendMessage();
  }

  return (
    <div className="chat-widget" dir={isUrdu ? "rtl" : "ltr"}>
      <button
        type="button"
        className="chat-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={isUrdu ? "چیٹ کھولیں" : "Open chat"}
      >
        {open ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="26" height="26">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <div>
              <div className="chat-panel-title">
                <span className="chat-mark">T</span>
                {isUrdu ? "Trace اسسٹنٹ" : "Trace Assistant"}
              </div>
              <div className="chat-panel-status">
                {isUrdu ? "آن لائن" : "Online"}
              </div>
            </div>
          </div>

          <div className="chat-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-bubble ${m.role === "user" ? "chat-bubble-user" : "chat-bubble-bot"}`}>
                {m.content}
              </div>
            ))}
            {loading && (
              <div className="chat-bubble chat-bubble-bot chat-bubble-typing">
                {isUrdu ? "لکھ رہا ہے..." : "Type kar raha hai..."}
              </div>
            )}
          </div>

          <div className="chat-input-row">
            <input
              type="text"
              className="chat-input"
              placeholder={isUrdu ? "اپنا سوال لکھیں..." : "Apna sawal likhein..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              type="button"
              className="chat-send-btn"
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              aria-label={isUrdu ? "بھیجیں" : "Send"}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" width="18" height="18">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}