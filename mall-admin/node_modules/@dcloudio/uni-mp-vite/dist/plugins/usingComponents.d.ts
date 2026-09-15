import type { Plugin } from 'vite';
import type { SFCScriptCompileOptions } from '@vue/compiler-sfc';
export declare function uniUsingComponentsPlugin(options?: {
    normalizeComponentName?: (name: string) => string;
    babelParserPlugins?: SFCScriptCompileOptions['babelParserPlugins'];
}): Plugin;
interface DynamicImportOptions {
    root?: string;
    inferRoot?: boolean;
    checkIndependentRoot?: boolean;
    inputDir?: string;
}
export declare function dynamicImport(name: string, value: string, options?: DynamicImportOptions): string;
export {};
