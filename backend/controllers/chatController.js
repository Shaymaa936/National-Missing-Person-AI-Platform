// TraceAI AI chatbot controller — Groq API ko securely call karta hai
// (API key sirf backend/.env mein rehti hai, frontend mein kabhi nahi)

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-20b";

// TraceAI (missing persons portal) ke baare mein context — bot isay follow karega
const SYSTEM_PROMPT = `
Aap "TraceAI" website ke liye ek helpful assistant hain. TraceAI ek Pakistan-based
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
- About Us: TraceAI ke mission ke baare mein

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

// Words that are clearly Roman Urdu. English look-alikes (is, us, me, main,
// do, ya, report, please...) are left out on purpose — they made English
// messages get Roman Urdu replies.
const ROMAN_URDU = new Set(("aao ao assalam salam walaikum alaikum kaise kaisay kese kesy kesay hain hai hy hay " +
  "mujhe mujhy mujh aap ap apka apki mera meri mere hamara hamari hum kya kia kyun kyon kiun kahan kidhar " +
  "karna karni karo karein krna krni krdo kardo kar kr kro kijiye kijye dein dain batao btayo btao bataen " +
  "chahiye chahye chaiye nahi nahin ni nai haan han acha achha theek thik sirf aur yeh ye woh wo iss uss " +
  "se ko ki ka ke mein mai pe liye liay sakta sakti sakte gayi gya gaya gai hoga hogi tha thi thay " +
  "bacha bachay bacho beta beti bhai behen abbu ammi lapata gumshuda madad shukriya jee ji koi kuch " +
  "kab kaun kon kitna kitni wala wali raha rahi rahay hua hui huay").split(" "));
const ENGLISH = new Set(("the is are am was were how what where when why who which can could would should " +
  "i you my your me we our to a an and or of in on for with this that it do does did have has please " +
  "help report missing person found child case want need know tell find search hello hi thanks thank").split(" "));

function detectLanguage(text) {
  if (/[\u0600-\u06FF]/.test(text)) return "urdu";
  const words = String(text).toLowerCase().match(/[a-z']+/g) || [];
  let ur = 0, en = 0;
  for (const w of words) {
    if (ROMAN_URDU.has(w)) ur++;
    else if (ENGLISH.has(w)) en++;
  }
  // Roman Urdu only when it clearly outweighs English
  return ur >= 2 && ur > en ? "roman" : ur >= 1 && en === 0 && words.length <= 3 ? "roman" : "english";
}

const chatWithAssistant = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: "messages array required" });
    }
        const safeMessages = messages
      .slice(-10)
      .filter((m) => m && (m.role === "user" || m.role === "assistant"))
      .map((m) => ({
        role: m.role,
        content: String(m.content || "").slice(0, 1000),
      }));

    if (safeMessages.length === 0) {
      return res.status(400).json({ error: "valid messages required" });
    }

    // Language comes from the user's LATEST message (not the whole chat and
    // not the website language toggle).
    const lastUserText =
      [...safeMessages].reverse().find((m) => m.role === "user")?.content || "";
    const lang = detectLanguage(lastUserText);
    const languageHint =
      lang === "urdu"
        ? "The user's last message is in Urdu script. Reply ONLY in Urdu script."
        : lang === "roman"
        ? "The user's last message is in Roman Urdu. Reply ONLY in Roman Urdu (Urdu written in English letters)."
        : "The user's last message is in English. Reply ONLY in natural English. Do not use Roman Urdu or Urdu.";

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
          { role: "system", content: SYSTEM_PROMPT },
          ...safeMessages,
          // placed last so it wins over the Roman-Urdu system prompt
          { role: "system", content: `LANGUAGE RULE: ${languageHint}` },
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

module.exports = { chatWithAssistant, detectLanguage };