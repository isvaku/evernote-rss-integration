import mongoose, { Schema, Types } from "mongoose";
import IToken from "Interfaces/token";

const TokenSchema: Schema = new Schema({
    token: { type: String, required: true },
    createdAt: { type: Date, default: Date.now, expires: 3600 },
    user: { type: Schema.Types.ObjectId, required: true, ref: "User" }
});

const Token = mongoose.model<IToken>("Token", TokenSchema);

export default Token;
