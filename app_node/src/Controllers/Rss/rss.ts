import {NextFunction, Request, Response} from 'express';
import logging from '../../Utils/logging';
import mongoose, {Schema} from 'mongoose';
import User from '../../Models/user';
import Rss from '../../Models/rss';
import Entry from '../../Models/entry';
import Evernote, {Types} from 'evernote';
import config from '../../Config/config';
import rssParser from 'rss-parser';
import IEntry from 'Interfaces/entry';
import user from 'Interfaces/user';
import rss from 'Interfaces/rss';
import utils from '../../Utils/utils';
import {StatusCodes} from 'http-status-codes';

const NAMESPACE = 'RSS';

const create = async (req: Request, res: Response, next: NextFunction) => {
  const {feed, notebook, tags = []} = req.body;

  if (!feed) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'Feed is required',
    });
  }

  const parser = new rssParser();

  try {
    await parser.parseURL(feed);
  } catch (error) {
    logging.error(NAMESPACE, 'Error while parsing feed', error);

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error while parsing feed',
      error,
    });
  }

  let feedNotebook: Types.Notebook;
  const feedTags = [];
  let user: user & { _id: mongoose.Types.ObjectId };

  try {
    user = await User.findOne({username: res.locals.jwt.username});
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error while fetching user',
      error,
    });
  }

  if (user.evernote.oauthToken) {
    try {
      const client = new Evernote.Client({
        token: user.evernote.oauthToken,
        sandbox: config.evernote.sandbox,
        china: config.evernote.china,
      });

      if (notebook) {
        const clientNotebooks = await client
            .getNoteStore()
            .listNotebooks();

        clientNotebooks.forEach((clientNotebook) => {
          if (clientNotebook.name == notebook) {
            feedNotebook = clientNotebook;
            return;
          }
        });

        if (!feedNotebook) {
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message:
                'Notebook provided doesn\'t exist, verify your input',
          });
        }
      } else {
        feedNotebook = await client.getNoteStore().getDefaultNotebook();
      }

      if (tags.length > 0) {
        const listTags = await client.getNoteStore().listTags();

        listTags.forEach((tag) => {
          const tagIndex = tags.indexOf(tag.name);
          if (tagIndex > -1) {
            feedTags.push({
              name: tag.name,
              guid: tag.guid,
            });
            tags.splice(tagIndex, 1);
          }
        });

        if (tags.length > 0) {
          for (const tag of tags) {
            let newTag = new Types.Tag();
            newTag.name = tag;
            newTag = await client.getNoteStore().createTag(newTag);
            feedTags.push({name: newTag.name, guid: newTag.guid});
          }
        }
      }

      const _rss = new Rss({
        _id: new mongoose.Types.ObjectId(),
        url: feed,
        notebook: {
          name: feedNotebook.name,
          guid: feedNotebook.guid,
        },
        tags: feedTags,
        user: user._id,
      });

      return _rss
          .save()
          .then((rss) => {
            return res.status(StatusCodes.CREATED).json({
              rss,
            });
          })
          .catch((err) => {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
              message: err.message,
              err,
            });
          });
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: error.message,
        error,
      });
    }
  } else {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'User doesn\'t have Evernote oauth registered',
    });
  }
};

const get = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await User.findOne({username: res.locals.jwt.username});
    const feeds = await Rss.find({active: true, user: user._id});

    return res.status(StatusCodes.OK).json({
      feeds,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'User doesn\'t have Evernote oauth registered',
      error,
    });
  }
};

const update = async (req: Request, res: Response, next: NextFunction) => {
  const {rssId, notebook, tags = [], active} = req.body;

  let feedNotebook: Types.Notebook;
  const feedTags: { name: string; guid: string }[] = [];
  let user: user & { _id: mongoose.Types.ObjectId };
  let rss: rss & { _id: mongoose.Types.ObjectId };

  try {
    user = await User.findOne({username: res.locals.jwt.username});
    rss = await Rss.findOne({
      _id: new mongoose.Types.ObjectId(rssId),
      user: user._id,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error while fetching data',
      error,
    });
  }

  if (user.evernote.oauthToken) {
    try {
      const client = new Evernote.Client({
        token: user.evernote.oauthToken,
        sandbox: config.evernote.sandbox,
        china: config.evernote.china,
      });

      if (notebook) {
        const clientNotebooks = await client
            .getNoteStore()
            .listNotebooks();

        clientNotebooks.forEach((clientNotebook) => {
          if (clientNotebook.name == notebook) {
            feedNotebook = clientNotebook;
            return;
          }
        });

        if (!feedNotebook) {
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message:
                'Notebook provided doesn\'t exist, verify your input',
          });
        }

        (rss.notebook.name = feedNotebook.name),
        (rss.notebook.guid = feedNotebook.guid);
      }

      if (tags.length > 0) {
        const listTags = await client.getNoteStore().listTags();

        listTags.forEach((tag) => {
          const tagIndex = tags.indexOf(tag.name);
          if (tagIndex > -1) {
            feedTags.push({
              name: tag.name,
              guid: tag.guid,
            });
            tags.splice(tagIndex, 1);
          }
        });

        if (tags.length > 0) {
          for (const tag of tags) {
            let newTag = new Types.Tag();
            newTag.name = tag;
            newTag = await client.getNoteStore().createTag(newTag);
            feedTags.push({name: newTag.name, guid: newTag.guid});
          }
        }

        rss.tags = feedTags;
      }

      if (active !== undefined) {
        rss.active = active;
      }

      return rss
          .save()
          .then((rss) => {
            return res.status(StatusCodes.CREATED).json({
              rss,
            });
          })
          .catch((err) => {
            return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
              message: err.message,
              err,
            });
          });
    } catch (error) {
      return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
        message: error.message,
        error,
      });
    }
  } else {
    return res.status(StatusCodes.UNAUTHORIZED).json({
      message: 'User doesn\'t have Evernote oauth registered',
    });
  }
};

