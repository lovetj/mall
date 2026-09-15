"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.createBuildOptions = exports.buildOptions = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const entry_1 = require("../plugins/entry");
const independentUtils_1 = require("../plugins/independentUtils");
const debugChunk = (0, debug_1.default)('uni:chunk');
function buildOptions(options = {}) {
    const platform = process.env.UNI_PLATFORM;
    const inputDir = process.env.UNI_INPUT_DIR;
    const outputDir = process.env.UNI_OUTPUT_DIR;
    // 开始编译时，清空输出目录
    if (fs_1.default.existsSync(outputDir)) {
        (0, uni_cli_shared_1.emptyDir)(outputDir, ['project.config.json', 'project.private.config.json']);
    }
    return createBuildOptions(inputDir, platform, options);
}
exports.buildOptions = buildOptions;
function createBuildOptions(inputDir, platform, options = {}) {
    const { renderDynamicImport } = (0, uni_cli_shared_1.dynamicImportPolyfill)();
    return {
        // TODO 待优化，不同小程序平台sourcemap处理逻辑可能不同
        // TODO 目前存在两层sourcemap，一层是vite的，一层是小程序的，目前拿不到小程序的sourcemap，导致没法还原到源码，所以暂时不默认启用
        sourcemap: (0, uni_cli_shared_1.isEnableConsole)() && (0, uni_cli_shared_1.enableSourceMap)(),
        // target: ['chrome53'], // 由小程序自己启用 es6 编译
        emptyOutDir: false, // 不清空输出目录，否则会影响自定义的一些文件输出，比如wxml
        lib: process.env.UNI_COMPILE_TARGET === 'uni_modules'
            ? false
            : {
                // 必须使用 lib 模式，否则会生成 preload 等代码
                fileName: 'app.js',
                entry: (0, uni_cli_shared_1.resolveMainPathOnce)(inputDir),
                formats: ['cjs'],
            },
        rollupOptions: {
            input: process.env.UNI_COMPILE_TARGET === 'uni_modules'
                ? {}
                : parseRollupInput(inputDir, platform, options),
            output: {
                sourcemapPathTransform: (relativeSourcePath, sourcemapPath) => {
                    const result = sourcemapPathTransform(relativeSourcePath, sourcemapPath);
                    if (platform === 'mp-alipay') {
                        return path_1.default.basename(result);
                    }
                    return result;
                },
                entryFileNames(chunk) {
                    if (chunk.name === 'main') {
                        return 'app.js';
                    }
                    return chunk.name + '.js';
                },
                format: 'cjs',
                manualChunks: createMoveToVendorChunkFn(),
                chunkFileNames: createChunkFileNames(inputDir),
                plugins: [
                    {
                        name: 'dynamic-import-polyfill',
                        renderDynamicImport(options) {
                            const { targetModuleId } = options;
                            if (targetModuleId && (0, uni_cli_shared_1.isMiniProgramAssetFile)(targetModuleId)) {
                                return {
                                    left: 'Promise.resolve(require(',
                                    right: '))',
                                };
                            }
                            return renderDynamicImport.call(this, options);
                        },
                    },
                ],
            },
        },
    };
}
exports.createBuildOptions = createBuildOptions;
function sourcemapPathTransform(relativeSourcePath, sourcemapPath) {
    const prefix = '';
    let [, modulePath] = relativeSourcePath.split('/node_modules/');
    if (modulePath) {
        return `${prefix}node_modules/${modulePath}`;
    }
    let [, base64] = relativeSourcePath.split('/uniPage:/');
    if (base64) {
        return prefix + (0, entry_1.parseVirtualPagePathInfo)(base64).filepath + '?type=page';
    }
    ;
    [, base64] = relativeSourcePath.split('/uniComponent:/');
    if (base64) {
        return (prefix +
            (0, entry_1.parseVirtualComponentPathInfo)(base64).filepath +
            '?type=component');
    }
    return (prefix +
        (0, uni_cli_shared_1.normalizePath)(path_1.default.relative(process.env.UNI_INPUT_DIR, path_1.default.resolve(path_1.default.dirname(sourcemapPath), relativeSourcePath))));
}
// 获取子包的插件导出
function getSubpackagePluginExports(inputDir) {
    const pagesJsonPath = path_1.default.join(inputDir, 'pages.json');
    const pluginExports = {};
    const pagesJson = (0, uni_cli_shared_1.parseJson)(fs_1.default.readFileSync(pagesJsonPath, 'utf8'), true, pagesJsonPath);
    const subPackages = (pagesJson.subPackages ||
        pagesJson.subpackages ||
        []).filter((pkg) => pkg.root && pkg.plugins);
    for (const pkg of subPackages) {
        const plugins = Object.values(pkg.plugins);
        for (const plugin of plugins) {
            if (!plugin.export) {
                continue;
            }
            const pluginExportFile = path_1.default.resolve(inputDir, pkg.root, plugin.export);
            if (!fs_1.default.existsSync(pluginExportFile)) {
                notFound(pluginExportFile);
            }
            pluginExports[(0, uni_cli_shared_1.removeExt)(path_1.default.join(pkg.root, plugin.export))] =
                pluginExportFile;
        }
    }
    return pluginExports;
}
function parseRollupInput(inputDir, platform, options) {
    const inputOptions = {
        app: (0, uni_cli_shared_1.resolveMainPathOnce)(inputDir),
    };
    if (process.env.UNI_MP_PLUGIN) {
        (0, independentUtils_1.initIndependentSubPackages)([]);
        return inputOptions;
    }
    // 独立分包需要原始 pages.json；normalize 会把 subPackages 合并进 pages。
    const independentPackages = options.app?.independentSubpackages
        ? (0, uni_cli_shared_1.parseIndependentSubPackages)((0, uni_cli_shared_1.parsePagesJson)(inputDir, platform, false))
        : [];
    (0, independentUtils_1.initIndependentSubPackages)(independentPackages);
    independentPackages.forEach(({ root }) => {
        inputOptions[`${root}/common/main`] = (0, independentUtils_1.formatIndependentVirtualId)(independentUtils_1.INDEPENDENT_MAIN_PREFIX, root);
    });
    if (platform === 'mp-weixin' || platform === 'mp-alipay') {
        const pluginExports = getSubpackagePluginExports(inputDir);
        Object.keys(pluginExports).forEach((exportPath) => {
            inputOptions[exportPath] = pluginExports[exportPath];
        });
    }
    const manifestJson = (0, uni_cli_shared_1.parseManifestJsonOnce)(inputDir);
    const plugins = manifestJson[platform]?.plugins || {};
    Object.keys(plugins).forEach((name) => {
        const pluginExport = plugins[name].export;
        if (!pluginExport) {
            return;
        }
        const pluginExportFile = path_1.default.resolve(inputDir, pluginExport);
        if (!fs_1.default.existsSync(pluginExportFile)) {
            notFound(pluginExportFile);
        }
        inputOptions[(0, uni_cli_shared_1.removeExt)(pluginExport)] = pluginExportFile;
    });
    return inputOptions;
}
function isVueJs(id) {
    return id.includes(independentUtils_1.VUE_EXPORT_HELPER_ID);
}
const chunkFileNameBlackList = ['main', 'pages.json', 'manifest.json'];
function createMoveToVendorChunkFn() {
    // 云端编译时，不拆分文件
    if (process.env.UNI_COMPILE_TARGET === 'uni_modules') {
        return undefined;
    }
    const cache = new Map();
    const inputDir = (0, uni_cli_shared_1.normalizePath)(process.env.UNI_INPUT_DIR);
    return (id, { getModuleInfo }) => {
        const independentRoot = (0, independentUtils_1.parseIndependentRoot)(id);
        const idWithoutIndependentRoot = independentRoot
            ? (0, independentUtils_1.withoutIndependentRoot)(id)
            : id;
        const normalizedId = (0, uni_cli_shared_1.normalizePath)(idWithoutIndependentRoot);
        const filename = normalizedId.split('?')[0];
        if (independentRoot && (0, independentUtils_1.isAppPagesJson)(filename, inputDir)) {
            const chunkName = resolveIndependentCommonChunkName(independentRoot, 'vendor');
            debugChunk(chunkName, normalizedId);
            return chunkName;
        }
        // 处理资源文件
        if (uni_cli_shared_1.DEFAULT_ASSETS_RE.test(filename)) {
            const chunkName = independentRoot
                ? resolveIndependentCommonChunkName(independentRoot, 'assets')
                : 'common/assets';
            debugChunk(chunkName, normalizedId);
            return chunkName;
        }
        // 处理项目内的js,ts文件
        if (uni_cli_shared_1.EXTNAME_JS_RE.test(filename)) {
            if (filename.startsWith(inputDir) && !filename.includes('node_modules')) {
                const chunkFileName = (0, uni_cli_shared_1.removeExt)((0, uni_cli_shared_1.normalizePath)(path_1.default.relative(inputDir, filename)));
                // uni_modules中的workers需要合并到根目录workers目录
                const workerChunkName = resolveWorkerChunkName(chunkFileName);
                if (workerChunkName) {
                    return workerChunkName;
                }
                if (!chunkFileNameBlackList.includes(chunkFileName) &&
                    !(0, uni_cli_shared_1.hasJsonFile)(chunkFileName) // 无同名的page,component
                ) {
                    const normalizedChunkFileName = independentRoot
                        ? resolveIndependentCommonChunkName(independentRoot, chunkFileName)
                        : chunkFileName;
                    debugChunk(normalizedChunkFileName, normalizedId);
                    return normalizedChunkFileName;
                }
                return;
            }
            if (independentRoot) {
                const chunkName = resolveIndependentCommonChunkName(independentRoot, 'vendor');
                debugChunk(chunkName, normalizedId);
                return chunkName;
            }
            const { hasOptimizationSubPackages, subPackages } = (0, entry_1.getSubPackages)();
            // 处理子包引用的 node_modules 中的文件
            if (hasOptimizationSubPackages &&
                subPackages.length &&
                filename.startsWith(inputDir) &&
                filename.includes('node_modules') &&
                !filename.startsWith(inputDir + '/node_modules')) {
                const moduleInfo = getModuleInfo(id);
                if (!moduleInfo || !moduleInfo.importers.length) {
                    return;
                }
                const matchSubPackages = new Set(subPackages.filter((subPackagePath) => moduleInfo.importers.some((importer) => importer.startsWith(inputDir + '/' + subPackagePath))));
                if (matchSubPackages.size === 1) {
                    return `${matchSubPackages.values().next().value}common/vendor`;
                }
            }
            // 非项目内的 js 资源，均打包到 vendor
            debugChunk('common/vendor', normalizedId);
            return 'common/vendor';
        }
        if (isVueJs(normalizedId) ||
            (normalizedId.includes('node_modules') &&
                !(0, uni_cli_shared_1.isCSSRequest)(normalizedId) &&
                // 使用原始路径，格式化的可能找不到模块信息 https://github.com/dcloudio/uni-app/issues/3425
                staticImportedByEntry(id, getModuleInfo, cache))) {
            const chunkName = independentRoot
                ? resolveIndependentCommonChunkName(independentRoot, 'vendor')
                : 'common/vendor';
            debugChunk(chunkName, id);
            return chunkName;
        }
    };
}
function resolveIndependentCommonChunkName(root, chunkName) {
    const normalizedRoot = (0, uni_cli_shared_1.normalizePath)(root).replace(/\/$/, '');
    const normalizedChunkName = (0, uni_cli_shared_1.normalizePath)(chunkName);
    if (normalizedChunkName.startsWith(`${normalizedRoot}/common/`)) {
        return normalizedChunkName;
    }
    const relativeChunkName = normalizedChunkName.startsWith(`${normalizedRoot}/`)
        ? normalizedChunkName.slice(normalizedRoot.length + 1)
        : normalizedChunkName;
    return `${normalizedRoot}/common/${relativeChunkName}`;
}
function resolveWorkerChunkName(chunkFileName) {
    if (chunkFileName.startsWith('uni_modules') &&
        chunkFileName.includes('/workers/') &&
        (0, uni_cli_shared_1.getWorkersRootDirs)().some((dir) => chunkFileName.startsWith(dir))) {
        const workerRootDir = (0, uni_cli_shared_1.resolveWorkersRootDir)();
        return `${workerRootDir}/${chunkFileName}`;
    }
}
function staticImportedByEntry(id, getModuleInfo, cache, importStack = []) {
    if (cache.has(id)) {
        return cache.get(id);
    }
    if (importStack.includes(id)) {
        // circular deps!
        cache.set(id, false);
        return false;
    }
    const mod = getModuleInfo(id);
    if (!mod) {
        cache.set(id, false);
        return false;
    }
    if (mod.isEntry) {
        cache.set(id, true);
        return true;
    }
    const someImporterIs = mod.importers.some((importer) => staticImportedByEntry(importer, getModuleInfo, cache, importStack.concat(id)));
    cache.set(id, someImporterIs);
    return someImporterIs;
}
function createChunkFileNames(inputDir) {
    return function chunkFileNames(chunk) {
        if (chunk.isDynamicEntry && chunk.facadeModuleId) {
            let id = chunk.facadeModuleId;
            let independentRoot = (0, independentUtils_1.parseIndependentRoot)(id);
            id = independentRoot ? (0, independentUtils_1.withoutIndependentRoot)(id) : id;
            let isMiniProgramEntry = false;
            if ((0, entry_1.isUniPageUrl)(id)) {
                const { filepath, root } = (0, entry_1.parseVirtualPagePathInfo)(id);
                independentRoot = independentRoot || root;
                id = path_1.default.resolve(process.env.UNI_INPUT_DIR, filepath);
                isMiniProgramEntry = true;
            }
            else if ((0, entry_1.isUniComponentUrl)(id)) {
                const { filepath, root } = (0, entry_1.parseVirtualComponentPathInfo)(id);
                independentRoot = independentRoot || root;
                id = path_1.default.resolve(process.env.UNI_INPUT_DIR, filepath);
                isMiniProgramEntry = true;
            }
            if ((0, uni_cli_shared_1.getWorkersRootDirs)().length) {
                const normalizedId = (0, uni_cli_shared_1.normalizePath)(id);
                const filename = normalizedId.split('?')[0];
                const chunkFileName = (0, uni_cli_shared_1.removeExt)((0, uni_cli_shared_1.normalizePath)(path_1.default.relative(inputDir, filename)));
                // uni_modules中的workers需要合并到根目录workers目录
                const workerChunkName = resolveWorkerChunkName(chunkFileName);
                if (workerChunkName) {
                    return workerChunkName + '.js';
                }
            }
            if (independentRoot && !isMiniProgramEntry) {
                const filename = (0, uni_cli_shared_1.normalizePath)(id).split('?')[0];
                const chunkFileName = (0, uni_cli_shared_1.removeExt)((0, uni_cli_shared_1.normalizeMiniProgramFilename)(filename, inputDir));
                return (resolveIndependentCommonChunkName(independentRoot, chunkFileName) +
                    '.js');
            }
            return (0, uni_cli_shared_1.removeExt)((0, uni_cli_shared_1.normalizeMiniProgramFilename)(id, inputDir)) + '.js';
        }
        const independentRoot = findIndependentChunkRoot(chunk);
        if (independentRoot) {
            return (resolveIndependentCommonChunkName(independentRoot, chunk.name) + '.js');
        }
        return '[name].js';
    };
}
function findIndependentChunkRoot(chunk) {
    return chunk.moduleIds?.map(independentUtils_1.parseIndependentRoot).find(Boolean);
}
function notFound(filename) {
    console.log();
    console.error(uni_cli_shared_1.M['file.notfound'].replace('{file}', filename));
    console.log();
    process.exit(0);
}
exports.notFound = notFound;
