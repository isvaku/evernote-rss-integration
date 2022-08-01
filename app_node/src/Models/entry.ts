import mongoose, {Schema} from 'mongoose';
import IEntry from 'Interfaces/entry';

const EntrySchema: Schema = new Schema(
    {
      entryId: {type: String, required: true, unique: true},
      title: {type: String, required: true},
      author: {type: String, required: false},
      content: {type: String, required: true},
      link: {type: String, required: true},
      created: {type: Boolean, default: false},
      entryDate: {type: Date},
      entryErrors: [{type: String}],
      feed: {type: Schema.Types.ObjectId, required: true, ref: 'Rss'},
    },
    {
      timestamps: true,
    },
);

EntrySchema.index({entryId: 1, feed: 1}, {unique: true});

const Entry = mongoose.model<IEntry>('Entry', EntrySchema);

Entry.createIndexes();

export default Entry;
