import {NextFunction, Request, Response} from 'express';
import logging from '../../Utils/logging';
import bcryptjs from 'bcryptjs';
import mongoose from 'mongoose';
import User from '../../Models/user';
import signJWT from '../../Utils/signJWT';
import sendEmail from '../../Utils/Email/sendEmail';
import Token from '../../Models/token';
import crypto from 'crypto';
import config from '../../Config/config';
import {StatusCodes} from 'http-status-codes';

const NAMESPACE = 'User';

const validateToken = (req: Request, res: Response, next: NextFunction) => {
  logging.info(NAMESPACE, 'Token validated, user authorized');

  return res.status(StatusCodes.OK).json({
    message: 'Authorized',
  });
};

const register = (req: Request, res: Response, next: NextFunction) => {
  const {username, email, password} = req.body;

  bcryptjs.hash(password, config.bcrypt.salt, (hashError, hash) => {
    if (hashError) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: hashError.message,
        error: hashError,
      });
    }

    const _user = new User({
      _id: new mongoose.Types.ObjectId(),
      username,
      email,
      password: hash,
    });

    return _user
        .save()
        .then((user) => {
          sendEmail(
              email,
              'Welcome to Evernote RSS Integration',
              {username},
              './Templates/welcome.hbs',
          );
          return res.status(StatusCodes.CREATED).json({
            user,
          });
        })
        .catch((err) => {
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: err.message,
            err,
          });
        });
  });
};

const login = (req: Request, res: Response, next: NextFunction) => {
  const {username, email, password} = req.body;

  const query = username ? {username} : {email};

  if (!query) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Username or email is required',
    });
  }

  User.find(query)
      .exec()
      .then((users) => {
        if (users.length !== 1) {
          return res.status(StatusCodes.UNAUTHORIZED).json({
            message: 'Unauthorized',
          });
        }

        const [user] = users;

        bcryptjs.compare(password, user.password, (error, result) => {
          if (error) {
            logging.error(NAMESPACE, error.message, error);
            return res.status(StatusCodes.UNAUTHORIZED).json({
              message: error.message,
            });
          }

          if (result) {
            return signJWT(user, (signJWTError, token) => {
              if (signJWTError) {
                logging.error(
                    NAMESPACE,
                    'Unable to sign token: ',
                    signJWTError,
                );

                res.status(StatusCodes.UNAUTHORIZED).json({
                  message: 'Unauthorized',
                });
              }

              if (token) {
                res.status(StatusCodes.OK).json({
                  message: 'Auth successful',
                  token,
                  user: user,
                });
              }
            });
          }

          return res.status(StatusCodes.UNAUTHORIZED).json({
            message: 'Unauthorized',
          });
        });
      })
      .catch((err) => {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          message: err.message,
        });
      });
};

const resetPasswordRequest = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
  const {email} = req.body;

  const user = await User.findOne({email});

  if (!user) {
    res.status(StatusCodes.NOT_FOUND).json({
      message: 'There was an error with your request',
    });
    return;
  }
  const token = await Token.findOne({user: user._id});
  if (token) await token.deleteOne();
  const resetToken = crypto.randomBytes(32).toString('hex');
  const hash = await bcryptjs.hash(resetToken, config.bcrypt.salt);

  await new Token({
    user: user._id,
    token: hash,
    createdAt: Date.now(),
  }).save();

  const link = `http://${config.server.proxyHost}:${config.server.proxyPort}/passwordReset?token=${resetToken}&user_id=${user._id}`;
  sendEmail(
      user.email,
      'Password Reset Request',
      {username: user.username, link: link},
      './Templates/resetPasswordRequest.hbs',
  );
  res.status(StatusCodes.CREATED).json({
    message:
        `An email has been sent to your email, 
        please follow the instructions provided.`,
  });
};

const resetPassword = async (
    req: Request,
    res: Response,
    next: NextFunction) => {
  const {token, user_id: userId} = req.query;

  const {password} = req.body;

  const passwordResetToken = await Token.findOne({user: userId});
  if (!passwordResetToken) {
    res.status(StatusCodes.BAD_REQUEST).json({
      message: 'There was an error with your request',
    });
    return;
  }

  const isValid = bcryptjs.compare(token as string, passwordResetToken.token);
  if (!isValid) {
    res.status(StatusCodes.BAD_REQUEST).json({
      message: 'There was an error with your request',
    });
  }

  const hash = await bcryptjs.hash(password, config.bcrypt.salt);
  await User.updateOne(
      {_id: userId},
      {$set: {password: hash}},
      {new: true},
  );

  const user = await User.findById({_id: userId});
  await passwordResetToken.deleteOne();

  sendEmail(
      user.email,
      'Password Reset Successfully',
      {
        username: user.username,
      },
      './Templates/postResetPassword.hbs',
  );

  res.status(StatusCodes.OK).json({
    message:
            'Password Reset Successfully',
  });
};

export default {
  validateToken,
  register,
  login,
  resetPasswordRequest,
  resetPassword,
};
