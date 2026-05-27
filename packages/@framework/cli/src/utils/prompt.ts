import inquirer from 'inquirer';

export class PromptUtility {
  static async text(message: string, defaultValue?: string): Promise<string> {
    const { answer } = await inquirer.prompt([
      {
        type: 'input',
        name: 'answer',
        message,
        default: defaultValue,
      },
    ]);
    return answer;
  }

  static async select(message: string, choices: string[]): Promise<string> {
    const { answer } = await inquirer.prompt([
      {
        type: 'list',
        name: 'answer',
        message,
        choices,
      },
    ]);
    return answer;
  }

  static async multiSelect(message: string, choices: string[]): Promise<string[]> {
    const { answer } = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'answer',
        message,
        choices,
      },
    ]);
    return answer;
  }

  static async confirm(message: string, defaultValue: boolean = false): Promise<boolean> {
    const { answer } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'answer',
        message,
        default: defaultValue,
      },
    ]);
    return answer;
  }
}
