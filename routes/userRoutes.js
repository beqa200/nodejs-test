import express from 'express';
const router = express.Router();
import {
  createUser,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  signup,
  signin,
  forgotPassword,
  resetPassword,
  updateProfilePicture,
} from '../controllers/userController.js';
import upload from '../middleware/uploadMiddleware.js';
import { auth } from '../middleware/auth.js';

router.post('/', createUser);
router.get('/', getUsers);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);
router.post('/signup', signup);
router.post('/signin', signin);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.post('/profile-picture', auth, upload.single('profilePicture'), updateProfilePicture);

export default router;
