import express from "express";
import dotenv from "dotenv";
import { MongoClient, ObjectId } from "mongodb";
import bodyParser from "body-parser";
import cors from "cors";
import crypto from "crypto";

dotenv.config();
const algorithm = process.env.ALGORITHM;
const key = process.env.ENCRYPTION_KEY; // Must be 32 bytes

// Connecting to the MongoDB Client
const url = process.env.MONGO_URI;
const client = new MongoClient(url);
await client.connect(); // Ensure await is used here if using ES6 modules
const db = client.db(process.env.DB_NAME);
const collection = db.collection(process.env.COLLECTION_NAME);

// App
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

const allowedOrigins = [
  process.env.ALLOWEDORIGIN2, // Local development
  process.env.ALLOWEDORIGIN, // Production
];

// Function to encrypt the text (password)
export const encrypt = (text) => {
  const iv = crypto.randomBytes(16); // Generate a random initialization vector
  const cipher = crypto.createCipheriv(algorithm, Buffer.from(key), iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  // Return the IV and encrypted text
  return `${iv.toString("hex")}:${encrypted}`;
};

// Function to decrypt the encrypted text (password)
export const decrypt = (encryptedText) => {
  const [ivHex, encrypted] = encryptedText.split(":");
  const iv = Buffer.from(ivHex, "hex");
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key), iv);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
};

app.use(
  cors({
    origin: function (origin, callback) {
      if (allowedOrigins.indexOf(origin) !== -1 || !origin) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.get("/", async (req, res) => {
  const { s, e } = req.query; // Extract 's' (displayName) and 'e' (email) from the query parameters
  try {
    // Find passwords by user displayName and email
    const findResult = await collection
      .find({
        "user.displayName": s,
        "user.email": e,
      })
      .toArray();

    // Decrypt each password before sending
    findResult.forEach((doc) => {
      doc.form.password = decrypt(doc.form.password);
    });

    // Return the results as JSON
    res.json(findResult);
  } catch (error) {
    res
      .status(500)
      .json({ error: "An error occurred while fetching passwords." });
  }
});

// Check if a password entry exists
app.get("/check", async (req, res) => {
  try {
    const { site, username, userDisplayName, userEmail } = req.query;

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
    res.status(500).json({ error: "Server error" });
  }
});

// Save a password
app.post("/save", async (req, res) => {
  const { form, user } = req.body;

  if (!form || !user) {
    return res.status(400).json({ error: "Invalid request data" });
  }
  // Encrypt the password
  form.password = encrypt(form.password);

  try {
    // Insert the data into MongoDB
    const saveResult = await collection.insertOne({
      form,
      user,
    });

    res.json({ success: true, result: saveResult.insertedId }); // Return the inserted ID
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

// Delete a password by id

app.delete("/delete/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const deleteResult = await collection.deleteOne({ _id: new ObjectId(id) });

    if (deleteResult.deletedCount > 0) {
      res.json({ success: true, message: "Form deleted successfully" });
    } else {
      res.status(404).json({ success: false, message: "Form not found" });
    }
  } catch (error) {
    res.status(500).json({ error: "Server error" });
  }
});

app.listen(port, () => {
  console.log(`Server listening on http://localhost:${port}`);
});
