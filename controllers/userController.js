import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
const prisma = new PrismaClient();

export const createUser = async (req, res) => {
  const { firstName, lastName, email } = req.body;
  const user = await prisma.user.create({
    data: { firstName, lastName, email },
  });
  res.json(user);
};

export const getUsers = async (req, res) => {
  const users = await prisma.user.findMany({
    include: { usersProducts: { include: { product: true } } },
  });
  res.json(users);
};

export const getUserById = async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
  });
  res.json(user);
};

export const updateUser = async (req, res) => {
  const { id } = req.params;
  const { firstName, lastName, email } = req.body;
  const user = await prisma.user.update({
    where: { id: parseInt(id) },
    data: { firstName, lastName, email },
  });
  res.json(user);
};

export const deleteUser = async (req, res) => {
  const { id } = req.params;
  await prisma.user.delete({
    where: { id: parseInt(id) },
  });
};

export const signup = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { firstName, lastName, email, password: hashedPassword },
  });
  res.json(user);
};

export const signin = async (req, res) => {
  const { email, password } = req.body;
  const user = await prisma.user.findUnique({ where: { email: email } });
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

  res.json({ token });
};
