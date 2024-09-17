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

app.use(
  cors({
    origin: "http://localhost:5173",
  })
);
app.use(
  cors({
    origin: "https://password-manager-eseh.onrender.com",
  })
);

app.get("/", async (req, res) => {
  try {
    const { s, e } = req.query; // Extract 's' (displayName) and 'e' (email) from the query parameters
    const db = client.db(dbName);
    const collection = db.collection("passwords");

    // Find passwords by user displayName and email
    const findResult = await collection
      .find({
        "user.displayName": s,
        "user.email": e,
      })
      .toArray();

    // Return the results as JSON
    res.json(findResult);
  } catch (error) {
    console.error("Error fetching passwords:", error);
    res
      .status(500)
      .json({ error: "An error occurred while fetching passwords." });
  }
});

// Assuming you're using MongoDB with Express

app.get("/check", async (req, res) => {
  try {
    const { site, username, userDisplayName, userEmail } = req.query;

    const db = client.db(dbName);
    const collection = db.collection("passwords");

    const findResult = await collection.findOne({
      "form.site": site,
      "form.username": username,
      "user.displayName": userDisplayName,
      "user.email": userEmail,
    });

    if (findResult) {
      res.json({
        exists: true,
        id: findResult._id,
      });
    } else {
      res.json({ exists: false });
    }
  } catch (error) {
    console.error("Error in /check route:", error);
    res.status(500).json({ error: "Server error" });
  }
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
app.post("/save", async (req, res) => {
  try {
    const { form, user } = req.body;

    const db = client.db(dbName);
    const collection = db.collection("passwords");

    const saveResult = await collection.insertOne({
      form,
      user,
    });

    res.json(saveResult.ops[0]); // Return the saved password object
  } catch (error) {
    console.error("Error in /save route:", error);
    res.status(500).json({ error: "Server error" });
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

app.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const db = client.db(dbName);
    const collection = db.collection("passwords");

    const deleteResult = await collection.deleteOne({ _id: new ObjectId(id) });

    if (deleteResult.deletedCount > 0) {
      res.json({ success: true, message: "Form deleted successfully" });
    } else {
      res.status(404).json({ success: false, message: "Form not found" });
    }
  } catch (error) {
    console.error("Error in /delete route:", error);
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
