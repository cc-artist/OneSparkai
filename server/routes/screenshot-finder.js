const express = require('express');
const router = express.Router();
const screenshotFinderController = require('../controllers/screenshot-finder');

/**
 * @swagger
 * /screenshot-finder:
 *   get:
 *     summary: Get screenshot finder info
 *     description: Returns information about the screenshot finder service
 *     tags:
 *       - Screenshot Finder
 *     responses:
 *       200:
 *         description: Screenshot finder info retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Service status message
 *                   example: Screenshot Finder API is running
 */
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Screenshot Finder API is running'
  });
});

/**
 * @swagger
 * /screenshot-finder:
 *   post:
 *     summary: Find screenshots
 *     description: Find high-quality screenshots based on keywords and parameters
 *     tags:
 *       - Screenshot Finder
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               keywords:
 *                 type: string
 *                 description: Keywords to search for screenshots
 *                 example: "fitness workout"
 *               resolution:
 *                 type: string
 *                 description: Desired resolution
 *                 example: "1080p"
 *               imageStyle:
 *                 type: string
 *                 description: Desired image style
 *                 example: "photorealistic"
 *     responses:
 *       200:
 *         description: Screenshots found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: number
 *                   example: 200
 *                 message:
 *                   type: string
 *                   example: Screenshots found successfully
 *                 data:
 *                   type: object
 *                   properties:
 *                     screenshots:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                             example: screenshot-1234567890-1
 *                           title:
 *                             type: string
 *                             example: fitness workout photorealistic screenshot 1
 *                           url:
 *                             type: string
 *                             example: https://example.com/screenshots/fitness-workout-1.jpg
 *                           resolution:
 *                             type: string
 *                             example: 1080p
 *                           style:
 *                             type: string
 *                             example: photorealistic
 *                             
 */
router.post('/', screenshotFinderController.findScreenshots);

module.exports = router;
