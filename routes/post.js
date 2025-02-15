  const express = require("express");
  const Post = require("../models/post");
  const auth = require("../middleware/auth");
  const multer = require("multer");
  const { CloudinaryStorage } = require("multer-storage-cloudinary");
  const cloudinary = require("cloudinary").v2;
  const router = express.Router();
  require("dotenv").config();

  // ✅ Cloudinary Configuration
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });

  // ✅ Multer Storage for Cloudinary
  const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
      folder: "uploads", // Cloudinary folder
      allowed_formats: ["jpg", "png", "jpeg", "webp"],
    },
  });

  const upload = multer({ storage });

  // ✅ Create a Post (Uploads Image to Cloudinary)
  router.post("/", auth, upload.single("image"), async (req, res) => {
    try {
      console.log("Creating Post - Body:", req.body, "File:", req.file);
      const { content } = req.body;
      if (!content) return res.status(400).json({ message: "Content is required" });

      const imageUrl = req.file ? req.file.path : null; // ✅ Cloudinary URL

      const post = new Post({
        content,
        imageUrl,
        createdBy: req.user._id,
      });

      await post.save();
      res.status(201).json(post);
    } catch (err) {
      console.error("Error Creating Post:", err);
      res.status(400).json({ message: err.message });
    }
  });

  // ✅ Fetch All Posts
  router.get("/", async (req, res) => {
    try {
      const posts = await Post.find()
        .populate("createdBy", "username")
        .sort({ createdAt: -1 });

      res.json(posts);
    } catch (err) {
      console.error("Error Fetching Posts:", err);
      res.status(500).json({ message: err.message });
    }
  });

  // ✅ Update a Post
  router.put("/:id", auth, upload.single("image"), async (req, res) => {
    try {
      const { content } = req.body;
      const post = await Post.findById(req.params.id);
      
      if (!post) return res.status(404).json({ message: "Post not found" });
  
      // 🔐 Ensure Only the Creator Can Edit the Post
      if (post.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }
  
      // ✅ Update Post Content (If Provided)
      if (content) post.content = content;
  
      // ✅ Replace Image (If a New One is Uploaded)
      if (req.file) {
        // 🛑 Delete Old Image from Cloudinary (if it exists)
        if (post.imagePublicId) {
          await cloudinary.uploader.destroy(post.imagePublicId);
        }
  
        // ✅ Upload New Image to Cloudinary
        const uploadResponse = await cloudinary.uploader.upload(req.file.path, {
          folder: "uploads",
        });
  
        // ✅ Update Post with New Image
        post.imageUrl = uploadResponse.secure_url;
        post.imagePublicId = uploadResponse.public_id; // Save Cloudinary public_id
      }
  
      await post.save();
      res.json({ message: "✅ Post updated successfully", post });
    } catch (error) {
      console.error("❌ Error Updating Post:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  

  // ✅ Delete a Post (Removes Image from Cloudinary)
  router.delete("/:id", auth, async (req, res) => {
    try {
      const post = await Post.findById(req.params.id);
      if (!post) return res.status(404).json({ message: "Post not found" });

      if (post.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ message: "Access denied" });
      }

      // ✅ Delete image from Cloudinary if it exists
      if (post.imageUrl) {
        const publicId = post.imageUrl.split("/").pop().split(".")[0];
        await cloudinary.uploader.destroy(`uploads/${publicId}`);
      }

      await Post.findByIdAndDelete(req.params.id);
      res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error Deleting Post:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  module.exports = router;

