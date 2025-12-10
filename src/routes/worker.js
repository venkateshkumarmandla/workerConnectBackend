import express from 'express';
import { registerWorker, loginWorker, getWorkerProfile } from '../controllers/workerController.js';
import { authenticateToken, verifyWorkerOwnership } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errorHandler.js';

const router = express.Router();

// Public routes

/**
 * @swagger
 * /api/worker/register:
 *   post:
 *     summary: Register a new worker
 *     description: Creates a new worker account with personal and address information
 *     tags: [Worker]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - aadhaarNumber
 *               - firstName
 *               - lastName
 *               - gender
 *               - dateOfBirth
 *               - mobileNumber
 *               - password
 *             properties:
 *               aadhaarNumber:
 *                 type: string
 *                 pattern: '^[0-9]{12}$'
 *                 example: "123456789012"
 *               firstName:
 *                 type: string
 *                 example: "John"
 *               middleName:
 *                 type: string
 *                 example: "Kumar"
 *               lastName:
 *                 type: string
 *                 example: "Doe"
 *               gender:
 *                 type: string
 *                 enum: [male, female, other]
 *               dateOfBirth:
 *                 type: string
 *                 format: date
 *                 example: "1990-01-15"
 *               age:
 *                 type: integer
 *                 example: 34
 *               relativeName:
 *                 type: string
 *                 example: "Father Name"
 *               caste:
 *                 type: string
 *                 example: "OBC"
 *               mobileNumber:
 *                 type: string
 *                 pattern: '^[0-9]{10}$'
 *                 example: "9876543210"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "Worker@123"
 *               perStateId:
 *                 type: integer
 *                 example: 1
 *               perDistrictId:
 *                 type: integer
 *                 example: 10
 *               perCityId:
 *                 type: integer
 *                 example: 1
 *               perPincode:
 *                 type: integer
 *                 example: 500003
 *               isSameAsPerAddr:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Worker registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       400:
 *         description: Validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/register', asyncHandler(registerWorker));

/**
 * @swagger
 * /api/worker/login:
 *   post:
 *     summary: Worker login
 *     description: Authenticates a worker and returns a JWT token
 *     tags: [Worker]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - mobileNumber
 *               - password
 *             properties:
 *               mobileNumber:
 *                 type: string
 *                 pattern: '^[0-9]{10}$'
 *                 example: "9876543210"
 *               password:
 *                 type: string
 *                 format: password
 *                 example: "Worker@123"
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Invalid credentials
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/login', asyncHandler(loginWorker));

// Protected routes

/**
 * @swagger
 * /api/worker/profile/{workerId}:
 *   get:
 *     summary: Get worker profile
 *     description: Retrieves the profile information of a worker. Worker can only access their own profile.
 *     tags: [Worker]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: workerId
 *         required: true
 *         schema:
 *           type: integer
 *         description: Worker ID
 *     responses:
 *       200:
 *         description: Worker profile retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/SuccessResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       403:
 *         description: Forbidden - Can only access own profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/profile/:workerId', authenticateToken, asyncHandler(getWorkerProfile));

export default router;
