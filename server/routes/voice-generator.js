const express = require('express');
const router = express.Router();

// Voice Generator routes
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Voice Generator API is running'
  });
});

module.exports = router;
