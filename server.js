const express = require("express");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const DOWNLOAD_DIR = path.join(__dirname, "downloads");

if (!fs.existsSync(DOWNLOAD_DIR)) {
  fs.mkdirSync(DOWNLOAD_DIR);
}

app.use(express.json({ limit: "10kb" }));
app.use(express.static(path.join(__dirname, "public")));
app.use("/downloads", express.static(DOWNLOAD_DIR));

app.get("/", (req, res) => {
  res.send("Media Downloader API is running!");
});

app.post("/api/download", async (req, res) => {
  try {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        message: "Media URL দিন"
      });
    }

    const parsed = new URL(url);

    if (!["http:", "https:"].includes(parsed.protocol)) {
      return res.status(400).json({
        success: false,
        message: "Invalid URL"
      });
    }

    const response = await fetch(url);

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: "Media পাওয়া যায়নি"
      });
    }

    const contentType =
      response.headers.get("content-type") || "";

    if (
      !contentType.startsWith("video/") &&
      !contentType.startsWith("image/") &&
      !contentType.startsWith("audio/")
    ) {
      return res.status(400).json({
        success: false,
        message: "এটি সরাসরি media file নয়"
      });
    }

    const extension =
      contentType.split("/")[1]?.split(";")[0] || "bin";

    const filename =
      crypto.randomBytes(12).toString("hex") +
      "." +
      extension;

    const filePath = path.join(DOWNLOAD_DIR, filename);

    const buffer = Buffer.from(
      await response.arrayBuffer()
    );

    if (buffer.length > 100 * 1024 * 1024) {
      return res.status(413).json({
        success: false,
        message: "File size 100MB-এর বেশি"
      });
    }

    fs.writeFileSync(filePath, buffer);

    res.json({
      success: true,
      filename: filename,
      downloadUrl: `/downloads/${filename}`
    });

  } catch (error) {
    console.error(error);

    res.status(500).json({
      success: false,
      message: "Server error হয়েছে"
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
});
