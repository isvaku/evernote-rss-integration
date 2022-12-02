import htmlParser, {HTMLElement} from 'node-html-parser';
import {Types} from 'evernote';
import createMD5 from './createMD5';
import httpsPromise from './httpsPromise';
import IEntry from 'Interfaces/entry';
import logging from './logging';

const NAMESPACE = 'Utils';

const ATTRS_REGEX: RegExp = /\w+=\"[^"]*\"(?:\.?\"[^)]*\")*/g;
const URL_REGEX: RegExp =
    // eslint-disable-next-line max-len
    /https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*)/g;
const BANNED_ELEMENTS: string[] = [
  'applet',
  'base',
  'basefont',
  'bgsound',
  'blink',
  'body',
  'button',
  'dir',
  'embed',
  'fieldset',
  'form',
  'frame',
  'frameset',
  'head',
  'html',
  'iframe',
  'ilayer',
  'input',
  'isindex',
  'label',
  'layer,',
  'legend',
  'link',
  'marquee',
  'menu',
  'meta',
  'noframes',
  'noscript',
  'object',
  'optgroup',
  'option',
  'param',
  'plaintext',
  'script',
  'select',
  'style',
  'textarea',
  'xml',
];

const BANNED_ATTRIBUTES: string[] = [
  'lang',
  'language',
  'onmouseover',
  'onmouseout',
  'script',
  'font',
  'dir',
  'face',
  'size',
  'color',
  'class',
  'hspace',
  'border',
  'valign',
  'align',
  'background',
  'bgcolor',
  'text',
  'link',
  'vlink',
  'alink',
  'cellpadding',
  'cellspacing',
  'alt',
  'src',
  'srcset',
];

const RESOURCE_TYPES_ALLOWED: string[] = [
  'image/gif',
  'image/jpeg',
  'image/png',
  'audio/wav',
  'audio/mpeg',
  'audio/amr',
  'application/pdf',
];

export default {
  removeBannedAttributes: (element: HTMLElement): HTMLElement => {
    // @ts-expect-error
    let nodeAttributes = element.rawAttrs;

    if (!nodeAttributes) {
      return element;
    }

    nodeAttributes = [...nodeAttributes.matchAll(ATTRS_REGEX)];
    nodeAttributes = nodeAttributes.map(
        (nodeAttribute) => nodeAttribute[0],
    );
    nodeAttributes = nodeAttributes.filter((nodeAttribute) =>
      BANNED_ATTRIBUTES.includes(nodeAttribute.split('=')[0]),
    );

    nodeAttributes.forEach((nodeAttribute) => {
      element.removeAttribute(nodeAttribute.split('=')[0]);
    });

    return element;
  },
  removeBannedTag: (element) => {
    if (BANNED_ELEMENTS.includes(element.tagName)) {
      element.remove();
    }
  },

  createEnMediaTag: (content: string, mimetype: string): string => {
    return `<en-media hash="${content}" type="${mimetype}" />`;
  },

  createNoteBody: async function(
      entry: IEntry,
  ): Promise<{ body: string; resourcesArr: Types.Resource[] }> {
    const entryHTML = htmlParser(entry.content);

    entryHTML.childNodes.forEach((element) => {
      this.removeBannedTag(element);
    });

    let sanitizedBody = '';
    const resourcesArr: Types.Resource[] = [];
    for (const childNode of entryHTML.childNodes) {
      // @ts-expect-error
      if (childNode.tagName?.toLowerCase() === 'img') {
        const src: string = this.getImgSrc(childNode);
        const multimediaObject = await httpsPromise(src);

        if (
          multimediaObject.body &&
          multimediaObject.headers?.['content-type']
        ) {
          multimediaObject.md5 = createMD5(multimediaObject.body);
          const mediaTag = this.createEnMediaTag(
              multimediaObject.md5,
              multimediaObject.headers['content-type'],
          );
          sanitizedBody += '<br />';
          sanitizedBody += mediaTag;
          sanitizedBody += '<br />';

          const resourceData = new Types.Data({
            bodyHash: multimediaObject.md5,
            size: multimediaObject.body.length,
            body: multimediaObject.body,
          });
          resourcesArr.push(
              new Types.Resource({
                data: resourceData,
                mime: multimediaObject.headers['content-type'],
              }),
          );
        } else {
          logging.error(
              NAMESPACE,
              'Error fetching media: ',
              multimediaObject.body,
          );
        }
      } else {
        let textToAppennd = childNode.rawText;
        // @ts-expect-error
        if (childNode.tagName) {
          this.removeBannedAttributes(childNode);
        } else {
          textToAppennd = this.escapeXml(textToAppennd);
        }

        sanitizedBody += textToAppennd;
      }
    }

    this.removeBannedAttributes(entryHTML.childNodes[0]);
    const content =
            '<?xml version="1.0" encoding="UTF-8"?>' +
            '<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">' +
            '<en-note>' +
            this.escapeXml(entry.title) +
            '<br />' +
            '<br />' +
            entry.author +
            ' - ' +
            entry.entryDate.toLocaleString() +
            '<br />' +
            '<br />' +
            entry.link +
            '<br />' +
            sanitizedBody +
            '</en-note>';

    return {body: content, resourcesArr};
  },

  createNote: function(
      noteStore: any,
      entry: IEntry,
      noteData: { body: string; resourcesArr: Types.Resource[] },
  ): Types.Note {
    const note = new Types.Note();
    note.title = entry.title;
    note.content = noteData.body;

    note.notebookGuid = entry.feed.notebook.guid;
    note.resources = noteData.resourcesArr;
    note.tagGuids = entry.feed.tags.map((tag) => tag.guid);

    return note;
  },

  getImgSrc: function(element: HTMLElement): string {
    let src = element.getAttribute('src');

    if (!src) {
      src = element.getAttribute('srcset');

      const srcset:RegExpMatchArray[] = [...src.matchAll(this.URL_REGEX)];
      // eslint-disable-next-line max-len
      const srcsetString: string[] = srcset.map((nodeAttribute) => nodeAttribute[0]);
      if (srcset.length > 0) {
        return srcsetString[0];
      }

      logging.error(NAMESPACE, 'No src in: ', element);
    }

    return src;
  },

  escapeXml: function(unsafe: string) {
    return unsafe.replace(/[<>&'"]/g, function(c) {
      switch (c) {
        case '<': return '&lt;';
        case '>': return '&gt;';
        case '&': return '&amp;';
        case '\'': return '&apos;';
        case '"': return '&quot;';
      }
    });
  },

  ATTRS_REGEX: ATTRS_REGEX,
  BANNED_ELEMENTS: BANNED_ELEMENTS,
  BANNED_ATTRIBUTES: BANNED_ATTRIBUTES,
  RESOURCE_TYPES_ALLOWED: RESOURCE_TYPES_ALLOWED,
  URL_REGEX: URL_REGEX,
};
