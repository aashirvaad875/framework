import fs from 'fs-extra';
import path from 'path';

export class FileUtility {
  static async exists(filePath: string): Promise<boolean> {
    return fs.pathExists(filePath);
  }

  static async write(filePath: string, content: string, overwrite: boolean = false): Promise<void> {
    if ((await this.exists(filePath)) && !overwrite) {
      throw new Error(`File already exists: ${filePath}`);
    }
    await fs.ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, content, 'utf-8');
  }

  static async read(filePath: string): Promise<string> {
    return fs.readFile(filePath, 'utf-8');
  }

  static async remove(filePath: string): Promise<void> {
    await fs.remove(filePath);
  }

  static async ensureDirectory(dirPath: string): Promise<void> {
    await fs.ensureDir(dirPath);
  }

  static normalizePath(filePath: string): string {
    return filePath.replace(/\\/g, '/');
  }

  static async listFiles(dirPath: string, pattern?: RegExp): Promise<string[]> {
    const files = await fs.readdir(dirPath);
    if (!pattern) {
      return files;
    }
    return files.filter(f => pattern.test(f));
  }
}
