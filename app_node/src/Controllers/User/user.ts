import { NextFunction, Request, Response } from "express";
import logging from "../../Utils/logging";
import bcryptjs from "bcryptjs";
import mongoose from "mongoose";
import User from "../../Models/user";
import signJWT from "../../Utils/signJWT";
import sendEmail from "../../Utils/Email/sendEmail";
import Token from "../../Models/token";
import crypto from "crypto";
import config from "../../Config/config";

const NAMESPACE = "User";

const validateToken = (req: Request, res: Response, next: NextFunction) => {
    logging.info(NAMESPACE, "Token validated, user authorized");

    return res.status(200).json({
        message: "Authorized"
    });
};

const register = (req: Request, res: Response, next: NextFunction) => {
    let { username, email, password } = req.body;

    bcryptjs.hash(password, config.bcrypt.salt, (hashError, hash) => {
        if (hashError) {
            return res.status(500).json({
                message: hashError.message,
                error: hashError
            });
        }

        const _user = new User({
            _id: new mongoose.Types.ObjectId(),
            username,
            email,
            password: hash
        });

        return _user
            .save()
            .then((user) => {
                sendEmail(
                    email,
                    "Welcome to Evernote RSS Integration",
                    { username },
                    "./Templates/welcome.hbs"
                );
                return res.status(201).json({
                    user
                });
            })
            .catch((err) => {
                return res.status(500).json({
                    message: err.message,
                    err
                });
            });
    });
};

const login = (req: Request, res: Response, next: NextFunction) => {
    const { username, email, password } = req.body;

    const query = username ? username : email;

    if (!query) {
        return res.status(500).json({
            message: "Username or email is required"
        });
    }

    User.find({ query })
        .exec()
        .then((users) => {
            if (users.length !== 1) {
                return res.status(401).json({
                    message: "Unauthorized"
                });
            }

            bcryptjs.compare(password, users[0].password, (error, result) => {
                if (error) {
                    logging.error(NAMESPACE, error.message, error);
                } else if (result) {
                    signJWT(users[0], (_error, token) => {
                        if (_error) {
                            logging.error(
                                NAMESPACE,
                                "Unable to sign token: ",
                                _error
                            );

                            return res.status(401).json({
                                message: "Unauthorized"
                            });
                        } else if (token) {
                            return res.status(200).json({
                                message: "Auth successful",
                                token,
                                user: users[0]
                            });
                        }
                    });
                }
            });
        })
        .catch((err) => {
            message: err.message, err;
        });
};

const resetPasswordRequest = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    let { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
        res.status(400).json({
            message: "There was an error with your request"
        });
        return;
    }
    let token = await Token.findOne({ user: user._id });
    if (token) await token.deleteOne();
    let resetToken = crypto.randomBytes(32).toString("hex");
    const hash = await bcryptjs.hash(resetToken, config.bcrypt.salt);

    await new Token({
        user: user._id,
        token: hash,
        createdAt: Date.now()
    }).save();

    const link = `http://${config.server.proxyHost}:${config.server.proxyPort}/passwordReset?token=${resetToken}&user_id=${user._id}`;
    sendEmail(
        user.email,
        "Password Reset Request",
        { username: user.username, link: link },
        "./Templates/resetPasswordRequest.hbs"
    );
    res.status(201).json({
        message:
            "An email has been sent to your email, please follow the instructions provided."
    });
};

const resetPassword = async (req: Request, res: Response, next: NextFunction) => {
    const token: string = req.query.token.toString();
    const user_id: string = req.query.user_id.toString();

    const { password } = req.body;

    let passwordResetToken = await Token.findOne({ user: user_id });
    if (!passwordResetToken) {
        res.status(400).json({
            message: "There was an error with your request"
        });
        return;
    }

    const isValid = bcryptjs.compare(token, passwordResetToken.token);
    if (!isValid) {
        res.status(400).json({
            message: "There was an error with your request"
        });
    }

    const hash = await bcryptjs.hash(password, config.bcrypt.salt);
    await User.updateOne(
        { _id: user_id },
        { $set: { password: hash } },
        { new: true }
    );
    
    const user = await User.findById({ _id: user_id });
    await passwordResetToken.deleteOne();

    sendEmail(
        user.email,
        "Password Reset Successfully",
        {
            username: user.username
        },
        "./Templates/postResetPassword.hbs"
    );

    res.status(200).json({
        message:
            "Password Reset Successfully"
    });
};

export default {
    validateToken,
    register,
    login,
    resetPasswordRequest,
    resetPassword
};
