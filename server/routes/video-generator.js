const express = require('express');
const router = express.Router();
const videoGeneratorController = require('../controllers/video-generator');

/**
 * @swagger
 * /video-generator/history:
 *   get:
 *     summary: Get video generation history
 *     description: Get the history of video generation tasks for the current user
 *     tags:
 *       - Video Generator
 *     responses:
 *       200:
 *         description: Video generation history retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   taskId:
 *                     type: string
 *                     description: ID of the generation task
 *                   videoTitle:
 *                     type: string
 *                     description: Title of the video
 *                   status:
 *                     type: string
 *                     description: Status of the task
 *                   createdAt:
 *                     type: string
 *                     description: Date and time when the task was created
 *                   videoUrl:
 *                     type: string
 *                     description: URL of the generated video
 *       500:
 *         description: Internal server error
 */
router.get('/history', videoGeneratorController.getVideoHistory);

/**
 * @swagger
 * /video-generator:
 *   get:
 *     summary: Get video generator info
 *     description: Returns information about the video generator service
 *     tags:
 *       - Video Generator
 *     responses:
 *       200:
 *         description: Video generator info retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   description: Service status message
 *                   example: Video Generator API is running
 */
router.get('/', (req, res) => {
  res.status(200).json({
    message: 'Video Generator API is running'
  });
});

/**
 * @swagger
 * /video-generator:
 *   post:
 *     summary: Generate a video
 *     description: Generate a video based on the provided parameters
 *     tags:
 *       - Video Generator
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               videoModel:
 *                 type: string
 *                 description: The video generation model to use
 *                 example: veo
 *               videoTitle:
 *                 type: string
 *                 description: Title of the video
 *                 example: "How to Grow Your YouTube Channel"
 *               videoDescription:
 *                 type: string
 *                 description: Description of the video content
 *                 example: "Learn the best strategies to grow your YouTube channel in 2026"
 *               videoStyle:
 *                 type: string
 *                 description: Style of the video
 *                 example: realistic
 *               resolution:
 *                 type: string
 *                 description: Resolution of the video
 *                 example: 1080p
 *               voiceOver:
 *                 type: string
 *                 description: Voice over option
 *                 example: stealth
 *               voiceScript:
 *                 type: string
 *                 description: Script for the voice over
 *                 example: "Welcome to our channel..."
 *     responses:
 *       200:
 *         description: Video generation started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 taskId:
 *                   type: string
 *                   description: ID of the generation task
 *                 status:
 *                   type: string
 *                   description: Status of the task
 *                   example: pending
 *                 message:
 *                   type: string
 *                   description: Success message
 *                   example: Video generation started
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Internal server error
 */
router.post('/', videoGeneratorController.generateVideo);

/**
 * @swagger
 * /video-generator/{taskId}:
 *   get:
 *     summary: Get video generation status
 *     description: Get the status of a video generation task
 *     tags:
 *       - Video Generator
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         description: ID of the generation task
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 taskId:
 *                   type: string
 *                   description: ID of the generation task
 *                 status:
 *                   type: string
 *                   description: Status of the task
 *                   example: completed
 *                 videoUrl:
 *                   type: string
 *                   description: URL of the generated video
 *                   example: https://example.com/videos/123.mp4
 *                 message:
 *                   type: string
 *                   description: Status message
 *                   example: Video generation completed successfully
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */
router.get('/:taskId', videoGeneratorController.getVideoStatus);

/**
 * @swagger
 * /video-generator/details/{taskId}:
 *   get:
 *     summary: Get detailed task information
 *     description: Get detailed information about a video generation task
 *     tags:
 *       - Video Generator
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         description: ID of the generation task
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Task details retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 task: 
 *                   type: object
 *                   properties:
 *                     taskId:
 *                       type: string
 *                       description: ID of the generation task
 *                     status:
 *                       type: string
 *                       description: Status of the task
 *                     videoModel:
 *                       type: string
 *                       description: The video generation model used
 *                     videoTitle:
 *                       type: string
 *                       description: Title of the video
 *                     videoDescription:
 *                       type: string
 *                       description: Description of the video content
 *                     videoStyle:
 *                       type: string
 *                       description: Style of the video
 *                     resolution:
 *                       type: string
 *                       description: Resolution of the video
 *                     voiceOver:
 *                       type: string
 *                       description: Voice over option used
 *                     voiceScript:
 *                       type: string
 *                       description: Script for the voice over
 *                     videoUrl:
 *                       type: string
 *                       description: URL of the generated video
 *                     message:
 *                       type: string
 *                       description: Status message
 *                     progress:
 *                       type: integer
 *                       description: Progress percentage of the task
 *                     estimatedTime:
 *                       type: string
 *                       description: Estimated time remaining for the task
 *                     serviceTaskId:
 *                       type: string
 *                       description: Task ID from the external service
 *                     serviceRequestId:
 *                       type: string
 *                       description: Request ID used for external service calls
 *                     service:
 *                       type: string
 *                       description: Service used for video generation
 *                     createdAt:
 *                       type: string
 *                       description: Date and time when the task was created
 *                     updatedAt:
 *                       type: string
 *                       description: Date and time when the task was last updated
 *                     completedAt:
 *                       type: string
 *                       description: Date and time when the task was completed
 *                     error:
 *                       type: string
 *                       description: Error message if the task failed
 *                 requestId:
 *                   type: string
 *                   description: Request ID for tracing
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */
router.get('/details/:taskId', videoGeneratorController.getTaskDetails);

/**
 * @swagger
 * /video-generator/{taskId}/preview:
 *   get:
 *     summary: Preview generated video
 *     description: Preview the generated video in a web browser
 *     tags:
 *       - Video Generator
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         description: ID of the generation task
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Video preview page
 *         content:
 *           text/html: 
 *             schema:
 *               type: string
 *       404:
 *         description: Task not found
 *       500:
 *         description: Internal server error
 */
router.get('/:taskId/preview', (req, res) => {
  const { taskId } = req.params;
  
  // In a real implementation, we would retrieve the actual video file
  // For now, we'll return a simple HTML page with a video tag
  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Video Preview - ${taskId}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          margin: 0;
          background-color: #f0f0f0;
        }
        .video-container {
          background-color: white;
          padding: 20px;
          border-radius: 8px;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        video {
          max-width: 100%;
          height: auto;
          border-radius: 4px;
        }
        .controls {
          margin-top: 20px;
          display: flex;
          gap: 10px;
          justify-content: center;
        }
        .btn {
          padding: 10px 20px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
        }
        .btn-primary {
          background-color: #3498db;
          color: white;
        }
        .btn-secondary {
          background-color: #95a5a6;
          color: white;
        }
      </style>
    </head>
    <body>
      <div class="video-container">
        <h1>Video Preview</h1>
        <video controls autoplay>
          <source src="https://www.w3schools.com/html/mov_bbb.mp4" type="video/mp4">
          Your browser does not support the video tag.
        </video>
        <div class="controls">
          <button class="btn btn-primary" onclick="downloadVideo()">Download Video</button>
          <button class="btn btn-secondary" onclick="window.close()">Close</button>
        </div>
      </div>
      <script>
        function downloadVideo() {
          const a = document.createElement('a');
          a.href = 'https://www.w3schools.com/html/mov_bbb.mp4';
          a.download = 'video-${taskId}.mp4';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }
      </script>
    </body>
    </html>
  `;
  
  res.status(200).send(html);
});

module.exports = router;
