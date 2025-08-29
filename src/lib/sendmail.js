import appRoot from 'app-root-path';
import Email from 'email-templates';
import fs from 'node:fs/promises';
import path, { join } from 'node:path';
import util from 'node:util';
import nodemailer from 'nodemailer';
import { logger } from '../logger.js';
import pickupTransport from './pickup-transport.js';

let transporter;

/**
 *
 * @param {Object} options
 * @param {Object} options.serverConfig
 * @returns
 */
export async function send(options) {
  const dirname = join(appRoot.path, 'pickup');
  const { serverConfig } = options;

  const {
    SMTP_PICKUP: smtpPickup,
    sendMail: { localePath, templateDir, juice: sendmailJuice, fallbacks },
    ProductName,
    SMTP_HOST: smtpHost,
    SMTP_AUTH: smtpAuth,
    SMTP_PORT: smtpPort,
    SMTP_SECURE: smtpSecure,
  } = serverConfig;

  const localeFolder = localePath ?? './locales';

  const locales = await getLocales(localeFolder);

  options.locals = {
    ...options.locals,

    tt(key, options_) {
      return options_.data.root.t(
        { phrase: key, locale: options_.data.root.locale },
        { ...options.locals, ...options_.hash },
      );
    },
  };

  if (!options.locals.locale) {
    options.locals.locale = 'en';
  }

  if (!options.locals.productName) {
    options.locals.productName = ProductName ?? 'Not defined';
  }

  if (!transporter) {
    let transport = {};

    if (smtpPickup !== undefined && smtpPickup) {
      const directory = path.join(
        dirname,
        typeof smtpPickup === 'string' ? smtpPickup : './pickup',
      );

      transport = pickupTransport({
        directory,
      });
    } else {
      transport = {
        host: smtpHost ?? 'localhost',
        port: smtpPort ?? 587,
        secure: smtpSecure ?? false,
        auth: smtpAuth,
      };
    }
    transporter = nodemailer.createTransport(transport);
  }

  const templateName = options.templateName || '';

  const templateFolder = templateDir ?? './templates';
  const juice = options.juice ?? sendmailJuice ?? false;

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
      locales,
      fallbacks: fallbacks ?? {},
      syncFiles: false,
      updateFiles: false,
      objectNotation: true,
      directory: localeFolder,
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

//
// private functions
//

/**
 *
 * @param {string} localeFolder
 * @returns { Promise<[string]>}
 */
async function getLocales(localeFolder) {
  try {
    const files = await fs.readdir(localeFolder);

    const locales = files
      .filter(file => path.extname(file) === '.json')
      .map(file => path.basename(file, '.json'));

    return locales;
  } catch (error) {
    console.dir(error);
    return ['en'];
  }
}
