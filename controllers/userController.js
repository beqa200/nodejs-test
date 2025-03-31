import { PrismaClient } from '@prisma/client';

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
