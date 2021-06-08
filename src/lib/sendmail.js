import appRoot from 'app-root-path';
import serverConfig from 'config';
import Email from 'email-templates';
import path, { join } from 'node:path';
import util from 'node:util';
import nodemailer from 'nodemailer';
import { logger } from '../logger.js';
import pickupTransport from './pickup-transport.js';

let transporter;

async function send(options = {}) {
  const dirname = join(appRoot.path, 'pickup');
  console.dir(dirname);

  options.locals = {
    ...options.locals,
    ...{
      tt(key, options_) {
        return options_.data.root.t(
          { phrase: key, locale: options_.data.root.locale },
          { ...options.locals, ...options_.hash },
        );
      },
    },
  };

  if (!options.locals.locale) {
    options.locals.locale = 'en';
  }

  const { SMTP_PICKUP: pickup, sendMail, ProductName } = serverConfig;

  if (!options.locals.productName) {
    options.locals.productName = ProductName ?? 'Not defined';
  }

  if (!transporter) {
    let transport = {};

    if (pickup !== undefined && pickup) {
      const directory = path.join(dirname, typeof pickup === 'string' ? pickup : './pickup');

      transport = pickupTransport({
        directory,
      });
    }
    transporter = nodemailer.createTransport(transport);
  }

  const templateName = options.templateName || '';

  const templateFolder = sendMail?.templateDir || './templates';
  const juice = options.juice ?? sendMail?.juice ?? false;

  const templateDirectory = path.resolve(templateFolder);

  const mailoptions = {
    from: options.from,
    to: options.to,
    replyTo: options.replyTo || options.from,
    cc: options.cc,
    bcc: options.bcc,
    attachments: options.attachments,
  };

  const emailConfig = {
    i18n: {
      defaultLocale: 'en',
      locales: sendMail.locales ?? ['en'],
      fallbacks: sendMail.fallbacks ?? {},
      syncFiles: false,
      updateFiles: false,
      objectNotation: true,
    },
    views: {
      root: templateDirectory,
      options: {
        extension: 'hbs',
        map: { hbs: 'handlebars' },
      },
    },
    send: true,
    juice,
    juiceResources: {
      preserveImportant: true,
      webResources: {
        //
        // this is the relative directory to your CSS/image assets
        // and its default path is `build/`:
        //
        // e.g. if you have the following in the `<head`> of your template:
        // `<link rel="stylesheet" style="style.css" data-inline" />`
        // then this assumes that the file `build/style.css` exists
        //
        relativeTo: templateDirectory,
        //
        // but you might want to change it to something like:
        // relativeTo: path.join(__dirname, '..', 'assets')
        // (so that you can re-use CSS/images that are used in your web-app)
        //
      },
    },
    transport: transporter,
  };

  const email = new Email(emailConfig);

  try {
    return email.send({
      template: templateName,
      message: mailoptions,
      locals: options.locals,
    });
  } catch (error) {
    logger.warn(util.inspect(error));
  }
}

export default send;
