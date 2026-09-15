/// <reference types="node" />
import { type CopyOptions } from '@dcloudio/uni-cli-shared';
import type { UniMiniProgramPluginOptions } from '.';
export declare function normalizeCopyOptions(copyOptions: CopyOptions, options: UniMiniProgramPluginOptions): CopyOptions;
export declare function transformIndependentMiniProgramComponentJs(source: Buffer | string, filename: string, { componentDir, independentRoots, inputDir, }: {
    componentDir: string;
    independentRoots: string[];
    inputDir?: string;
}): string | undefined;
