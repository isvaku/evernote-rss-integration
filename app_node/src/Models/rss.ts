import mongoose, {Schema} from 'mongoose';
import IRss from 'Interfaces/rss';

const RssSchema: Schema = new Schema(
    {
      url: {type: String, required: true},
      notebook: {
        name: {type: String, required: true},
        guid: {type: String, required: true},
      },
      tags: [
        {
          name: {type: String, required: true},
          guid: {type: String, required: true},
        },
      ],
      active: {type: Boolean, required: true, default: true},
      user: {type: Schema.Types.ObjectId, required: true, ref: 'User'},
    },
    {
      timestamps: true,
      collection: 'rss',
    },
);

const Rss = mongoose.model<IRss>('Rss', RssSchema);

export default Rss;
