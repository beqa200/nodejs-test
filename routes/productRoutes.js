import express from 'express';
const router = express.Router();
import {
  getProducts,
  getOneProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategoryStats,
  buyProduct,
} from '../controllers/productController.js';
import { auth, isAdmin } from '../middleware/auth.js';
// User routes
router.get('/', getProducts);
router.get('/category-stats', getCategoryStats);
router.get('/:id', getOneProduct);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', auth, isAdmin, deleteProduct);
router.post('/buyProduct/:id', auth, buyProduct);
export default router;
