const express = require('express');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
app.use(express.json()); // Allows the server to read JSON data
// --- UNLOCK THE CORS DOOR FOR THE FRONTEND ---
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*"); // Allows any website to read the data
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept, x-secret-password");
  next();
});
// ----------------------------------------------
// 1. Connect to the MongoDB Vault
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('🟢 Connected to MongoDB Vault'))
  .catch(err => console.error('🔴 MongoDB connection error:', err));

// 2. The New Schema (Tailored for The Odds API)
const matchSchema = new mongoose.Schema({
  apiId: String,       // The Odds API unique game ID
  sport: String,       // e.g., "EPL"
  homeTeam: String,
  awayTeam: String,
  matchDate: Date,     // When the game starts
  oddsData: mongoose.Schema.Types.Mixed // "Mixed" is a flexible bucket to hold all the complex odds
});

const Match = mongoose.model('Match', matchSchema);

// 3. The Secret Door
app.post('/api/secret-update', async (req, res) => {
  // Check the password!
  const authHeader = req.headers['x-secret-password'];
  if (authHeader !== process.env.SECRET_PASSWORD) {
    return res.status(401).json({ error: "Intruder alert! Wrong password." });
  }

  try {
    const games = req.body.games;
    
    // Loop through the incoming games and save them
    for (let game of games) {
      await Match.findOneAndUpdate(
        { apiId: game.id }, // Search to see if we already have this game
        { 
          apiId: game.id,
          sport: game.sport_title,
          homeTeam: game.home_team,
          awayTeam: game.away_team,
          matchDate: game.commence_time,
          oddsData: game.bookmakers // All the live betting numbers!
        },
        { upsert: true, new: true } // The Magic: Update if exists, Insert if it doesn't
      );
    }

    console.log(`Successfully processed ${games.length} games!`);
    res.status(200).json({ message: "Data received and saved securely." });
    
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ error: "Failed to save data." });
  }
});

const PORT = process.env.PORT || 3000;
// 4. The Public Display Window (For your Frontend Website)
app.get('/api/odds', async (req, res) => {
  try {
    // Grab all the games from the vault and sort them by date!
    const games = await Match.find().sort({ matchDate: 1 }); 
    
    // Send them out to the browser
    res.status(200).json(games);
  } catch (error) {
    console.error("Error fetching games:", error);
    res.status(500).json({ error: "Failed to load the odds." });
  }
});
app.listen(PORT, () => {
  console.log(`Main App is listening behind the secret door on port ${PORT}`);
});
