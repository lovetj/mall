"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniPagesJsonPlugin = exports.getNVueCssPaths = void 0;
const path_1 = __importDefault(require("path"));
const debug_1 = __importDefault(require("debug"));
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const entry_1 = require("./entry");
const uni_i18n_1 = require("@dcloudio/uni-i18n");
const shared_1 = require("@vue/shared");
const independentUtils_1 = require("./independentUtils");
const debugPagesJson = (0, debug_1.default)('uni:pages-json');
const nvueCssPathsCache = new Map();
function getNVueCssPaths(config) {
    return nvueCssPathsCache.get(config);
}
exports.getNVueCssPaths = getNVueCssPaths;
function uniPagesJsonPlugin(options) {
    let resolvedConfig;
    const platform = process.env.UNI_PLATFORM;
    const inputDir = process.env.UNI_INPUT_DIR;
    const pagesJsonPath = path_1.default.resolve(inputDir, 'pages.json');
    return (0, uni_cli_shared_1.defineUniPagesJsonPlugin)((opts) => {
        let allPagePaths = [];
        let isFirst = true;
        let pagesJsonState;
        const parsePagesJsonState = (code, signature) => {
            if (process.env.UNI_APP_X === 'true') {
                // 调整换行符，确保 parseTree 的loc正确
                const jsonCode = code.replace(/\r\n/g, '\n');
                (0, uni_cli_shared_1.checkPagesJson)((0, uni_cli_shared_1.preUVueJson)(jsonCode, 'pages.json'), process.env.UNI_INPUT_DIR);
            }
            const manifestJson = (0, uni_cli_shared_1.parseManifestJsonOnce)(inputDir);
            const parsePagesJsonOptions = {
                debug: !!manifestJson.debug,
                darkmode: options.app.darkmode,
                networkTimeout: manifestJson.networkTimeout,
                subpackages: !!options.app.subpackages,
                ...options.json,
                independentSubpackages: !!options.app.independentSubpackages,
            };
            const { appJson, pageJsons, nvuePages } = (0, uni_cli_shared_1.parseMiniProgramPagesJson)(code, platform, parsePagesJsonOptions);
            // add source
            (0, uni_cli_shared_1.mergeMiniProgramAppJson)(appJson, manifestJson[platform], options.project?.source ?? {});
            if (process.env.UNI_APP_X === 'true') {
                // 当前平台支持workers，且manifest.json中配置了workers，则合并workers配置
                if (options.app.workers && Object.keys((0, uni_cli_shared_1.getWorkers)()).length) {
                    // 如果没有配置，则默认为workers目录
                    appJson.workers = manifestJson.workers || 'workers';
                }
                if ((0, shared_1.isPlainObject)(appJson.workers) && appJson.workers.path) {
                    // 微信小程序测试对象结构的话，如果isSubpackage是false，会报找不到
                    // 故：只有isSubpackage为true保持对象结构，否则用字符串
                    if (!appJson.workers.isSubpackage) {
                        appJson.workers = appJson.workers.path;
                    }
                }
            }
            if (options.json?.formatAppJson) {
                options.json.formatAppJson(appJson, manifestJson, pageJsons);
            }
            // 使用 once 获取的话，可以节省编译时间，但 i18n 内容发生变化时，pages.json 不会自动更新
            const i18nOptions = (0, uni_cli_shared_1.initI18nOptionsOnce)(platform, inputDir, false, true);
            if (i18nOptions) {
                const { locale, locales, delimiters } = i18nOptions;
                (0, uni_i18n_1.parseI18nJson)(appJson, locales[locale], delimiters);
                (0, uni_i18n_1.parseI18nJson)(pageJsons, locales[locale], delimiters);
            }
            const { normalize } = options.app;
            const normalizedAppJson = normalize ? normalize(appJson) : appJson;
            return {
                signature,
                appJson,
                pageJsons,
                nvuePages,
                normalizedAppJson,
            };
        };
        const applyPagesJsonState = ({ normalizedAppJson, pageJsons, nvuePages, }) => {
            if (resolvedConfig) {
                nvueCssPathsCache.set(resolvedConfig, nvuePages.map((pagePath) => pagePath + options.style.extname));
            }
            const independentUpdate = (0, independentUtils_1.updateIndependentSubPackages)(options.app.independentSubpackages
                ? (0, uni_cli_shared_1.parseIndependentSubPackages)(normalizedAppJson)
                : []);
            if (independentUpdate.rootsChanged) {
                console.warn(uni_cli_shared_1.M['dev.watching.restart.independentSubPackages']);
                process.exit(0);
            }
            (0, uni_cli_shared_1.addMiniProgramAppJson)(normalizedAppJson);
            allPagePaths = [];
            Object.keys(pageJsons).forEach((name) => {
                if (isNormalPage(name)) {
                    (0, uni_cli_shared_1.addMiniProgramPageJson)(name, pageJsons[name]);
                    allPagePaths.push(name);
                }
            });
        };
        const ensurePagesJsonState = (code) => {
            const signature = createPagesJsonSignature(code);
            if (pagesJsonState?.signature === signature) {
                return pagesJsonState;
            }
            const state = parsePagesJsonState(code, signature);
            applyPagesJsonState(state);
            pagesJsonState = state;
            return state;
        };
        return {
            name: 'uni:mp-pages-json',
            enforce: 'pre',
            configResolved(config) {
                resolvedConfig = config;
            },
            transform(code, id) {
                if (process.env.UNI_APP_X === 'true') {
                    if (isFirst && allPagePaths.length) {
                        const { filename } = (0, uni_cli_shared_1.parseVueRequest)(id);
                        if (filename.endsWith('.vue') || filename.endsWith('.uvue')) {
                            const vueFilename = (0, uni_cli_shared_1.removeExt)((0, uni_cli_shared_1.normalizePath)(path_1.default.relative(process.env.UNI_INPUT_DIR, filename)));
                            // 项目内的
                            if (!vueFilename.startsWith('.')) {
                                // const index = allPagePaths.indexOf(pagePath)
                                // if (index > -1) {
                                if ((0, uni_cli_shared_1.runByHBuilderX)()) {
                                    console.log(`当前工程${allPagePaths.length}个页面，正在编译${vueFilename}...${'\u200D'}`);
                                }
                                // }
                            }
                        }
                    }
                }
                if (!opts.filter(id)) {
                    return null;
                }
                this.addWatchFile(pagesJsonPath);
                (0, uni_cli_shared_1.getLocaleFiles)(path_1.default.resolve(inputDir, 'locale')).forEach((filepath) => {
                    this.addWatchFile(filepath);
                });
                const pagesRoot = parseRootScopedPagesJsonRoot(id, inputDir);
                const { appJson } = ensurePagesJsonState(code);
                return {
                    code: pagesRoot
                        ? importPagesCode(appJson, pagesRoot)
                        : `import './${uni_cli_shared_1.MANIFEST_JSON_JS}'\n` + importPagesCode(appJson),
                    map: { mappings: '' },
                };
            },
            generateBundle() {
                (0, uni_cli_shared_1.findChangedJsonFiles)(options.app.usingComponents).forEach((value, key) => {
                    debugPagesJson('json.changed', key);
                    this.emitFile({
                        type: 'asset',
                        fileName: key + '.json',
                        source: value,
                    });
                });
            },
            buildEnd() {
                isFirst = false;
            },
        };
    });
}
exports.uniPagesJsonPlugin = uniPagesJsonPlugin;
/**
 * 字节跳动小程序可以配置 ext:// 开头的插件页面模板，如 ext://microapp-trade-plugin/order-confirm
 * @param pagePath
 * @returns
 */
