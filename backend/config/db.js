const mongoose = require ('mongoose');

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);

        console.log ("mongodb atlas connected");

        // Convert old role names (investigator, dpo, reporter, tipster)
        try {
            await require("../utils/migrateRoles").migrateRoles();
            // existing cases (before verification) -> verified once
            await require("../utils/migrateCases").migrateCases();
        } catch (err) {
            console.error("Role migration failed:", err.message);
        }
    } 
    catch (error){
        console.error("MongoDB Connection Error:" , error.message)
        process.exit(1);
    }
};
  
module.exports = connectDB