import { Document, PopulatedDoc } from "mongoose";
import IUser from "./user";

export default interface IToken extends Document {
    token: string;
    creationDate: Date;
    user: PopulatedDoc<IUser>;
}
