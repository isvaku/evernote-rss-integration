import mongoose, {Schema} from 'mongoose';
import {isEmail} from 'validator';
import IUser from 'Interfaces/user';

const UserSchema: Schema = new Schema(
    {
      username: {type: String, required: true, unique: true, trim: true},
      email: {
        type: String,
        lowercase: true,
        unique: true,
        required: true,
        validate: [isEmail, 'Please fill a valid email address'],
      },
      password: {type: String, required: true},
      evernote: {
        oauthToken: {type: String, required: false},
        expires: {type: Number, required: false},
        sessionOauthToken: {type: String, required: false},
        sessionOauthTokenSecret: {type: String, required: false},
        oauthStatus: {
          type: String,
          enum: ['empty', 'created', 'error', 'success'],
          default: 'empty',
        },
        oauthError: [{type: String}],
      },
    },
    {
      timestamps: true,
    },
);

const User = mongoose.model<IUser>('User', UserSchema);

User.createIndexes();

export default User;
