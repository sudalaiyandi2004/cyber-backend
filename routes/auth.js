const express = require('express');
const User = require('../models/user');
const Post = require('../models/post');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  const { username,email, password, role } = req.body;

  try {
    const user = new User({ username,email, password, role });
    await user.save();
    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found' });

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ _id: user._id, role: user.role }, 'secretKey');
    res.json({ token });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});
router.get('/user/posts', auth, async (req, res) => {
  try {
    const user = req.user;
     // The user is added to the request by the auth middleware
    const posts = await Post.find({ createdBy: user._id }); // Find posts by the user
    const users = await User.find({ _id: user._id });
    console.log(users);
    // Send back user details and their posts
    res.status(200).json({
      users: {
        username: users[0].username,
        email: users[0].email,
        
      },
      posts: posts,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});
module.exports = router;
