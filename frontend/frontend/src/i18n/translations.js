export const T = {
  en: {
    nav: { home: "Home", missing: "Missing Persons", found: "Person Found", guide: "Guide", contact: "Contact Us", about: "About Us", login: "Login", signup: "Sign Up" },
    demo: "DEMO PROTOTYPE — all cases and reports shown are sample data for demonstration only.",
    hero: {
      eyebrow: "Community-powered case reporting", h1: "Help bring missing people home.",
      lead: "Trace connects families, communities and authorities to report, track and resolve missing-person cases faster — in English and Urdu.",
      reportMissing: "Report a Missing Person", reportFound: "Report Someone Found",
      statActive: "Active cases", statReunited: "People reunited", statTips: "Tips submitted",
      trackTitle: "Track Your Case", trackDesc: "Enter a case or report ID to check its current status.",
      trackPlaceholder: "e.g. MP-2026-0142", trackBtn: "Track", trackNotFound: "No case found with that ID. Please check and try again.",
    },
    qa: {
      title: "What would you like to do?", missingT: "Report a missing person", missingD: "File a detailed report to start a case and get a case ID.",
      foundT: "Report someone you found", foundD: "Help a person you found get back to their family.",
      browseT: "Browse missing-person cases", browseD: "Search and filter active cases in your area.",
    },
    section: {
      recentCases: "Missing-Person Cases", recentDesc: "Browse, search and filter active and recent cases. Sign in to view photos.",
      foundTitle: "People We've Found — Help Us Identify Them", foundDesc: "These individuals have been found and are currently in safe care but have not yet been identified.",
    },
    filters: {
      search: "Search", name: "Name", gender: "Gender", city: "City", status: "Status", sort: "Sort by",
      any: "Any", all: "All statuses", sortRecent: "Most recent", sortUrgent: "Most urgent", sortLongest: "Longest missing",
    },
    status: { active: "Missing", tip: "Tip received", investigating: "Investigating", found: "Found", unmatched: "Unidentified", matched: "Possible match found", pending: "Pending review" },
    card: { daysMissing: "days missing", viewCase: "View Case", sample: "SAMPLE DATA" },
    empty: "No cases match your filters. Try adjusting your search.",
    detail: {
      age: "Age", gender: "Gender", lastLocation: "Last known location", lastSeen: "Last seen", physical: "Physical description",
      marks: "Identifying marks", clothing: "Clothing description", caseNo: "Case / FIR number", status: "Current status", daysMissing: "Days missing",
      timeline: "Case Timeline", tips: "Community Tips", noTips: "No tips submitted yet. Be the first to help.", submitTip: "Submit a Tip",
      privacy: "For privacy and safety, CNIC and direct contact details are not shown publicly. Contact the investigating officer through official channels only.",
      back: "Back to Missing Persons",
    },
    tipForm: {
      title: "Submit a Tip", desc: "Share any information that could help this case. All fields except the tip itself are optional.",
      message: "Tip / message", submit: "Submit Tip", cancel: "Cancel",
      notice: "Sensitive or urgent information should be reported directly to the police or the investigating officer, not only through this form.",
    },
    reportMissing: {
      title: "Report a Missing Person", desc: "Please provide as much accurate detail as possible. This information will help the community and authorities locate the missing person.",
      s1: "Personal Information", s1h: "Basic details about the missing person.",
      fullName: "Full name", age: "Age", gender: "Gender", photo: "Photograph",
      s2: "Last Seen Details", s2h: "When and where the person was last seen.",
      lastLocation: "Last known location", lastDateTime: "Date and time last seen",
      s3: "Physical Description", s3h: "Details that help identify the person.",
      physical: "Physical description", marks: "Identifying marks", clothing: "Clothing description",
      s4: "Identification & Case Reference", s4h: "Used for verification — kept private, not shown publicly.",
      cnic: "CNIC / identification number", firNo: "FIR number", firOpt: "if applicable",
      s5: "Contact Information", s5h: "How authorities and Trace can reach you.",
      contactName: "Contact person name", phone: "Phone number", email: "Email address",
      confirm: "I confirm the information provided is accurate to the best of my knowledge.",
      submit: "Report Case",
    },
    reportFound: {
      title: "Report Someone Found", desc: "Help reunite a person you found with their family by sharing details here.",
      s1: "About the Person Found", photo: "Photograph", age: "Approximate age", gender: "Gender", category: "Category",
      catFound: "Recently lost", catLongLost: "Possibly long-lost",
      s2: "Found Location & Time", location: "Location where found", dateTime: "Date and time found",
      s3: "Description", physical: "Physical description", marks: "Available identification marks",
      s4: "Your Contact Information", contactName: "Your name", phone: "Phone number",
      confirm: "I confirm this person is currently safe and I have reported this in good faith.",
      submit: "Report Found Person",
    },
    confirmModal: {
      missingTitle: "Case Reported Successfully", missingDesc: "Your report has been received. Save this case ID to track progress.",
      foundTitle: "Found-Person Report Submitted", foundDesc: "Thank you for helping. Save this report ID to track any updates.",
      dashBtn: "Go to Dashboard", close: "Close",
    },
    guide: {
      title: "Guide", desc: "What to do when someone goes missing, or when you find someone.",
      groups: [
        { t: "If someone goes missing", img: "missing-report", items: [
          "Note the exact time and place they were last seen.",
          "Contact friends, family and nearby places they may have gone.",
          "File a police report / FIR as soon as possible — do not wait 24 hours.",
          "Collect a recent, clear photograph and physical description.",
          "Submit a report on Trace to reach the wider community.",
          "Share the case ID with trusted contacts so they can track updates.",
        ]},
        
        { t: "If you find someone", img: "found-someone", items: [
          "Ensure the person is safe and, if a child or vulnerable adult, do not leave them alone.",
          "Contact the nearest police station immediately.",
          "Take a clear photograph if appropriate and with consent.",
          "Submit a Report Someone Found form on Trace with all available details.",
          "Avoid sharing identifying details of vulnerable people publicly beyond official channels.",
        ]},
        { t: "Submitting a useful tip", img: "submit-tip", items: [
          "Be as specific as possible about date, time and exact location.",
          "Describe what you saw rather than assumptions about what happened.",
          "Include a photo or evidence only if you have consent and it is safe to do so.",
          "Provide contact details if you are willing to be reached for follow-up.",
        ]},
        
        { t: "How to track a case", img: "track-case", items: [
          "Use the case or report ID given to you at the time of filing.",
          "Enter it in the \"Track Your Case\" box on the home page.",
          "Check your dashboard if you are logged in to see all your submitted reports.",
        ]},
      ],
    },
    about: {
      title: "About Us", desc: "Trace (ٹریس) is a community assistance platform built to help families, communities and authorities work together on missing-person cases.",
      c1t: "Our Mission", c1: "Finding missing people faster through bilingual community action.",
      c2t: "How It Works", c2: "Reports get a unique ID and a privacy-safe public timeline where the community submits tips and tracks progress.",
      c3t: "Community Support", c3: "Anyone can browse cases, submit tips, or report a found person without needing an account.",
      c4t: "Privacy & Safety", c4: "Sensitive data like CNICs and contact info remain private, accessible only to verified investigators.",
    },
    contact: {
      title: "Contact Us", desc: "Have a question, feedback, or need help using the platform? Send us a message.",
      name: "Name", email: "Email", phone: "Phone number", message: "Message", submit: "Send Message",
      emergTitle: "Emergency & Official Contacts", emergNote: "For real emergencies, always contact your local police station directly.",
      police: "Police Emergency", edhi: "Edhi Foundation Helpline", citizen: "Citizens Portal",
      sent: "Message sent — we'll get back to you soon.",
    },
    auth: {
      loginTitle: "Welcome Back", loginDesc: "Sign in to view case photos, submit reports, and track your cases.", email: "Email address", password: "Password",
      loginBtn: "Login", noAccount: "Don't have an account?", signupLink: "Sign Up",
      signupTitle: "Create Account", signupDesc: "Sign up to submit reports, view case photos, and track your cases.", fullName: "Full name",
      cnic: "CNIC / identification number", phone: "Phone number",
      confirmPw: "Confirm password", signupBtn: "Sign Up", haveAccount: "Already have an account?", loginLink: "Login",
    },
    dashboard: {
      title: "My Dashboard", desc: "Track and manage your reports", logout: "Logout",
      empty: "You haven't submitted any reports yet.", reportMissingBtn: "Report a Missing Person",
      myMissing: "My Missing-Person Reports", myFound: "My Found-Person Reports",
      noMissingYet: "No missing-person reports submitted yet.", noFoundYet: "No found-person reports submitted yet.",
    },
    footer: {
      tagline: "A community assistance platform for missing-person reporting and tracking. Prototype for demonstration purposes.",
      quick: "Quick Links", resources: "Resources", legal: "Legal", privacy: "Privacy Notice", terms: "Terms of Use", disclaimer: "Demo Disclaimer",
      rights: "2026 TraceAI Developed by Trace Team. All rights reserved.",
    },
    common: { male: "Male", female: "Female", other: "Other", years: "yrs" },
    found: {
      recentlyFound: "Recently Found", longLost: "Long-Lost Persons", all: "All",
      unidentified: "Unidentified Person", currentAge: "Current estimated age", ageWhenLost: "Estimated age when lost",
      foundLocation: "Found location", foundDate: "Found date", shelterLocation: "Current shelter / care location",
      privacy: "Full name and exact shelter address are withheld publicly for this person's safety. Contact Trace directly if you have identifying information.",
      rememberTitle: "What They Remember", rememberDesc: "Fragments shared by the individual, recorded by caseworkers to help a family recognise them — not confirmed facts.",
      fatherName: "Father's name", motherName: "Mother's name", siblings: "Siblings", hometown: "Hometown / native area", otherNotes: "Other memories / clues",
      recognizeTitle: "Recognise this person?", recognizeDesc: "If any detail above matches someone your family has been searching for, please contact our team right away with the case ID.",
      recognizeCta: "Contact Trace →", back: "Back to Person Found",
    },
  },
  ur: {
    nav: { home: "ہوم", missing: "لاپتہ افراد", found: "ملنے والا شخص", guide: "رہنمائی", contact: "رابطہ کریں", about: "ہمارے بارے میں", login: "لاگ اِن", signup: "سائن اپ" },
    demo: "ڈیمو پروٹوٹائپ — تمام کیسز اور رپورٹس صرف نمائشی مقاصد کے لیے نمونہ ڈیٹا ہیں۔",
    hero: {
      eyebrow: "کمیونٹی کی مدد سے کیس رپورٹنگ", h1: "لاپتہ افراد کو گھر واپس لانے میں مدد کریں۔",
      lead: "واپسی خاندانوں، کمیونٹی اور متعلقہ اداروں کو جوڑتا ہے تاکہ لاپتہ افراد کے کیسز کو تیزی سے رپورٹ، ٹریک اور حل کیا جا سکے — انگریزی اور اردو میں۔",
      reportMissing: "لاپتہ شخص کی رپورٹ کریں", reportFound: "ملنے والے شخص کی اطلاع دیں",
      statActive: "جاری کیسز", statReunited: "واپس ملنے والے افراد", statTips: "موصولہ اطلاعات",
      trackTitle: "اپنا کیس ٹریک کریں", trackDesc: "موجودہ صورتحال معلوم کرنے کے لیے کیس یا رپورٹ آئی ڈی درج کریں۔",
      trackPlaceholder: "مثلاً MP-2026-0142", trackBtn: "تلاش کریں", trackNotFound: "اس آئی ڈی سے کوئی کیس نہیں ملا۔ براہ کرم دوبارہ کوشش کریں۔",
    },
    qa: {
      title: "آپ کیا کرنا چاہیں گے؟", missingT: "لاپتہ شخص کی رپورٹ کریں", missingD: "کیس شروع کرنے اور آئی ڈی حاصل کرنے کے لیے تفصیلی رپورٹ درج کریں۔",
      foundT: "ملنے والے شخص کی اطلاع دیں", foundD: "ملنے والے شخص کو خاندان تک پہنچانے میں مدد کریں۔",
      browseT: "لاپتہ افراد کے کیسز دیکھیں", browseD: "اپنے علاقے کے جاری کیسز تلاش اور فلٹر کریں۔",
    },
    section: {
      recentCases: "لاپتہ افراد کے کیسز", recentDesc: "جاری اور حالیہ کیسز دیکھیں، تلاش کریں اور فلٹر کریں۔ تصاویر دیکھنے کے لیے سائن اِن کریں۔",
      foundTitle: "ملنے والے افراد — شناخت میں ہماری مدد کریں", foundDesc: "یہ افراد مل چکے ہیں اور فی الحال محفوظ نگہداشت میں ہیں لیکن ابھی تک ان کی شناخت نہیں ہو سکی۔",
    },
    filters: {
      search: "تلاش کریں", name: "نام", gender: "جنس", city: "شہر", status: "صورتحال", sort: "ترتیب دیں",
      any: "کوئی بھی", all: "تمام حالتیں", sortRecent: "تازہ ترین", sortUrgent: "انتہائی اہم", sortLongest: "طویل عرصے سے لاپتہ",
    },
    status: { active: "لاپتہ", tip: "اطلاع موصول", investigating: "تحقیقات جاری", found: "مل گیا", unmatched: "غیر شناخت شدہ", matched: "ممکنہ مماثلت ملی", pending: "زیرِ جائزہ" },
    card: { daysMissing: "دن سے لاپتہ", viewCase: "کیس دیکھیں", sample: "نمونہ ڈیٹا" },
    empty: "آپ کے فلٹرز سے کوئی کیس مماثل نہیں۔ تلاش تبدیل کر کے دیکھیں۔",
    detail: {
      age: "عمر", gender: "جنس", lastLocation: "آخری معلوم مقام", lastSeen: "آخری بار دیکھا گیا", physical: "جسمانی خصوصیات",
      marks: "شناختی نشانات", clothing: "لباس کی تفصیل", caseNo: "کیس / ایف آئی آر نمبر", status: "موجودہ صورتحال", daysMissing: "دنوں سے لاپتہ",
      timeline: "کیس ٹائم لائن", tips: "کمیونٹی اطلاعات", noTips: "ابھی تک کوئی اطلاع موصول نہیں ہوئی۔ مدد کرنے والے پہلے فرد بنیں۔", submitTip: "اطلاع درج کریں",
      privacy: "رازداری اور تحفظ کے پیش نظر، شناختی کارڈ نمبر اور براہ راست رابطہ کی تفصیلات عوامی طور پر ظاہر نہیں کی جاتیں۔ صرف سرکاری ذرائع سے تفتیشی افسر سے رابطہ کریں۔",
      back: "لاپتہ افراد کی فہرست پر واپس جائیں",
    },
    tipForm: {
      title: "اطلاع درج کریں", desc: "کوئی بھی معلومات شیئر کریں جو اس کیس میں مددگار ہو سکتی ہے۔",
      message: "اطلاع / پیغام", submit: "اطلاع بھیجیں", cancel: "منسوخ کریں",
      notice: "حساس یا فوری معلومات صرف اس فارم کے بجائے براہ راست پولیس یا تفتیشی افسر کو دی جائیں۔",
    },
    reportMissing: {
      title: "لاپتہ شخص کی رپورٹ کریں", desc: "براہ کرم زیادہ سے زیادہ درست تفصیلات فراہم کریں۔ یہ معلومات کمیونٹی اور اداروں کو لاپتہ شخص تلاش کرنے میں مدد دیں گی۔",
      s1: "ذاتی معلومات", s1h: "لاپتہ شخص کے بنیادی کوائف۔",
      fullName: "پورا نام", age: "عمر", gender: "جنس", photo: "تصویر",
      s2: "آخری بار دیکھے جانے کی تفصیلات", s2h: "شخص کہاں اور کب آخری بار دیکھا گیا۔",
      lastLocation: "آخری معلوم مقام", lastDateTime: "آخری بار دیکھے جانے کی تاریخ و وقت",
      s3: "جسمانی خصوصیات", s3h: "شناخت میں مددگار تفصیلات۔",
      physical: "جسمانی خصوصیات", marks: "شناختی نشانات", clothing: "لباس کی تفصیل",
      s4: "شناخت اور کیس حوالہ", s4h: "تصدیق کے لیے استعمال ہوگا — نجی رکھا جائے گا، عوامی طور پر ظاہر نہیں ہوگا۔",
      cnic: "شناختی کارڈ نمبر", firNo: "ایف آئی آر نمبر", firOpt: "اگر موجود ہو",
      s5: "رابطہ کی معلومات", s5h: "ادارے اور واپسی آپ سے کیسے رابطہ کر سکتے ہیں۔",
      contactName: "رابطہ کار کا نام", phone: "فون نمبر", email: "ای میل ایڈریس",
      confirm: "میں تصدیق کرتا/کرتی ہوں کہ فراہم کردہ معلومات میری معلومات کی حد تک درست ہیں۔",
      submit: "کیس رپورٹ کریں",
    },
    reportFound: {
      title: "ملنے والے شخص کی اطلاع دیں", desc: "یہاں تفصیلات شیئر کر کے آپ ملنے والے شخص کو خاندان تک پہنچانے میں مدد کر سکتے ہیں۔",
      s1: "ملنے والے شخص کے بارے میں", photo: "تصویر", age: "تخمینی عمر", gender: "جنس", category: "قسم",
      catFound: "حال ہی میں لاپتہ", catLongLost: "ممکنہ طور پر دیرینہ لاپتہ",
      s2: "ملنے کا مقام اور وقت", location: "ملنے کا مقام", dateTime: "ملنے کی تاریخ و وقت",
      s3: "تفصیل", physical: "جسمانی خصوصیات", marks: "دستیاب شناختی نشانات",
      s4: "آپ کی رابطہ کی معلومات", contactName: "آپ کا نام", phone: "فون نمبر",
      confirm: "میں تصدیق کرتا/کرتی ہوں کہ یہ شخص فی الحال محفوظ ہے اور میں نے یہ نیک نیتی سے رپورٹ کیا ہے۔",
      submit: "ملنے والے کی رپورٹ جمع کروائیں",
    },
    confirmModal: {
      missingTitle: "کیس کامیابی سے رپورٹ ہو گیا", missingDesc: "آپ کی رپورٹ موصول ہو گئی ہے۔ پیشرفت ٹریک کرنے کے لیے یہ کیس آئی ڈی محفوظ رکھیں۔",
      foundTitle: "ملنے والے شخص کی رپورٹ جمع ہو گئی", foundDesc: "مدد کرنے کا شکریہ۔ اپ ڈیٹس ٹریک کرنے کے لیے یہ رپورٹ آئی ڈی محفوظ رکھیں۔",
      dashBtn: "ڈیش بورڈ پر جائیں", close: "بند کریں",
    },
    guide: {
      title: "رہنمائی", desc: "جب کوئی شخص لاپتہ ہو جائے، یا آپ کو کوئی شخص ملے تو کیا کرنا چاہیے۔",
      groups: [
        { t: "اگر کوئی شخص لاپتہ ہو جائے", img: "missing-report", items: [
          "وہ درست وقت اور جگہ نوٹ کریں جہاں وہ آخری بار دیکھے گئے۔",
          "دوستوں، خاندان اور قریبی مقامات سے رابطہ کریں جہاں وہ جا سکتے ہیں۔",
          "جتنی جلدی ممکن ہو پولیس رپورٹ / ایف آئی آر درج کروائیں — 24 گھنٹے کا انتظار نہ کریں۔",
          "حالیہ، واضح تصویر اور جسمانی خصوصیات جمع کریں۔",
          "وسیع کمیونٹی تک رسائی کے لیے واپسی پر رپورٹ جمع کروائیں۔",
          "قابلِ اعتماد رابطوں کے ساتھ کیس آئی ڈی شیئر کریں تاکہ وہ اپ ڈیٹس دیکھ سکیں۔",
        ]},
        
        { t: "اگر آپ کو کوئی شخص ملے", img: "found-someone", items: [
          "یقینی بنائیں کہ شخص محفوظ ہے، اور اگر بچہ یا کمزور بالغ ہو تو اسے اکیلا نہ چھوڑیں۔",
          "فوری طور پر قریبی پولیس اسٹیشن سے رابطہ کریں۔",
          "اگر مناسب ہو اور رضامندی سے ہو تو واضح تصویر لیں۔",
          "واپسی پر تمام دستیاب تفصیلات کے ساتھ \"ملنے والے کی اطلاع\" فارم جمع کروائیں۔",
          "کمزور افراد کی شناختی تفصیلات عوامی طور پر شیئر کرنے سے گریز کریں۔",
        ]},
        { t: "مفید اطلاع کیسے دیں", img: "submit-tip", items: [
          "تاریخ، وقت اور درست مقام کے بارے میں جتنا ممکن ہو مخصوص رہیں۔",
          "جو دیکھا اسے بیان کریں، نہ کہ کیا ہوا اس کے قیاسات۔",
          "تصویر یا ثبوت صرف اس صورت میں شامل کریں جب رضامندی ہو اور محفوظ ہو۔",
          "اگر فالو اپ کے لیے رابطہ ممکن ہو تو تفصیلات فراہم کریں۔",
        ]},
       
        { t: "کیس کیسے ٹریک کریں", img: "track-case", items: [
          "رپورٹ درج کرواتے وقت دی گئی کیس یا رپورٹ آئی ڈی استعمال کریں۔",
          "ہوم پیج پر \"اپنا کیس ٹریک کریں\" باکس میں درج کریں۔",
          "اگر لاگ ان ہیں تو اپنی تمام جمع کردہ رپورٹس دیکھنے کے لیے ڈیش بورڈ چیک کریں۔",
        ]},
      ],
    },
    about: {
      title: "ہمارے بارے میں", desc: "ٹریس ایک کمیونٹی امدادی پلیٹ فارم ہے جو خاندانوں، کمیونٹی اور اداروں کو لاپتہ افراد کے کیسز پر مل کر کام کرنے میں مدد دینے کے لیے بنایا گیا ہے۔",

      c1t: "ہمارا مشن", c1: "باہمی تعاون اور دو لسانی رابطے کے ذریعے لاپتہ افراد کی تیزی سے تلاش",
      c2t: "یہ کیسے کام کرتا ہے", c2: "لوگ رپورٹ درج کروا کے ایک شناختی نمبر حاصل کرتے ہیں، جس کے بعد عوام محفوظ معلومات دیکھ کر سراغ فراہم کر سکتی ہے اور کیس کی پیشرفت پر نظر رکھ سکتی ہے",
      c3t: "کمیونٹی سپورٹ", c3: "اکاؤنٹ بنائے بغیر کوئی بھی شخص کیسز دیکھ سکتا ہے، سراغ فراہم کر سکتا ہے، یا کسی ملے ہوئے فرد کی اطلاع دے سکتا ہے۔",
      c4t: "رازداری اور تحفظ", c4: "شناختی کارڈ نمبر اور ذاتی رابطے جیسی حساس معلومات کبھی بھی پبلک نہیں کی جاتیں، یہ ڈیٹا صرف تصدیق شدہ تفتیش کار ہی دیکھ سکتے ہیں۔"
    },
    contact: {
      title: "رابطہ کریں", desc: "کوئی سوال، رائے، یا پلیٹ فارم استعمال کرنے میں مدد درکار ہے؟ ہمیں پیغام بھیجیں۔",
      name: "نام", email: "ای میل", phone: "فون نمبر", message: "پیغام", submit: "پیغام بھیجیں",
      emergTitle: "ہنگامی اور سرکاری رابطے", emergNote: "حقیقی ہنگامی صورتحال میں ہمیشہ براہ راست اپنے قریبی پولیس اسٹیشن سے رابطہ کریں۔",
      police: "پولیس ہنگامی نمبر", edhi: "ایدھی فاؤنڈیشن ہیلپ لائن", citizen: "سٹیزن پورٹل",
      sent: "پیغام بھیج دیا گیا — ہم جلد آپ سے رابطہ کریں گے۔",
    },
    auth: {
      loginTitle: "خوش آمدید", loginDesc: "کیس کی تصاویر دیکھنے، رپورٹس جمع کروانے اور کیسز ٹریک کرنے کے لیے سائن اِن کریں۔", email: "ای میل ایڈریس", password: "پاس ورڈ",
      loginBtn: "لاگ اِن کریں", noAccount: "اکاؤنٹ نہیں ہے؟", signupLink: "سائن اپ کریں",
      signupTitle: "اکاؤنٹ بنائیں", signupDesc: "رپورٹس جمع کروانے، تصاویر دیکھنے اور کیسز ٹریک کرنے کے لیے سائن اپ کریں۔", fullName: "پورا نام",
      cnic: "شناختی کارڈ نمبر", phone: "فون نمبر",
      confirmPw: "پاس ورڈ کی تصدیق کریں", signupBtn: "اکاؤنٹ بنائیں", haveAccount: "پہلے سے اکاؤنٹ ہے؟", loginLink: "لاگ اِن کریں",
    },
    dashboard: { title: "میرا ڈیش بورڈ", desc: "اپنی رپورٹس ٹریک اور منظم کریں", logout: "لاگ آؤٹ", empty: "آپ نے ابھی تک کوئی رپورٹ جمع نہیں کروائی۔", reportMissingBtn: "لاپتہ شخص کی رپورٹ کریں", myMissing: "میری لاپتہ افراد کی رپورٹس", myFound: "میری ملنے والے افراد کی رپورٹس", noMissingYet: "ابھی تک کوئی لاپتہ فرد کی رپورٹ جمع نہیں کروائی گئی۔", noFoundYet: "ابھی تک کوئی ملنے والے فرد کی رپورٹ جمع نہیں کروائی گئی۔" },
    footer: {
      tagline: "لاپتہ افراد کی رپورٹنگ اور ٹریکنگ کے لیے ایک کمیونٹی امدادی پلیٹ فارم۔",
      quick: "فوری روابط", resources: "وسائل", legal: "قانونی", privacy: "رازداری نوٹس", terms: "شرائطِ استعمال", disclaimer: "ڈیمو ڈس کلیمر",
      rights:" © 2026 ٹریس ٹیم کی تیار کردہ۔ جملہ حقوق محفوظ ہیں۔"
    },
    common: { male: "مرد", female: "عورت", other: "دیگر", years: "سال" },
    found: {
      recentlyFound: "حال ہی میں ملنے والے", longLost: "دیرینہ لاپتہ افراد", all: "تمام",
      unidentified: "غیر شناخت شدہ شخص", currentAge: "موجودہ تخمینی عمر", ageWhenLost: "لاپتہ ہونے کے وقت تخمینی عمر",
      foundLocation: "ملنے کا مقام", foundDate: "ملنے کی تاریخ", shelterLocation: "موجودہ پناہ گاہ / نگہداشت مقام",
      privacy: "اس شخص کی حفاظت کے لیے مکمل نام اور صحیح پناہ گاہ کا پتہ عام نہیں کیا جاتا۔",
      rememberTitle: "انہیں کیا یاد ہے", rememberDesc: "یہ فرد کی بتائی گئی تفصیلات ہیں — یہ تصدیق شدہ حقائق نہیں ہیں۔",
      fatherName: "والد کا نام", motherName: "والدہ کا نام", siblings: "بہن بھائی", hometown: "آبائی علاقہ", otherNotes: "دیگر یادیں / سراغ",
      recognizeTitle: "اس شخص کو پہچانتے ہیں؟", recognizeDesc: "اگر مذکورہ بالا کوئی تفصیل آپ کے خاندان کے کسی لاپتہ فرد سے ملتی ہے، تو براہ کرم رابطہ کریں۔",
      recognizeCta: "ٹریس سے رابطہ کریں ←", back: "ملنے والے افراد کی فہرست پر واپس جائیں",
    },
  },
};

export function translate(lang, path) {
  const parts = path.split(".");
  let cur = T[lang];
  for (const p of parts) cur = cur ? cur[p] : undefined;
  return cur !== undefined ? cur : path;
}
