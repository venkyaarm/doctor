import { useState } from "react";
import { GoogleGenerativeAI } from "@google/generative-ai";
import jsPDF from "jspdf";
import "./AskDoctor.css";

export default function AskDoctor() {
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const handleAsk = async () => {
    if (!question.trim()) return;
    setLoading(true);
    setAnswer("");

    try {
      const genAI = new GoogleGenerativeAI("AIzaSyDsDZJmml18dqhEwVDPSoZdhesZStaBDJ0");
      const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
      const result = await model.generateContent(question);
      const responseText = result.response.text();

      setAnswer(responseText);
      setHistory((prev) => [...prev, { q: question, a: responseText }]);
    } catch (err) {
      setAnswer("❌ Something went wrong. Please try again.");
    } finally {
      setLoading(false);
      setQuestion("");
    }
  };

  const exportTxt = () => {
    const textData = history.map(h => `Q: ${h.q}\nA: ${h.a}`).join("\n\n");
    const blob = new Blob([textData], { type: "text/plain" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "doctor_chat.txt";
    link.click();
  };

  const exportPDF = () => {
    const pdf = new jsPDF();
    pdf.setFont("helvetica");
    pdf.setFontSize(12);
    let y = 20;
    history.forEach(h => {
      pdf.text(`Q: ${h.q}`, 10, y);
      y += 8;
      pdf.text(`A: ${h.a}`, 10, y);
      y += 12;
      if (y > 270) {
        pdf.addPage();
        y = 20;
      }
    });
    pdf.save("doctor_chat.pdf");
  };

  const copyToClipboard = () => {
    const textData = history.map(h => `Q: ${h.q}\nA: ${h.a}`).join("\n\n");
    navigator.clipboard.writeText(textData);
    alert("✅ Chat copied to clipboard!");
  };

  return (
    <div className="ask-doctor-container">
      <div className="chat-wrapper">
        <h2 className="title">🩺 Ask Doctor</h2>

        <div className="chat-box">
          {history.map((item, index) => (
            <div key={index} className="chat-entry">
              <div className="chat-question">👤 {item.q}</div>
              <div className="chat-answer">🤖 {item.a}</div>
            </div>
          ))}
          {loading && <p className="loading">⏳ Getting your answer...</p>}
        </div>

        <div className="input-box">
          <input
            type="text"
            value={question}
            placeholder="Type your question here..."
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAsk()}
          />
          <button onClick={handleAsk} disabled={loading}>
            Ask
          </button>
        </div>

        {history.length > 0 && (
          <div className="export-buttons">
            <button onClick={exportTxt}>📄 Export TXT</button>
            <button onClick={exportPDF}>📄 Export PDF</button>
            <button onClick={copyToClipboard}>📋 Copy</button>
          </div>
        )}
      </div>
    </div>
  );
}
