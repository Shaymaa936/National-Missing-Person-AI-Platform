// Trace AI chatbot controller — Groq API ko securely call karta hai
// (API key sirf backend/.env mein rehti hai, frontend mein kabhi nahi)

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

// Trace (missing persons portal) ke baare mein context — bot isay follow karega
const SYSTEM_PROMPT = `
Aap "Trace" website ke liye ek helpful assistant hain. Trace ek Pakistan-based
missing persons reporting aur reunification platform hai.

Website ke sections:
- Home: Overview aur quick links
- Missing Persons: Lapata afraad ki list, har case ka detail page (FIR number, last seen location, description)
- Person Found: Mile huay afraad ki list (jinki pehchaan nahi hui)
- Report Missing: Lapata shaks ki report darj karne ka form (login required)
- Report Found: Mile huay shaks ki report darj karne ka form
- Guide: Missing person report karne ka tareeqa aur safety tips
- Dashboard: User ke apne submit kiye huay reports
- Login/Signup: Account banane/login karne ke liye
- Contact Us: Team se rabta
- About Us: Trace ke mission ke baare mein

Aapka kaam:
- Users ki madad karein site navigate karne mein
- Missing/found person report karne ka process samjhayein
- Agar koi emergency ho (kisi ko turant khatra ho), to unhein foran
  police (15) ya nazdeeki police station se rabta karne ka mashwara dein —
  chatbot emergency response nahi hai
- User ke message ki language ko automatically detect karein aur usi language/script mein jawab dein:
  1) English message ho to natural English mein jawab dein.
  2) Roman Urdu message ho (Urdu written in Latin/English letters) to Roman Urdu mein jawab dein.
  3) Urdu script message ho to Urdu script mein jawab dein.
  4) Agar message mixed ho to user ki dominant language follow karein.
  Website ka language toggle user ke message ki language ko override NAHI karta.
- Jawab chota, dosana, aur clear rakhein
- Agar koi specific case ke baare mein poochay, unhein "Missing Persons" ya
  "Person Found" page pe search karne ka mashwara dein — aapke paas live
  database access nahi hai
`;

const chatWithAssistant = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array required" });
    }

    // Language is determined from the user's actual message, not from the
    // website/navbar language. This keeps English -> English, Roman Urdu ->
    // Roman Urdu, and Urdu script -> Urdu script.
    const userText = messages
      .filter((m) => m?.role === "user")
      .map((m) => String(m.content || ""))
      .join("\n");

    const hasUrduScript = /[\u0600-\u06FF]/.test(userText);

    // Common Roman Urdu words. This is only a hint; the model makes the final
    // language decision from the actual conversation.
    const romanUrduWords = /\b(ao|aao|assalam|walaikum|kaise|kaisay|kese|kesy|ho|hain|hai|mujhe|mujhy|aap|ap|mera|meri|mere|hamara|hum|mujh|kya|kia|kyun|kyon|kahan|khana|karna|karni|karo|karein|krna|krni|krdo|do|dein|batao|btayo|btao|chahiye|chahye|nahi|nahin|haan|han|acha|achha|acha|sirf|aur|ya|yeh|ye|woh|wo|iss|is|us|se|ko|ki|ka|ke|mein|main|me|pe|par|liye|liay|sakta|sakti|sakte|gayi|gya|gaya|gai|report|kar|kro|kijiye|please|plz)\b/i;

    const languageHint = hasUrduScript
      ? "The user is writing in Urdu script. Reply in Urdu script."
      : romanUrduWords.test(userText)
        ? "The user is writing Roman Urdu. Reply in Roman Urdu."
        : "The user is writing English. Reply in English.";

    const langNote = `\n\nLANGUAGE RULE: ${languageHint} Do not switch language unless the user switches language.`;

    if (!GROQ_API_KEY) {
      return res.status(500).json({ error: "GROQ_API_KEY is not configured" });
    }

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 500,
        messages: [
          { role: "system", content: SYSTEM_PROMPT + langNote },
          ...messages,
        ],
      }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      console.error("Groq API error:", data.error || data);
      return res.status(500).json({ error: "AI service error" });
    }

    const replyText = data.choices?.[0]?.message?.content || "Maazrat, AI ne koi jawab nahi diya.";

    res.json({ reply: replyText });
  } catch (err) {
    console.error("Chat controller error:", err);
    res.status(500).json({ error: "Something went wrong" });
  }
};

module.exports = { chatWithAssistant };