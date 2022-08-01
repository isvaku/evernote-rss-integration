import express from 'express';
import extractJWT from '../../Middlewares/extractJWT';
import controller from '../../Controllers/Evernote/evernote';

const router = express.Router();

router.get('/oauth', extractJWT, controller.oauth);
router.get('/oauthRegister', controller.oauth_callback);
router.get('/getAllNotebooks', extractJWT, controller.index);

export default router;
