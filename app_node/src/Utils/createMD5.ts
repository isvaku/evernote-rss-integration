import crypto from 'crypto';

export default (data: crypto.BinaryLike) =>
  crypto.createHash('md5').update(data).digest('hex');
