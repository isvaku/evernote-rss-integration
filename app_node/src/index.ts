import http from 'http';
import express, {Request, Response, NextFunction} from 'express';
import evernoteRoutes from './Routes/Evernote/evernote';
import mongoose from 'mongoose';
import config from './Config/config';
import logging from './Utils/logging';
import userRoutes from './Routes/User/user';
import rssRoutes from './Routes/Rss/rss';
import {StatusCodes} from 'http-status-codes';

const NAMESPACE = 'Server';

mongoose
    .connect(config.mongo.uri, config.mongo.options)
    .then((result) => {
      logging.info(NAMESPACE, 'Conected to MongoDB');
    })
    .catch((err) => {
      logging.error(NAMESPACE, err.message, err);
    });
const app = express();

app.use((req: Request, res: Response, next: NextFunction) => {
  logging.info(
      NAMESPACE,
      `METHOD: [${req.method}] - URL: [${req.url}] - IP: [${req.socket.remoteAddress}]`,
  );

  res.on('finish', () => {
    logging.info(
        NAMESPACE,
        `METHOD: [${req.method}] - URL: [${req.url}] - STATUS: [${res.statusCode}] - IP: [${req.socket.remoteAddress}]`,
    );
  });

  next();
});

app.use(express.urlencoded({extended: true}));
app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header(
      'Access-Control-Allow-Headers',
      'Origin, X-Requested-With, Content-Type, Accept, Authorization',
  );

  if (req.method == 'OPTIONS') {
    res.header(
        'Access-Control-Allow-Methods',
        'PUT, POST, PATCH, DELETE, GET',
    );
    return res.status(StatusCodes.OK).json({});
  }

  next();
});

app.use('/users', userRoutes);
app.use('/evernote', evernoteRoutes);
app.use('/rss', rssRoutes);

app.use((req: Request, res: Response, next: NextFunction) => {
  const error = new Error('Not found');

  res.status(StatusCodes.NOT_FOUND).json({
    message: error.message,
    error,
  });
});

const httpServer = http.createServer(app);

httpServer.listen(config.server.port, () =>
  logging.info(
      NAMESPACE,
      `Server is running ${config.server.hostname}:${config.server.port}`,
  ),
);

process.on('unhandledRejection', (reason, p) => {
  logging.error(
      NAMESPACE,
      `Unhandled Rejection at: Promise ${JSON.stringify(p)}`,
  );

  logging.error(NAMESPACE, `Reason: ${JSON.stringify(reason)}`);
});
