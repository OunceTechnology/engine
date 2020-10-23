import Email from 'email-templates';
import nodemailer from 'nodemailer';
import path from 'path';
import serverConfig from 'config';
import pickupTransport from './pickup-transport.mjs';

let transporter;

async function send(options = {}) {
  const dirname = process.cwd();

  const { SMTP_PICKUP: pickup, sendMail } = serverConfig;

  if (!transporter) {
    let transport = {};

    if (pickup !== undefined && pickup) {
      const directory = path.join(
        dirname,
        typeof pickup === 'string' ? pickup : './pickup',
      );
      // console.dir(directory);
      transport = pickupTransport({
        directory,
      });
    }
    transporter = nodemailer.createTransport(transport);
  }

  const templateName = options.templateName || '';

  const templateFolder = sendMail?.templateDir || './templates';
  const juice = options.juice ?? sendMail?.juice ?? false;

  const templateDir = path.resolve(templateFolder);

  const mailoptions = {
    from: options.from,
    to: options.to,
    replyTo: options.replyTo || options.from,
    cc: options.cc,
    bcc: options.bcc,
    attachments: options.attachments,
  };

  const emailConfig = {
    views: {
      root: templateDir,
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
        relativeTo: templateDir,
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
    console.dir(error);
  }
}

export default send;
