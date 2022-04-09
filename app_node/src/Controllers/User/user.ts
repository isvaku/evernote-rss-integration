import { NextFunction, Request, Response } from "express";
import logging from "../../Utils/logging";
import bcryptjs from "bcryptjs";
import mongoose from "mongoose";
import User from "../../Models/user";
import signJWT from "../../Utils/signJWT";
import sendEmail from "../../Utils/Email/sendEmail";
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

export default {
    validateToken,
    register,
    login
};
