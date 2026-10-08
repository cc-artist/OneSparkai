const express = require('express');
const router = express.Router();

// Auth routes
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Auth API is running'
  });
});

module.exports = router;
