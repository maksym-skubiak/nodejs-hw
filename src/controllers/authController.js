import bcrypt from 'bcrypt';
import createHttpError from 'http-errors';
import jwt from 'jsonwebtoken';
import { isValidObjectId } from 'mongoose';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { Session } from '../models/session.js';
import { User } from '../models/user.js';
import { createSession, setSessionCookies } from '../services/auth.js';
import { sendEmail } from '../utils/sendMail.js';

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));
const resetPasswordTemplatePath = path.join(
  currentDirectory,
  '../templates/reset-password-email.html',
);
const resetPasswordSuccessMessage = 'Password reset email sent successfully';

export const registerUser = async (req, res) => {
  const { email, password } = req.body;
  if (await User.exists({ email })) throw createHttpError(400, 'Email in use');

  const user = await User.create({
    email,
    password: await bcrypt.hash(password, 10),
  });
  setSessionCookies(res, await createSession(user._id));
  res.status(201).json(user);
};

export const loginUser = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw createHttpError(401, 'Invalid credentials');
  }

  await Session.deleteMany({ userId: user._id });
  setSessionCookies(res, await createSession(user._id));
  res.status(200).json(user);
};

export const refreshUserSession = async (req, res) => {
  const { sessionId, refreshToken } = req.cookies;
  const session =
    sessionId && isValidObjectId(sessionId)
      ? await Session.findOne({ _id: sessionId, refreshToken })
      : null;
  if (!session) throw createHttpError(401, 'Session not found');
  if (session.refreshTokenValidUntil < new Date()) {
    await Session.deleteOne({ _id: session._id });

    const cookieOptions = { httpOnly: true, secure: true, sameSite: 'none' };
    res.clearCookie('sessionId', cookieOptions);
    res.clearCookie('accessToken', cookieOptions);
    res.clearCookie('refreshToken', cookieOptions);

    throw createHttpError(401, 'Session token expired');
  }

  await Session.deleteOne({ _id: session._id });
  setSessionCookies(res, await createSession(session.userId));
  res.status(200).json({ message: 'Session refreshed' });
};

export const logoutUser = async (req, res) => {
  const { sessionId } = req.cookies;
  if (sessionId && isValidObjectId(sessionId)) await Session.deleteOne({ _id: sessionId });

  const cookieOptions = { httpOnly: true, secure: true, sameSite: 'none' };
  res.clearCookie('sessionId', cookieOptions);
  res.clearCookie('accessToken', cookieOptions);
  res.clearCookie('refreshToken', cookieOptions);
  res.status(204).send();
};

export const requestResetEmail = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });

  if (!user) {
    return res.status(200).json({ message: resetPasswordSuccessMessage });
  }

  const token = jwt.sign(
    { sub: user._id.toString(), email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '15m' },
  );
  const resetLink = `${process.env.FRONTEND_DOMAIN}/reset-password?token=${token}`;

  try {
    await sendEmail({
      from: process.env.SMTP_FROM,
      to: user.email,
      subject: 'Reset your password',
      html: await createResetPasswordEmail(user.username, resetLink),
    });
  } catch {
    throw createHttpError(500, 'Failed to send the email, please try again later.');
  }

  return res.status(200).json({ message: resetPasswordSuccessMessage });
};

export const resetPassword = async (req, res) => {
  const { token, password } = req.body;
  let payload;

  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw createHttpError(401, 'Invalid or expired token');
  }

  const user = await User.findOne({ _id: payload.sub, email: payload.email });
  if (!user) throw createHttpError(404, 'User not found');

  user.password = await bcrypt.hash(password, 10);
  await user.save();

  return res.status(200).json({ message: 'Password reset successfully' });
};

const createResetPasswordEmail = async (username, resetLink) => {
  const handlebars = await import('handlebars');
  const template = await readFile(resetPasswordTemplatePath, 'utf-8');
  return handlebars.default.compile(template)({ username, resetLink });
};
