import {Document} from 'mongoose';

export default interface IUser extends Document {
    username: string;
    email: string;
    password: string;
    evernote: {
        oauthToken?: string;
        expires?: number;
        sessionOauthToken?: string;
        sessionOauthTokenSecret?: string;
        oauthStatus?: string;
        oauthError?: string[];
    };
};
