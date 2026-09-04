const AdminContact = require("../models/AdminContact");

// 1. نیا میسج بنائیں (Public Form)
exports.createAdminContact = async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;
    const newContact = new AdminContact({ name, email, phone, message });
    await newContact.save();
    res.status(201).json({ success: true, data: newContact });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 2. تمام میسجز حاصل کریں (Admin)
exports.getAdminContacts = async (req, res) => {
  try {
    const contacts = await AdminContact.find().sort({ createdAt: -1 });
    res.json({ success: true, data: contacts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 3. میسج کو Read کریں (یہی وہ فنکشن ہے جو آپ کو چاہیے)
exports.markAdminContactAsRead = async (req, res) => {
  try {
    const { id } = req.params;
    // صرف status کو "read" کریں
    const updated = await AdminContact.findByIdAndUpdate(
      id,
      { status: "read" },
      { returnDocument: "after", runValidators: true }
    );
    if (!updated) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// 4. میسج ڈیلیٹ کریں
exports.deleteAdminContact = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await AdminContact.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).json({ success: false, message: "Message not found" });
    }
    res.json({ success: true, data: deleted });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
