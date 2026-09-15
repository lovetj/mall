import type { BuildOptions, UserConfig } from 'vite';
interface MiniProgramBuildOptions {
    app?: {
        independentSubpackages?: boolean;
    };
}
export declare function buildOptions(options?: MiniProgramBuildOptions): UserConfig['build'];
export declare function createBuildOptions(inputDir: string, platform: UniApp.PLATFORM, options?: MiniProgramBuildOptions): BuildOptions;
export declare function notFound(filename: string): never;
export {};
