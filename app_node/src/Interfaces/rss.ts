import { Document, PopulatedDoc } from "mongoose";
import IUser from "./user";

export default interface IRss extends Document {
    url: string;
    notebook: {
        name: string;
        guid: string;
    };
    tags?: {
        name: string;
        guid: string;
    }[];
    active: boolean;
    user: PopulatedDoc<IUser>;
}
