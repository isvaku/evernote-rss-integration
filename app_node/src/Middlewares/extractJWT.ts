import {NextFunction, Request, Response} from 'express';
import logging from '../Utils/logging';
import jwt from 'jsonwebtoken';
import config from '../Config/config';

const NAMESPACE = 'JWT Auth';

const extractJWT = (req: Request, res: Response, next: NextFunction) => {
  logging.info(NAMESPACE, 'Validating Token');

  const token = req.headers.authorization?.split(' ')[1];

  if (token) {
    jwt.verify(token, config.server.token.secret, (error, decoded) => {
      if (error) {
        return res.status(404).json({
          message: error.message,
          error,
        });
      } else {
        res.locals.jwt = decoded;
        next();
      }
    });
  } else {
    return res.status(401).json({
      message: 'Unauthorized',
    });
  }
};

export default extractJWT;
