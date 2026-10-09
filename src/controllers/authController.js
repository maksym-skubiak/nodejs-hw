import bcrypt from 'bcrypt';
import createHttpError from 'http-errors';
import { isValidObjectId } from 'mongoose';

import { Session } from '../models/session.js';
import { User } from '../models/user.js';
import { createSession, setSessionCookies } from '../services/auth.js';

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
