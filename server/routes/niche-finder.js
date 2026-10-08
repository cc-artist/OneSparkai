const express = require('express');
const router = express.Router();
const nicheFinderController = require('../controllers/niche-finder');

/**
 * @swagger
 * /niche-finder:
 *   get:
 *     summary: Get niche finder info
 *     description: Returns information about the niche finder service
 *     tags:
 *       - Niche Finder
 *     responses:
 *       200:
 *         description: Niche finder info retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Service status message
 *                   example: Niche Finder API is running
 */
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Niche Finder API is running'
  });
});

/**
 * @swagger
 * /niche-finder:
 *   post:
 *     summary: Find niches
 *     description: Find trending niches based on keywords and parameters
 *     tags:
 *       - Niche Finder
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               keywords:
 *                 type: string
 *                 description: Keywords to search for niches
 *                 example: "fitness, health, wellness"
 *               platform:
 *                 type: string
 *                 description: Platform to analyze
 *                 example: "youtube"
 *               nicheType:
 *                 type: string
 *                 description: Type of niche to find
 *                 example: "educational"
 *               engagementLevel:
 *                 type: string
 *                 description: Desired engagement level
 *                 example: "high"
 *               competition:
 *                 type: string
 *                 description: Desired competition level
 *                 example: "low"
 *     responses:
 *       200:
 *         description: Niches found successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 niches:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:
 *                         type: string
 *                         description: Name of the niche
 *                         example: "AI Fitness Coaching"
 *                       platform:
 *                         type: string
 *                         description: Platform where the niche is trending
 *                         example: "YouTube"
 *                       engagement:
 *                         type: string
 *                         description: Engagement level of the niche
 *                         example: "High"
 *                       competition:
 *                         type: string
 *                         description: Competition level of the niche
 *                         example: "Medium"
 *                       growth:
 *                         type: string
 *                         description: Growth rate of the niche
 *                         example: "+23% this month"
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.post('/', nicheFinderController.findNiches);

module.exports = router;