function isNormalPage(pagePath) {
    return !pagePath.startsWith('ext://');
}
function createPagesJsonSignature(code) {
    // 只缓存轻量签名，避免大体积 pages.json 在多个 root 入口间重复保留完整内容。
    return `${code.length}:${(0, uni_cli_shared_1.hash)(code)}`;
}
// pages.json 的 usingComponents 会影响模板编译；当前不把 JSON hash 放进虚拟 id，
// 因此开发期仅修改 usingComponents 暂不会强制已编译页面重编，后续需统一设计 invalidate。
function importPagesCode(pagesJson, scopeRoot) {
    const importPagesCode = [];
    function importPageCode(pagePath, root) {
        if (!isNormalPage(pagePath)) {
            return;
        }
        const pagePathWithExtname = (0, uni_cli_shared_1.normalizePagePath)(pagePath, process.env.UNI_PLATFORM);
        if (pagePathWithExtname) {
            importPagesCode.push(`import('${(0, entry_1.virtualPagePath)(pagePathWithExtname, root)}')`);
        }
    }
    if (!scopeRoot) {
        pagesJson.pages.forEach((pagePath) => importPageCode(pagePath));
    }
    if (pagesJson.subPackages) {
        pagesJson.subPackages.forEach(({ root, pages, independent }) => {
            const subPackageRoot = (0, uni_cli_shared_1.normalizePath)(root).replace(/\/$/, '');
            if (scopeRoot && subPackageRoot !== scopeRoot) {
                return;
            }
            pages &&
                pages.forEach((pagePath) => importPageCode((0, uni_cli_shared_1.normalizePath)(path_1.default.join(subPackageRoot, pagePath)), independent ? subPackageRoot : undefined));
        });
    }
    let workerCode = [];
    if (!scopeRoot && process.env.UNI_APP_X === 'true') {
        const workers = (0, uni_cli_shared_1.getWorkers)();
        workerCode = Object.keys(workers).map((key) => {
            return `import('@/${key}')`;
        });
    }
    return `if(!Math){
${importPagesCode.join('\n')}
${workerCode.join('\n')}
}`;
}
function parseRootScopedPagesJsonRoot(id, inputDir) {
    const root = (0, independentUtils_1.parseIndependentRoot)(id);
    if (!root) {
        return;
    }
    const idWithoutRoot = (0, independentUtils_1.withoutIndependentRoot)(id);
    if (isPagesJsonJs(idWithoutRoot, inputDir)) {
        return root;
    }
}
function isPagesJsonJs(id, inputDir) {
    const filename = id.split('?')[0];
    return (filename === uni_cli_shared_1.PAGES_JSON_JS ||
        (0, uni_cli_shared_1.normalizePath)(filename) ===
            (0, uni_cli_shared_1.normalizePath)(path_1.default.join(inputDir, uni_cli_shared_1.PAGES_JSON_JS)));
}
