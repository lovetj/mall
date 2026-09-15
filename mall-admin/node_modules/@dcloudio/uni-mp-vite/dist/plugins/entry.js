"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniEntryPlugin = exports.getSubPackages = exports.parseComponentStyleIsolation = exports.isUniComponentUrl = exports.isUniPageUrl = exports.parseVirtualComponentPathInfo = exports.parseVirtualPagePathInfo = exports.parseVirtualComponentPath = exports.parseVirtualPagePath = exports.virtualComponentPath = exports.virtualPagePath = void 0;
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const independentUtils_1 = require("./independentUtils");
const uniPagePrefix = 'uniPage://';
const uniComponentPrefix = 'uniComponent://';
function virtualPagePath(filepath, root) {
    return uniPagePrefix + encodeVirtualFileInfo(filepath, root);
}
exports.virtualPagePath = virtualPagePath;
function virtualComponentPath(filepath, root) {
    return uniComponentPrefix + encodeVirtualFileInfo(filepath, root);
}
exports.virtualComponentPath = virtualComponentPath;
function parseVirtualPagePath(uniPageUrl) {
    return parseVirtualPagePathInfo(uniPageUrl).filepath;
}
exports.parseVirtualPagePath = parseVirtualPagePath;
function parseVirtualComponentPath(uniComponentUrl) {
    return parseVirtualComponentPathInfo(uniComponentUrl).filepath;
}
exports.parseVirtualComponentPath = parseVirtualComponentPath;
function parseVirtualPagePathInfo(uniPageUrl) {
    return decodeVirtualFileInfo(uniPageUrl, uniPagePrefix);
}
exports.parseVirtualPagePathInfo = parseVirtualPagePathInfo;
function parseVirtualComponentPathInfo(uniComponentUrl) {
    return decodeVirtualFileInfo(uniComponentUrl, uniComponentPrefix);
}
exports.parseVirtualComponentPathInfo = parseVirtualComponentPathInfo;
function isUniPageUrl(id) {
    return id.startsWith(uniPagePrefix);
}
exports.isUniPageUrl = isUniPageUrl;
function isUniComponentUrl(id) {
    return id.startsWith(uniComponentPrefix);
}
exports.isUniComponentUrl = isUniComponentUrl;
const styleIsolationRE = [
    /defineOptions\s*[\s\S]*?styleIsolation\s*:\s*['"](isolated|apply-shared|shared)['"]/,
    /export\s+default\s+[\s\S]*?styleIsolation\s*:\s*['|"](isolated|apply-shared|shared)['|"]/,
];
function parseComponentStyleIsolation(content) {
    for (const regex of styleIsolationRE) {
        const matches = content.match(regex);
        if (matches) {
            return matches[1];
        }
    }
}
exports.parseComponentStyleIsolation = parseComponentStyleIsolation;
let hasOptimizationSubPackages = false; // 是否开启分包优化配置
let subPackages = [];
function initSubPackages() {
    const inputDir = (0, uni_cli_shared_1.normalizePath)(process.env.UNI_INPUT_DIR);
    const pagesJsonFile = path_1.default.resolve(inputDir, 'pages.json');
    if (!fs_1.default.existsSync(pagesJsonFile)) {
        hasOptimizationSubPackages = false;
        subPackages = [];
        return;
    }
    const platform = process.env.UNI_PLATFORM;
    const manifestJson = (0, uni_cli_shared_1.parseManifestJsonOnce)(inputDir);
    hasOptimizationSubPackages =
        platform && manifestJson[platform]?.optimization?.subPackages;
    const { appJson } = (0, uni_cli_shared_1.parseMiniProgramPagesJson)(fs_1.default.readFileSync(pagesJsonFile, 'utf8'), platform, { subpackages: true });
    subPackages = Object.values(appJson.subPackages || appJson.subpackages || {})
        .filter(Boolean)
        .map(({ root }) => `${root.replace(/\/$/, '')}/`);
}
function getSubPackages() {
    return {
        hasOptimizationSubPackages,
        subPackages,
    };
}
exports.getSubPackages = getSubPackages;
function uniEntryPlugin({ global, template, style, }) {
    const inputDir = process.env.UNI_INPUT_DIR;
    const manifestJson = (0, uni_cli_shared_1.parseManifestJsonOnce)(inputDir);
    const platformOptions = manifestJson[process.env.UNI_PLATFORM] || {};
    const easycomEncryptComponentPaths = new Set();
    return {
        name: 'uni:virtual',
        enforce: 'pre',
        resolveId(id) {
            if (isUniPageUrl(id) || isUniComponentUrl(id)) {
                return id;
            }
        },
        buildStart() {
            easycomEncryptComponentPaths.clear();
            initSubPackages();
        },
        load(id) {
            if (isUniPageUrl(id)) {
                const { filepath: pageFilepath, root } = parseVirtualPagePathInfo(id);
                const filepath = (0, uni_cli_shared_1.normalizePath)(path_1.default.resolve(inputDir, pageFilepath));
                this.addWatchFile(filepath);
                return {
                    code: `${genIndependentCreateImport('createPage', '__uniCreatePage', root)}import MiniProgramPage from '${root ? (0, independentUtils_1.withIndependentRoot)(filepath, root) : filepath}'
${root ? '__uniCreatePage' : `${global}.createPage`}(MiniProgramPage)`,
                };
            }
            else if (isUniComponentUrl(id)) {
                const { filepath: componentFilepath, root } = parseVirtualComponentPathInfo(id);
                const filepath = (0, uni_cli_shared_1.normalizePath)(path_1.default.resolve(inputDir, componentFilepath));
                this.addWatchFile(filepath);
                const relativePath = (0, uni_cli_shared_1.normalizePath)(path_1.default.relative(inputDir, filepath));
                // 判断当前插件是否是easycom加密插件
                if (relativePath.startsWith('uni_modules')) {
                    const pluginId = relativePath.split('/')[1];
                    const encryptType = (0, uni_cli_shared_1.getUniModulesEncryptType)(pluginId);
                    if (encryptType === 'easycom') {
                        const componentName = (0, uni_cli_shared_1.capitalize)((0, uni_cli_shared_1.camelize)((0, uni_cli_shared_1.removeExt)(path_1.default.basename(relativePath))));
                        easycomEncryptComponentPaths.add((0, uni_cli_shared_1.removeExt)(relativePath));
                        return {
                            code: `import { defineComponent${componentName} } from '@/uni_modules/${pluginId}?uni_helpers'
  defineComponent${componentName}()`,
                        };
                    }
                }
                const json = {
                    component: true,
                    styleIsolation: undefined,
                };
                if (process.env.UNI_PLATFORM === 'mp-alipay') {
                    json.styleIsolation =
                        parseComponentStyleIsolation(fs_1.default.readFileSync(filepath, 'utf-8')) ||
                            platformOptions.styleIsolation ||
                            'apply-shared';
                }
                // 微信小程序json文件中的styleIsolation优先级比options中的高，为了兼容旧版本，不能设置默认值，并且只有在manifest.json中配置styleIsolation才会静态分析组件的styleIsolation
                if (process.env.UNI_PLATFORM === 'mp-weixin') {
                    if (platformOptions.styleIsolation) {
                        json.styleIsolation =
                            parseComponentStyleIsolation(fs_1.default.readFileSync(filepath, 'utf-8')) || platformOptions.styleIsolation;
                    }
                }
                (0, uni_cli_shared_1.addMiniProgramComponentJson)((0, uni_cli_shared_1.removeExt)((0, uni_cli_shared_1.normalizeMiniProgramFilename)(filepath, inputDir)), json);
                if (process.env.UNI_COMPILE_TARGET === 'uni_modules') {
                    // 云编译时，组件的代码会直接内联到入口文件中，以方法对外导出，不能立刻执行createComponent
                    return {
                        code: `import Component from '${filepath}'
export default Component`,
                    };
                }
                return {
                    code: `${genIndependentCreateImport('createComponent', '__uniCreateComponent', root)}import Component from '${root ? (0, independentUtils_1.withIndependentRoot)(filepath, root) : filepath}'
${root ? '__uniCreateComponent' : `${global}.createComponent`}(Component)`,
                };
            }
        },
        generateBundle() {
            const cacheDir = process.env.UNI_MODULES_ENCRYPT_CACHE_DIR;
            if (cacheDir) {
                for (const componentPath of easycomEncryptComponentPaths) {
                    const componentCachePath = path_1.default.resolve(cacheDir, componentPath);
                    ['.json', template.extname, style.extname].forEach((extname) => {
                        const filename = componentCachePath + extname;
                        if (fs_1.default.existsSync(filename)) {
                            this.emitFile({
                                fileName: componentPath + extname,
                                type: 'asset',
                                source: fs_1.default.readFileSync(filename, 'utf-8'),
                            });
                        }
                    });
                }
            }
        },
    };
}
exports.uniEntryPlugin = uniEntryPlugin;
function genIndependentCreateImport(name, alias, root) {
    return root
        ? `import { ${name} as ${alias} } from ${JSON.stringify((0, independentUtils_1.withIndependentRoot)(independentUtils_1.UNI_MP_RUNTIME_ID, root))}
`
        : '';
}
function encodeVirtualFileInfo(filepath, root) {
    return (0, uni_cli_shared_1.encodeBase64Url)(root ? JSON.stringify({ filepath, root }) : filepath);
}
function decodeVirtualFileInfo(url, prefix) {
    const decoded = (0, uni_cli_shared_1.decodeBase64Url)(url.replace(prefix, ''));
    if (decoded[0] === '{') {
        try {
            const info = JSON.parse(decoded);
            if (info && typeof info.filepath === 'string') {
                return {
                    filepath: info.filepath,
                    root: typeof info.root === 'string' ? info.root : undefined,
                };
            }
        }
        catch (e) {
            // 非 JSON 编码时按旧格式处理
        }
    }
    return { filepath: decoded };
}
