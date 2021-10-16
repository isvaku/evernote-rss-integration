import Evernote from "evernote";
import { NextFunction, Request, Response } from "express";
import logging from "../../Utils/logging";
import config from "../../Config/config";
import User from "../../Models/user";
import "core-js/stable";
import "regenerator-runtime/runtime";

const CALLBACK_URL = `http://${config.server.proxyHost}:${config.server.proxyPort}/evernote/oauthRegister`;
const NAMESPACE = "Evernote";

export default {
    index: async (req: Request, res: Response, next: NextFunction) => {
        const user = await User.findOne({ username: res.locals.jwt.username });

        if (user.evernote.oauthToken) {
            const client = new Evernote.Client({
                token: user.evernote.oauthToken,
                sandbox: config.evernote.sandbox,
                china: config.evernote.china
            });

            client
                .getNoteStore()
                .listNotebooks()
                .then(
                    function (notebooks) {
                        return res.status(201).json({
                            message: "Successfull",
                            notebooks
                        });
                    },
                    function (error) {
                        return res.status(500).json({
                            message: "Error",
                            error
                        });
                    }
                );
        } else {
            return res.status(500).json({
                message: "No Oauthtoken"
            });
        }
    },

    oauth: (req: Request, res: Response, next: NextFunction) => {
        const client = new Evernote.Client({
            consumerKey: config.evernote.consumer_key,
            consumerSecret: config.evernote.consumer_secret,
            sandbox: config.evernote.sandbox,
            china: config.evernote.china
        });

        // TODO: Obtener el ObjectID del usuario para utilizarlo en el callback

        client.getRequestToken(
            CALLBACK_URL + `?username=${res.locals.jwt.username}`,
            async function (error, oauthToken, oauthTokenSecret, results) {
                if (error) {
                    return res.status(500).json({
                        message: "Error",
                        error
                    });
                } else {
                    const findQuery = {
                        username: res.locals.jwt.username
                    };

                    const updateQuery = {
                        evernote: {
                            sessionOauthToken: oauthToken,
                            sessionOauthTokenSecret: oauthTokenSecret,
                            oauthStatus: "created"
                        }
                    };

                    const user = await User.findOneAndUpdate(
                        findQuery,
                        updateQuery,
                        {
                            returnOriginal: false
                        }
                    );

                    return res.status(201).json({
                        message: "Successfull",
                        url: client.getAuthorizeUrl(oauthToken)
                    });
                }
            }
        );
    },

    oauth_callback: async (req: Request, res: Response, next: NextFunction) => {
        if (!req.query.username) {
            logging.error(NAMESPACE, "Username missing");
            return res.status(500).json({
                message: "Username missing"
            });
        }

        if (!req.query.oauth_verifier) {
            logging.error(
                NAMESPACE,
                "Verifier missing",
                req.query.oauth_verifier
            );
            return res.status(500).json({
                message: "Verifier missing"
            });
        }

        const user = await User.findOne({ username: req.query.username.toString() });

        logging.info(NAMESPACE, "Query", req.query.oauth_verifier);

        let client = new Evernote.Client({
            consumerKey: config.evernote.consumer_key,
            consumerSecret: config.evernote.consumer_secret,
            sandbox: config.evernote.sandbox,
            china: config.evernote.china
        });

        client.getAccessToken(
            user.evernote.sessionOauthToken,
            user.evernote.sessionOauthTokenSecret,
            req.query.oauth_verifier.toString(),
            function (
                error,
                oauthAccessToken,
                oauthAccessTokenSecret,
                results
            ) {
                if (error) {
                    const errorString = `[${
                        new Date().toISOString
                    }] ${JSON.stringify(error)}`;

                    logging.error(NAMESPACE, "Error", error);
                    user.evernote.oauthStatus = "error";
                    user.evernote.oauthError.push(errorString);

                    user.save()
                        .then((_user) => {
                            return res.status(501).json({
                                message: "Error getting Access Token",
                                error: errorString
                            });
                        })
                        .catch((err) => {
                            return res.status(500).json({
                                message: err.message,
                                err
                            });
                        });
                } else {
                    logging.info(
                        NAMESPACE,
                        "Successfully got credentials from service"
                    );

                    user.evernote.oauthToken = oauthAccessToken;
                    user.evernote.expires = results.edam_expires;
                    user.evernote.oauthStatus = "success";
                    user.evernote.sessionOauthToken = undefined;
                    user.evernote.sessionOauthTokenSecret = undefined;

                    user.save()
                        .then((_user) => {
                            return res.status(201).json({
                                message: "Successfull"
                            });
                        })
                        .catch((err) => {
                            return res.status(500).json({
                                message: err.message,
                                err
                            });
                        });
                }
            }
        );
    }
};
