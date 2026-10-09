import createHttpError from 'http-errors';
import { isValidObjectId } from 'mongoose';

import { Session } from '../models/session.js';
import { User } from '../models/user.js';

export const authenticate = async (req, _res, next) => {
  const { sessionId, accessToken } = req.cookies;
  if (!sessionId || !accessToken) {
    throw createHttpError(401, 'Missing access token');
  }

  const session = isValidObjectId(sessionId)
    ? await Session.findOne({ _id: sessionId, accessToken })
    : null;
  if (!session) throw createHttpError(401, 'Session not found');
  if (session.accessTokenValidUntil < new Date()) {
    throw createHttpError(401, 'Access token expired');
  }

  const user = await User.findById(session.userId);
  if (!user) throw createHttpError(401);

  req.user = user;
  next();
};
