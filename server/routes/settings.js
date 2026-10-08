const express = require('express');
const router = express.Router();

// Settings routes
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Settings API is running'
  });
});

module.exports = router;
