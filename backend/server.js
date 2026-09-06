require('dns').setServers(['8.8.8.8', '8.8.4.4']);

dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

require("dotenv").config();


const express = require('express');
const cors = require('cors');

const authRoutes = require("./routes/authRoutes");
const personRoutes = require("./routes/personRoutes");
const reportRoutes = require("./routes/reportRoutes");
const tipRoutes = require("./routes/tipRoutes");
const faceMatchRoutes = require("./routes/faceMatchRoutes");
const auditRoutes = require("./routes/auditRoutes");
const contactRoutes = require("./routes/contactRoutes");
const chatRoutes = require("./routes/chatRoutes"); 
const path = require("path");

const connectDB = require("./config/db")

const app = express();
connectDB();

const { protect, protectImage } = require("./middleware/authMiddleware");

// found-person and other general uploads stay public
app.use("/uploads/found", express.static(path.join(__dirname, "uploads/found")));

// missing-person photos + FIR scans are only servable to logged-in users
app.use(
  "/uploads/missing",
  protectImage,
  express.static(path.join(__dirname, "uploads/missing"))
);
app.use(
  "/uploads/fir",
  protectImage,
  express.static(path.join(__dirname, "uploads/fir"))
);

app.use(cors());
app.use(express.json({ limit: "15mb" }));
app.use ("/api/auth", authRoutes)
app.use("/api/person", personRoutes);
app.use("/api/report", reportRoutes);
app.use("/api/tips", tipRoutes);
app.use("/api/matches", faceMatchRoutes);
app.use("/api/audit", auditRoutes);
app.use("/api/contact", contactRoutes);
app.use("/api/v1/contact", contactRoutes);
app.use("/api/chat", chatRoutes); 

app.get("/",(req,res)=>
{
    res.json({
        message: "TraceAI Backend is running" 
    });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT ,() => {
    console.log(`Server running on port ${PORT}`);
});