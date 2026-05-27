import { createReadStream } from 'node:fs';
import { extname } from 'node:path';
import type { Response } from 'express';
import type {
  ResponseTransformer,
  JsonResponse,
  FileResponse,
  RedirectResponse,
  HtmlResponse,
  TextResponse,
} from './response.interface.js';

class JsonResponseTransformer implements ResponseTransformer {
  canHandle(value: any): boolean {
    return value?.__type === 'json';
  }

  async transform(value: JsonResponse, res: Response): Promise<void> {
    res.status(value.statusCode || 200).json(value.data);
  }
}

class FileResponseTransformer implements ResponseTransformer {
  canHandle(value: any): boolean {
    return value?.__type === 'file';
  }

  async transform(value: FileResponse, res: Response): Promise<void> {
    const ext = extname(value.path);
    const mimetype = value.mimetype || this.getMimeType(ext);

    res.setHeader('Content-Type', mimetype);
    if (value.filename) {
      res.setHeader('Content-Disposition', `attachment; filename="${value.filename}"`);
    }

    const stream = createReadStream(value.path);
    stream.pipe(res);
  }

  private getMimeType(ext: string): string {
    const mimeTypes: Record<string, string> = {
      '.json': 'application/json',
      '.txt': 'text/plain',
      '.html': 'text/html',
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.pdf': 'application/pdf',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.zip': 'application/zip',
    };
    return mimeTypes[ext.toLowerCase()] || 'application/octet-stream';
  }
}

class RedirectResponseTransformer implements ResponseTransformer {
  canHandle(value: any): boolean {
    return value?.__type === 'redirect';
  }

  async transform(value: RedirectResponse, res: Response): Promise<void> {
    res.redirect(value.statusCode || 302, value.url);
  }
}

class HtmlResponseTransformer implements ResponseTransformer {
  canHandle(value: any): boolean {
    return value?.__type === 'html';
  }

  async transform(value: HtmlResponse, res: Response): Promise<void> {
    res.status(value.statusCode || 200).setHeader('Content-Type', 'text/html').send(value.content);
  }
}

class TextResponseTransformer implements ResponseTransformer {
  canHandle(value: any): boolean {
    return value?.__type === 'text';
  }

  async transform(value: TextResponse, res: Response): Promise<void> {
    res.status(value.statusCode || 200).setHeader('Content-Type', 'text/plain').send(value.content);
  }
}

class DefaultResponseTransformer implements ResponseTransformer {
  canHandle(_value: any): boolean {
    return true;
  }

  async transform(value: any, res: Response): Promise<void> {
    res.status(200).json({ success: true, data: value });
  }
}

export class ResponseTransformer {
  private static readonly transformers: ResponseTransformer[] = [
    new JsonResponseTransformer(),
    new FileResponseTransformer(),
    new RedirectResponseTransformer(),
    new HtmlResponseTransformer(),
    new TextResponseTransformer(),
    new DefaultResponseTransformer(),
  ];

  static async transform(value: any, res: Response): Promise<void> {
    for (const transformer of this.transformers) {
      if (transformer.canHandle(value)) {
        await transformer.transform(value, res);
        return;
      }
    }
  }

  static registerTransformer(transformer: ResponseTransformer, index = 0): void {
    this.transformers.splice(index, 0, transformer);
  }
}
