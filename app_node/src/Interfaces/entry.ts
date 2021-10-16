import { Document } from "mongoose";
import IRss from "./rss";

export default interface IEntry extends Document {
    entry_id: string;
    title?: string;
    author?: string;
    content: string;
    link: string;
    created?: boolean;
    entryErrors?: [string];
    feed: IRss;
    entryDate: Date;
}
