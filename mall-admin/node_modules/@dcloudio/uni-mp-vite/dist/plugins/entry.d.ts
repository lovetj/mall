import type { Plugin } from 'vite';
import type { UniMiniProgramPluginOptions } from '../plugin';
interface VirtualMiniProgramFileInfo {
    filepath: string;
    root?: string;
}
export declare function virtualPagePath(filepath: string, root?: string): string;
export declare function virtualComponentPath(filepath: string, root?: string): string;
export declare function parseVirtualPagePath(uniPageUrl: string): string;
export declare function parseVirtualComponentPath(uniComponentUrl: string): string;
export declare function parseVirtualPagePathInfo(uniPageUrl: string): VirtualMiniProgramFileInfo;
export declare function parseVirtualComponentPathInfo(uniComponentUrl: string): VirtualMiniProgramFileInfo;
export declare function isUniPageUrl(id: string): boolean;
export declare function isUniComponentUrl(id: string): boolean;
export declare function parseComponentStyleIsolation(content: string): string | undefined;
export declare function getSubPackages(): {
    hasOptimizationSubPackages: boolean;
    subPackages: string[];
};
export declare function uniEntryPlugin({ global, template, style, }: UniMiniProgramPluginOptions): Plugin;
export {};
