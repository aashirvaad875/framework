import { Project, ImportDeclarationStructure } from 'ts-morph';
import path from 'path';

export class ASTManipulator {
  private project: Project | null = null;
  private projectRoot: string;

  constructor(projectRoot: string) {
    this.projectRoot = projectRoot;
  }

  private getProject(): Project {
    if (!this.project) {
      this.project = new Project({
        tsConfigFilePath: path.join(this.projectRoot, 'tsconfig.json'),
      });
    }
    return this.project;
  }

  addImport(filePath: string, importPath: string, namedImports: string | string[]): void {
    const sourceFile = this.getProject().addSourceFileAtPath(filePath);

    const names = Array.isArray(namedImports) ? namedImports : [namedImports];

    // Check if import already exists
    const existing = sourceFile.getImportDeclaration(d => {
      return d.getModuleSpecifierValue() === importPath;
    });

    if (existing) {
      // Add to existing import
      for (const name of names) {
        if (!existing.getNamedImports().some(n => n.getName() === name)) {
          existing.addNamedImport(name);
        }
      }
    } else {
      // Create new import
      sourceFile.addImportDeclaration({
        moduleSpecifier: importPath,
        namedImports: names,
      } as ImportDeclarationStructure);
    }
  }

  registerInModule(
    filePath: string,
    className: string,
    arrayType: 'controllers' | 'providers' | 'guards' | 'middleware'
  ): void {
    const sourceFile = this.getProject().addSourceFileAtPath(filePath);
    const moduleClass = sourceFile.getClasses()[0];

    if (!moduleClass) {
      throw new Error(`No class found in ${filePath}`);
    }

    const moduleDecorator = moduleClass.getDecorators().find(d => d.getName() === 'Module');
    if (!moduleDecorator) {
      throw new Error(`@Module decorator not found in ${filePath}`);
    }

    const decoratorArg = moduleDecorator.getArguments()[0];
    if (!decoratorArg) {
      throw new Error(`@Module decorator has no arguments`);
    }

    // Find or create the array property
    const objLiteral = decoratorArg.asKindOrThrow(/* kind: SyntaxKind.ObjectLiteralExpression */);

    // Use string interpolation to find the property
    const arrayProp = objLiteral
      .getChildrenOfKind(/* SyntaxKind.PropertyAssignment */)
      .find(prop => {
        return prop.getChildAtIndex(0)?.getText() === arrayType;
      });

    if (!arrayProp) {
      // Create new property if it doesn't exist
      objLiteral.addPropertyAssignment({
        name: arrayType,
        initializer: `[${className}]`,
      });
    } else {
      // Add to existing array
      const arrayChild = arrayProp.getLastChild();
      if (arrayChild?.getText().includes('[')) {
        const arrayText = arrayChild.getText();
        const newArrayText = arrayText.replace(/]$/, `, ${className}]`);
        arrayChild.replaceWithText(newArrayText);
      }
    }
  }

  updateBarrelExport(indexFilePath: string, exportPath: string): void {
    const sourceFile = this.getProject().addSourceFileAtPath(indexFilePath);

    const existingExport = sourceFile
      .getExportDeclarations()
      .find(e => e.getModuleSpecifierValue() === exportPath);

    if (!existingExport) {
      sourceFile.addExportDeclaration({
        moduleSpecifier: exportPath,
      });
    }
  }

  async saveChanges(): Promise<void> {
    await this.getProject().save();
  }
}
