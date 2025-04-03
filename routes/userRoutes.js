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
} from '../controllers/userController.js';

router.post('/', createUser);
router.get('/', getUsers);
router.post('/signup', signup);
router.post('/signin', signin);
router.get('/:id', getUserById);
router.put('/:id', updateUser);
router.delete('/:id', deleteUser);

export default router;