const remove = async (req: Request, res: Response, next: NextFunction) => {
  const {rssId} = req.body;

  if (!rssId) {
    return res.status(StatusCodes.BAD_REQUEST).json({
      message: 'rssId is required',
    });
  }
  try {
    const user = await User.findOne({username: res.locals.jwt.username});
    const rssObjid = new mongoose.Types.ObjectId(rssId);

    const entriesDeleted = await Entry.deleteMany({feed: rssObjid});

    logging.info(NAMESPACE, 'entriesDeleted', entriesDeleted);

    const deletionError = await Rss.deleteOne({
      _id: rssObjid,
      user: user._id,
    });

    if (deletionError.deletedCount > 0) {
      return res.status(StatusCodes.OK).json({
        message: 'rss removed successfully',
      });
    }

    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'There was an error while removing rss',
      error: deletionError,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error while fetching data',
      error,
    });
  }
};

const insertEntriesFromFeed = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
  try {
    const parser: any = new rssParser();
    const feeds = await Rss.find({active: true});

    if (feeds.length === 0) {
      return res.status(StatusCodes.NOT_FOUND).json({
        message: 'No feeds found',
        count: 0,
      });
    }

    const entryArr: Array<IEntry> = [];

    for (const feed of feeds) {
      try {
        const parsedFeed = await parser.parseURL(feed.url);

        let items = parsedFeed.items;

        items = await removeInsertedItems(items, feed._id);

        for (const item of items) {
          entryArr.push(
              new Entry({
                entryId: item.guid,
                title: item.title,
                author: item.creator,
                content: item['content:encoded'],
                link: item.link,
                entryDate: new Date(item.isoDate),
                feed: feed._id,
              }),
          );
        }

        try {
          const entries = await Entry.insertMany(entryArr, {
            ordered: false,
          });

          return res.status(StatusCodes.OK).json({
            message: 'Entries inserted',
            count: entries.length,
          });
        } catch (error) {
          return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
            message: 'Error saving entries',
            error,
          });
        }
      } catch (error) {
        return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
          message: 'Error parsing RSS Feed',
          error,
        });
      }
    }
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error fetching Feeds from DB',
      error,
    });
  }
};

const createNotesFromEntries = async (
    req: Request,
    res: Response,
    next: NextFunction,
) => {
  const errors = [];
  try {
    const activeFeeds = await Rss.find({active: true}).populate({
      path: 'user',
      model: 'User',
    });

    const entries = await Entry.find({
      feed_id: {$in: activeFeeds},
      created: false,
    }).populate({
      path: 'feed',
      model: 'Rss',
    });

    let createdNotes = 0;

    for (const entry of entries) {
      const userFeed = activeFeeds.find((feed) =>
        feed.user._id.equals(entry.feed.user),
      );

      const noteData = await utils.createNoteBody(entry);

      const client = new Evernote.Client({
        token: userFeed.user.evernote.oauthToken,
        sandbox: config.evernote.sandbox,
        china: config.evernote.china,
      });

      const noteStore = client.getNoteStore();

      const newNote = utils.createNote(noteStore, entry, noteData);

            await noteStore.createNote(newNote);

            entry.created = true;

            await entry.save();

            createdNotes++;
        }

    return res.status(StatusCodes.OK).json({
      message: 'Success',
      createdNotes,
    });
  } catch (error) {
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json({
      message: 'Error fetching Feeds from DB',
      error,
    });
  }
};

const removeInsertedItems = async (
    items: Array<any>,
    feedId: Schema.Types.ObjectId,
) => {
  const query = {
    entryId: {$in: items.map((item) => item.guid)},
    feed: feedId,
  };

  const entries = await Entry.find(query).select({entryId: 1});

  return items.filter(
      (item) => !entries.find((entry) => item.guid === entry.entryId),
  );
};

export default {
  create,
  get,
  update,
  remove,
  insertEntriesFromFeed,
  createNotesFromEntries,
};
