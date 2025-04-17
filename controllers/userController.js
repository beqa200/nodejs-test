import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sendEmail from '../utils/emailService.js';

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

  // Add full URLs to profile pictures
  const usersWithUrls = users.map((user) => ({
    ...user,
    profilePicture: user.profilePicture
      ? `${req.protocol}://${req.get('host')}/uploads/${user.profilePicture}`
      : null,
  }));

  res.json(usersWithUrls);
};

export const getUserById = async (req, res) => {
  const { id } = req.params;
  const user = await prisma.user.findUnique({
    where: { id: parseInt(id) },
  });

  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }

  // Add full URL to profile picture
  const userWithUrl = {
    ...user,
    profilePicture: user.profilePicture
      ? `${req.protocol}://${req.get('host')}/uploads/${user.profilePicture}`
      : null,
  };

  res.json(userWithUrl);
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
  const user = await prisma.user.findUnique({ where: { email: email }, include: { roles: true } });
  if (!user) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }
  const token = jwt.sign({ id: user.id, role: user.roles.name }, process.env.JWT_SECRET, {
    expiresIn: '1h',
  });

  delete user.password;

  res.json({ message: 'User signed in successfully', token, user });
};

export const forgotPassword = async (req, res) => {
  const { email } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);
  await prisma.user.update({
    where: { id: user.id },
    data: { otpCode, otpExpiry },
  });
  //////

  try {
    const isEmailSent = await sendEmail(
      email,
      'Password Reset OTP Code',
      `
      <h1>Password Reset OTP Code</h1>
      <p>You requested a password reset. Use the following OTP code to reset your password:</p>
      <h2 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px; text-align: center;">${otpCode}</h2>
      <p>This code will expire in 10 minutes.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `,
    );
    if (isEmailSent) {
      res.json({ message: 'OTP sent to email' });
    } else {
      res.status(500).json({ message: 'Failed to send email' });
    }
  } catch (error) {
    console.error('Error sending email:', error);
    res.status(500).json({ message: 'Failed to send email' });
  }
};

export const resetPassword = async (req, res) => {
  const { email, otpCode, newPassword } = req.body;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  if (user.otpCode !== otpCode || user.otpExpiry < new Date()) {
    return res.status(400).json({ message: 'Invalid OTP code' });
  }
  const hashedPassword = await bcrypt.hash(newPassword, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: { password: hashedPassword, otpCode: null, otpExpiry: null },
  });
  res.json({ message: 'Password reset successfully' });
};

export const updateProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const userId = req.user.id; // Assuming we have the user ID from auth middleware
    const profilePicturePath = req.file.filename;

    const user = await prisma.user.update({
      where: { id: userId },
      data: { profilePicture: profilePicturePath },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        profilePicture: true,
      },
    });

    // Add the full URL to the profile picture
    const profilePictureUrl = user.profilePicture
      ? `${req.protocol}://${req.get('host')}/uploads/${user.profilePicture}`
      : null;

    res.json({
      message: 'Profile picture updated successfully',
      user: {
        ...user,
        profilePicture: profilePictureUrl,
      },
    });
  } catch (error) {
    console.error('Error updating profile picture:', error);
    res.status(500).json({ message: 'Failed to update profile picture' });
  }
};
