const express = require('express');
const Post = require('../models/post');
const auth = require('../middleware/auth');

const router = express.Router();

// Create a post
router.post('/', auth, async (req, res) => {
  try {
    const post = new Post({ content: req.body.content, createdBy: req.user._id });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Get all posts
router.get('/', async (req, res) => {
  try {
    const posts = await Post.find().populate('createdBy', 'username').sort({ createdAt: -1 });;
    
    res.json(posts);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update a post
router.put('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    if (req.user.role !== 'admin' && post.createdBy.toString() !== req.user._id) {
      return res.status(403).json({ message: 'Access denied' });
    }

    post.content = req.body.content;
    await post.save();
    res.json(post);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
router.delete('/:id',auth, async (req, res) => {
  try {
    const postId = req.params.id;

    // Find and delete the post
    const deletedPost = await Post.findByIdAndDelete(postId);

    if (!deletedPost) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});
module.exports = router;
