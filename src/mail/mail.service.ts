import {
  Injectable,
  OnApplicationShutdown,
  ServiceUnavailableException,
} from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { MailConfig } from './mail.config';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  messageId?: string;
  unsubscribeUrl?: string;
}

@Injectable()
export class MailService implements OnApplicationShutdown {
  private transport?: Transporter<SMTPTransport.SentMessageInfo>;
  constructor(private readonly config: MailConfig) {}

  private transporter() {
    const settings = this.config.requireReady();
    if (!this.transport) {
      this.transport = nodemailer.createTransport({
        host: settings.host,
        port: settings.port,
        secure: settings.secure,
        requireTLS: !settings.secure,
        auth:
          settings.authMode === 'oauth2'
            ? {
                type: 'OAuth2',
                user: settings.user,
                clientId: settings.clientId,
                clientSecret: settings.clientSecret,
                refreshToken: settings.refreshToken,
              }
            : { user: settings.user, pass: settings.appPassword },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 30000,
        disableFileAccess: true,
        disableUrlAccess: true,
        logger: false,
        debug: false,
        tls: { minVersion: 'TLSv1.2' },
      });
    }
    return this.transport;
  }

  async verify() {
    try {
      await this.transporter().verify();
      return {
        verified: true,
        message:
          'Conexão SMTP e autenticação verificadas. Nenhum e-mail foi enviado.',
      };
    } catch {
      throw new ServiceUnavailableException(
        'Não foi possível validar o SMTP. Confira as credenciais e a conexão com o provedor.',
      );
    }
  }

  async send(message: MailMessage) {
    const settings = this.config.requireReady();
    const result = await this.transporter().sendMail({
      from: { name: settings.fromName, address: settings.from },
      replyTo: settings.replyTo,
      to: message.to,
      subject: message.subject.replace(/[\r\n]+/g, ' '),
      html: message.html,
      text: message.text,
      messageId: message.messageId,
      disableFileAccess: true,
      disableUrlAccess: true,
      ...(message.unsubscribeUrl && {
        list: { unsubscribe: { url: message.unsubscribeUrl } },
        headers: { 'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click' },
      }),
    });
    if (
      !result.accepted.some(
        (address) => address.toLowerCase() === message.to.toLowerCase(),
      )
    ) {
      throw Object.assign(new Error('Destinatário recusado pelo provedor.'), {
        code: 'EREJECTED',
        responseCode: 550,
      });
    }
    return { messageId: result.messageId };
  }

  onApplicationShutdown() {
    this.transport?.close();
  }
}
