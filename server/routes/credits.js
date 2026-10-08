const express = require('express');
const router = express.Router();

// Credits routes
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Credits API is running'
  });
});

module.exports = router;
