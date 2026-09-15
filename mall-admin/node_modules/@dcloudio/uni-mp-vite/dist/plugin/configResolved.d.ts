import type { Plugin } from 'vite';
import type { UniMiniProgramPluginOptions } from '.';
export declare function createConfigResolved({ cdn, style: { extname }, template: { component }, }: UniMiniProgramPluginOptions): Plugin['configResolved'];
export declare function resolveUVueCssFilename(filename: string, extname: string): string;
export declare function resolveNVueCssFilename(filename: string, extname: string): string;
