import express from "express";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";
import bodyParser from "body-parser";
import cors from "cors";

dotenv.config();

// Connecting to the MongoDB Client
const url = process.env.MONGO_URI;
const client = new MongoClient(url);
await client.connect(); // Ensure await is used here if using ES6 modules

// App & Database
const dbName = process.env.DB_NAME;
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors());

app.get("/", async (req, res) => {
  const { s, e } = req.query; // extract 's' (displayName) and 'e' (email) from the query string
  const db = client.db(dbName);
  const collection = db.collection("passwords");

  // Find passwords by user displayName and email
  const findResult = await collection
    .find({
      "user.displayName": s,
      "user.email": e,
    })
    .toArray();

  res.json(findResult);
});

// Save a password
app.post("/", async (req, res) => {
  const password = req.body; // Retrieve the password object from the request body
  const db = client.db(dbName);
  const collection = db.collection("passwords");

  try {
    // Insert the password into the collection
    const insertResult = await collection.insertOne(password);
    res.send({ success: true, result: insertResult });
  } catch (error) {
    res.status(500).send({ success: false, error: "Failed to save password" });
  }
});

// Delete a password by id
app.delete("/", async (req, res) => {
  const { id, user } = req.body; // Extract id and user from the request body
  const db = client.db(dbName);
  const collection = db.collection("passwords");

  try {
    // Perform the delete operation based on id and user info
    const deleteResult = await collection.deleteOne({ id, ...user });
    if (deleteResult.deletedCount > 0) {
      res.send({ success: true, result: deleteResult });
    } else {
      res.status(404).send({ success: false, message: "Password not found" });
    }
  } catch (error) {
    res
      .status(500)
      .send({ success: false, error: "Failed to delete password" });
  }
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
