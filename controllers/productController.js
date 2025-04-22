import pool from '../config/db.config.js';
import { PrismaClient } from '@prisma/client';
import xlsx from 'xlsx';
import fs from 'fs';

const prisma = new PrismaClient();

// Get all users
async function getProducts(req, res) {
  try {
    const products = await prisma.products.findMany({
      include: {
        category: {
          select: {
            name: true,
          },
        },
        images: true,
      },
    });
    res.json(products);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getOneProduct(req, res) {
  try {
    const { id } = req.params;
    const product = await prisma.products.findUnique({
      where: { id: parseInt(id) },
      include: {
        images: true,
      },
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function createProduct(req, res) {
  try {
    const { name, price, stock, description, slug, category } = req.body;
    const product = await prisma.products.create({
      data: { name, price, stock, description, slug, category },
    });

    res.status(201).json(product);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function updateProduct(req, res) {
  try {
    const { id } = req.params;
    const { name, price, stock, description, slug, category } = req.body;

    const product = await prisma.products.update({
      where: { id: parseInt(id) },
      data: { name, price, stock, description, slug, category },
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function deleteProduct(req, res) {
  try {
    const { id } = req.params;
    await prisma.products.delete({
      where: { id: parseInt(id) },
    });
    res.json({ message: 'Product deleted successfully' });
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function getCategoryStats(req, res) {
  try {
    const result = await prisma.products.groupBy({
      by: ['category'],
      _count: true,
      _avg: { price: true },
      _min: { price: true },
      _max: { price: true },
    });

    const formattedResult = result.map((item) => ({
      category: item.category,
      count: item._count,
      average: item._avg.price,
      min: item._min.price,
      max: item._max.price,
    }));

    res.json(formattedResult);
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
}

async function buyProduct(req, res) {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    //check user
    const user = await prisma.user.findUnique({
      where: { id: parseInt(userId) },
    });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    //check product
    const product = await prisma.products.findUnique({
      where: { id: parseInt(id) },
    });
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    //check stock
    if (product.stock <= 0) {
      return res.status(400).json({ error: 'Product is out of stock' });
    }

    await prisma.products.update({
      where: { id: parseInt(id) },
      data: { stock: product.stock - 1 },
    });

    const userProduct = await prisma.usersProducts.create({
      data: { userId, productId: parseInt(id) },
    });

    res.status(201).json({ message: 'Product bought successfully' });
  } catch (err) {
    console.error('Error executing query', err.stack);
    res.status(500).json({ error: 'Internal server error' });
  }
}

export const uploadProducts = async (req, res) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Read Excel file
    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet);

    // Check if file is empty
    if (!data.length) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Excel file is empty' });
    }

    // Process products
    const products = data.map((row) => ({
      name: row.name,
      price: parseFloat(row.price),
      stock: parseInt(row.stock),
      description: row.description || null,
      categoryId: row.categoryId ? parseInt(row.categoryId) : null,
      slug: row.name ? row.name.toLowerCase().replace(/\s+/g, '-') : null,
    }));

    // Save to database
    const result = await prisma.products.createMany({
      data: products,
      skipDuplicates: true,
    });

    // Clean up file
    fs.unlinkSync(req.file.path);

    // Return success
    res.status(200).json({
      message: 'Products uploaded successfully',
      count: result.count,
    });
  } catch (error) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }

    res.status(500).json({ error: 'Error processing the Excel file' });
  }
};

// Upload product images
export const uploadProductImages = async (req, res) => {
  try {
    const { productId } = req.params;

    // Check if product exists
    const product = await prisma.products.findUnique({
      where: { id: parseInt(productId) },
    });

    if (!product) {
      // Clean up uploaded files if product doesn't exist
      if (req.files && req.files.length > 0) {
        req.files.forEach((file) => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      return res.status(404).json({ error: 'Product not found' });
    }

    // Check if files were uploaded
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    // Process uploaded files
    const imagePromises = req.files.map((file) => {
      return prisma.productImage.create({
        data: {
          url: file.path,
          productId: parseInt(productId),
        },
      });
    });

    // Save all images to database
    const images = await Promise.all(imagePromises);

    res.status(201).json({
      message: 'Product images uploaded successfully',
      count: images.length,
      images,
    });
  } catch (error) {
    console.error('Error uploading product images:', error);

    // Clean up uploaded files on error
    if (req.files && req.files.length > 0) {
      req.files.forEach((file) => {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
      });
    }

    res.status(500).json({ error: 'Error uploading product images' });
  }
};

// Delete product image
export const deleteProductImage = async (req, res) => {
  try {
    const { imageId } = req.params;

    // Find the image
    const image = await prisma.productImage.findUnique({
      where: { id: parseInt(imageId) },
    });

    if (!image) {
      return res.status(404).json({ error: 'Image not found' });
    }

    // Delete the file from the filesystem
    if (fs.existsSync(image.url)) {
      fs.unlinkSync(image.url);
    }

    // Delete the image record from the database
    await prisma.productImage.delete({
      where: { id: parseInt(imageId) },
    });

    res.json({ message: 'Image deleted successfully' });
  } catch (error) {
    console.error('Error deleting product image:', error);
    res.status(500).json({ error: 'Error deleting product image' });
  }
};

export {
  getProducts,
  getOneProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategoryStats,
  buyProduct,
};
