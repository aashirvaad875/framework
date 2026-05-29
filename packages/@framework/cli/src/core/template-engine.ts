import Handlebars from 'handlebars';
import fs from 'fs-extra';
import path from 'path';
import os from 'os';
import { TemplateContext } from '../types.js';

export class TemplateEngine {
  private builtInTemplatesPath: string;
  private customTemplatesPath: string;

  constructor(builtInPath: string, customPath?: string) {
    this.builtInTemplatesPath = builtInPath;
    // Default to ~/.framework-cli/templates if not specified
    this.customTemplatesPath = customPath || path.join(os.homedir(), '.framework-cli', 'templates');
  }

  get templatesPath(): string {
    return this.builtInTemplatesPath;
  }

  async render(templateName: string, context: TemplateContext): Promise<string> {
    const templateContent = await this.loadTemplate(templateName);
    const template = Handlebars.compile(templateContent);
    return template(context);
  }

  private async loadTemplate(templateName: string): Promise<string> {
    const fileName = templateName.endsWith('.hbs') ? templateName : `${templateName}.hbs`;

    // Try custom template first
    const customPath = path.join(this.customTemplatesPath, fileName);
    if (await fs.pathExists(customPath)) {
      console.log(`Loading custom template: ${customPath}`);
      return fs.readFile(customPath, 'utf-8');
    }

    // Fall back to built-in template
    const builtInPath = path.join(this.builtInTemplatesPath, fileName);
    if (await fs.pathExists(builtInPath)) {
      return fs.readFile(builtInPath, 'utf-8');
    }

    throw new Error(
      `Template not found: ${templateName} (searched: ${customPath}, ${builtInPath})`
    );
  }

  registerHelper(name: string, fn: (...args: any[]) => string): void {
    Handlebars.registerHelper(name, fn);
  }

  registerPartial(name: string, content: string): void {
    Handlebars.registerPartial(name, content);
  }
}
