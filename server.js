const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();

// This tells your server to accept JSON data (crucial for receiving odds!)
app.use(express.json()); 

// 1. Connect to MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB successfully!"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// 2. Define your Database Schema (How the odds are saved)
const MatchSchema = new mongoose.Schema({
  matchId: { type: String, required: true, unique: true },
  homeTeam: String,
  awayTeam: String,
  matchDate: Date,
  odds: Object, // Stores the complex JSON odds block
  lastUpdated: { type: Date, default: Date.now }
});

const Match = mongoose.model('Match', MatchSchema);

// 3. THE SECRET DOOR (Where your Demo Sites will send data)
app.post('/api/secret-update', async (req, res) => {
  try {
    // A. Check the Secret Password
    const providedPassword = req.headers['x-secret-password'];
    
    if (providedPassword !== process.env.SECRET_PASSWORD) {
      console.log("🚨 Unauthorized access attempt!");
      return res.status(401).json({ error: "Access Denied. Wrong Password." });
    }

    // B. Read the data sent by the Demo Site
    const gamesData = req.body.games; 

    if (!gamesData || !Array.isArray(gamesData)) {
      return res.status(400).json({ error: "Invalid data format sent." });
    }

    // C. Save the data to MongoDB
    for (let game of gamesData) {
      await Match.findOneAndUpdate(
        { matchId: game.fixture.id }, // Look for this specific match
        {
          homeTeam: game.fixture.teams.home.name,
          awayTeam: game.fixture.teams.away.name,
          matchDate: game.fixture.date,
          odds: game.bookmakers, // Save all the odds (1x2, over/under, etc.)
          lastUpdated: new Date()
        },
        { upsert: true, new: true } // If the match doesn't exist, create it. If it does, update the odds.
      );
    }

    console.log(`✅ Successfully updated ${gamesData.length} matches!`);
    res.status(200).json({ message: "Data received and saved securely." });

  } catch (error) {
    console.error("Server error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 4. Start the Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Main App Server is running on port ${PORT}`);
});
