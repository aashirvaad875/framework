import type { Response } from 'express';

export type ResponseType = 'json' | 'file' | 'redirect' | 'html' | 'stream' | 'text';

export interface ResponseTransformer {
  canHandle(value: any): boolean;
  transform(value: any, res: Response): Promise<void>;
}

export interface JsonResponse {
  __type: 'json';
  statusCode?: number;
  data: any;
}

export interface FileResponse {
  __type: 'file';
  path: string;
  filename?: string;
  mimetype?: string;
}

export interface RedirectResponse {
  __type: 'redirect';
  url: string;
  statusCode?: number; // 301, 302, 307, 308
}

export interface HtmlResponse {
  __type: 'html';
  content: string;
  statusCode?: number;
}

export interface TextResponse {
  __type: 'text';
  content: string;
  statusCode?: number;
}

export type TransformableResponse =
  | any
  | JsonResponse
  | FileResponse
  | RedirectResponse
  | HtmlResponse
  | TextResponse;
