import { FrameworkPlugin, GeneratorContext, GenerateResult, FileToWrite } from '../types.js';

export class PluginRegistry {
  private plugins: FrameworkPlugin[] = [];

  register(plugin: FrameworkPlugin): void {
    this.plugins.push(plugin);
  }

  async executeBeforeGenerate(context: GeneratorContext): Promise<GeneratorContext> {
    let result = context;
    for (const plugin of this.plugins) {
      if (plugin.beforeGenerate) {
        try {
          result = await plugin.beforeGenerate(result);
        } catch (err) {
          console.warn(`Plugin ${plugin.name} beforeGenerate failed:`, err);
        }
      }
    }
    return result;
  }

  async executeAfterGenerate(result: GenerateResult): Promise<GenerateResult> {
    let output = result;
    for (const plugin of this.plugins) {
      if (plugin.afterGenerate) {
        try {
          output = await plugin.afterGenerate(output);
        } catch (err) {
          console.warn(`Plugin ${plugin.name} afterGenerate failed:`, err);
        }
      }
    }
    return output;
  }

  async executeBeforeWrite(file: FileToWrite): Promise<FileToWrite> {
    let output = file;
    for (const plugin of this.plugins) {
      if (plugin.beforeWrite) {
        try {
          output = await plugin.beforeWrite(output);
        } catch (err) {
          console.warn(`Plugin ${plugin.name} beforeWrite failed:`, err);
        }
      }
    }
    return output;
  }

  async executeAfterWrite(file: FileToWrite): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.afterWrite) {
        try {
          await plugin.afterWrite(file);
        } catch (err) {
          console.warn(`Plugin ${plugin.name} afterWrite failed:`, err);
        }
      }
    }
  }
}
