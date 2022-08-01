const SERVER_PORT: number = Number(process.env.PORT) || 3000;
const PROXY_PORT: number = Number(process.env.PROXY_PORT) || 3000;
const PROXY_HOST: string = process.env.PROXY_HOST || 'localhost';
const SERVER_HOSTNAME: string = process.env.HOST || 'localhost';
const SERVER_TOKEN_EXPIRETIME: number =
    Number(process.env.TOKEN_EXPIRETIME) || 3600;
const SERVER_TOKEN_ISSUER: string = process.env.TOKEN_ISSUER || 'isvaku';
const SERVER_TOKEN_SECRET: string =
    process.env.TOKEN_SECRET || 'supersecretsecret';

const EVERNOTE_SANDBOX: boolean = process.env.SANDBOX === 'true';
const EVERNOTE_CHINA: boolean = process.env.CHINA === 'true';
const EVERNOTE_API_CONSUMER_KEY: string = process.env.API_CONSUMER_KEY || '';
const EVERNOTE_API_CONSUMER_SECRET: string =
    process.env.API_CONSUMER_SECRET || '';

const MONGODB_PORT: number = Number(process.env.MONGODB_PORT) || 27017;
const MONGODB_USERNAME: string = process.env.MONGODB_USERNAME || 'flaskuser';
const MONGODB_PASSWORD: string = process.env.MONGODB_PASSWORD || 'password';
const MONGODB_HOSTNAME: string = process.env.MONGODB_HOSTNAME || 'localhost';
const MONGODB_DATABASE: string = process.env.MONGODB_DATABASE || 'flaskdb';

const NODEMAILER_HOST: string =
    process.env.NODEMAILER_HOST || 'smtp.example.com';
const NODEMAILER_USERNAME: string =
    process.env.NODEMAILER_USERNAME || 'user@example.com';
const NODEMAILER_PASSWORD: string =
    process.env.NODEMAILER_PASSWORD || 'examplepassword';
const NODEMAILER_PORT: number = Number(process.env.NODEMAILER_PORT) || 587;

const BCRYPT_OPTIONS = {
  salt: Number(process.env.BCRYPT_SALT) || 10,
};

const MONGODB_OPTIONS = {
  useUnifiedTopology: true,
  useNewUrlParser: true,
  socketTimeoutMS: 30000,
  keepAlive: true,
  autoIndex: false,
  retryWrites: true,
};

const SERVER = {
  port: SERVER_PORT,
  proxyPort: PROXY_PORT,
  proxyHost: PROXY_HOST,
  hostname: SERVER_HOSTNAME,
  token: {
    expireTime: SERVER_TOKEN_EXPIRETIME,
    issuer: SERVER_TOKEN_ISSUER,
    secret: SERVER_TOKEN_SECRET,
  },
};

const EVERNOTE = {
  sandbox: EVERNOTE_SANDBOX,
  china: EVERNOTE_CHINA,
  consumer_key: EVERNOTE_API_CONSUMER_KEY,
  consumer_secret: EVERNOTE_API_CONSUMER_SECRET,
};

const MONGO = {
  uri: `mongodb://${MONGODB_USERNAME}:${MONGODB_PASSWORD}@${MONGODB_HOSTNAME}:${MONGODB_PORT}/${MONGODB_DATABASE}`,
  port: MONGODB_PORT,
  username: MONGODB_USERNAME,
  password: MONGODB_PASSWORD,
  hostname: MONGODB_HOSTNAME,
  database: MONGODB_DATABASE,
  options: MONGODB_OPTIONS,
};

const NODEMAILER = {
  host: NODEMAILER_HOST,
  port: NODEMAILER_PORT,
  auth: {
    user: NODEMAILER_USERNAME,
    pass: NODEMAILER_PASSWORD,
  },
};

const config = {
  server: SERVER,
  evernote: EVERNOTE,
  mongo: MONGO,
  nodemailer: NODEMAILER,
  bcrypt: BCRYPT_OPTIONS,
};

export default config;
