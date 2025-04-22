import express from 'express';
import { upload, productImageUpload } from '../middleware/uploadMiddleware.js';
const router = express.Router();
import {
  getProducts,
  getOneProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategoryStats,
  buyProduct,
  uploadProducts,
  uploadProductImages,
  deleteProductImage,
} from '../controllers/productController.js';
import { auth, isAdmin } from '../middleware/auth.js';
// User routes
router.get('/', getProducts);
router.get('/category-stats', getCategoryStats);
router.post('/upload-products', upload.single('file'), uploadProducts);
router.get('/:id', getOneProduct);
router.post('/', createProduct);
router.put('/:id', updateProduct);
router.delete('/:id', auth, isAdmin, deleteProduct);
router.post('/buyProduct/:id', auth, buyProduct);

// Product image routes
router.post('/:productId/images', auth, productImageUpload.array('images', 10), uploadProductImages);
router.delete('/images/:imageId', auth, isAdmin, deleteProductImage);

export default router;
