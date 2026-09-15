"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.transformIndependentMiniProgramComponentJs = exports.normalizeCopyOptions = void 0;
const path_1 = __importDefault(require("path"));
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const independentUtils_1 = require("../plugins/independentUtils");
function normalizeCopyOptions(copyOptions, options) {
    const componentDir = options.template.component?.dir;
    if (!options.app.independentSubpackages || !componentDir) {
        return copyOptions;
    }
    const assets = copyOptions.assets || [];
    const componentAssets = assets.filter((asset) => isMiniProgramComponentCopyAsset(asset, componentDir));
    if (!componentAssets.length) {
        return copyOptions;
    }
    return {
        ...copyOptions,
        assets: assets.filter((asset) => !isMiniProgramComponentCopyAsset(asset, componentDir)),
        targets: [
            {
                src: componentAssets,
                get dest() {
                    return process.env.UNI_OUTPUT_DIR;
                },
                transform(source, filename) {
                    return transformIndependentMiniProgramComponentJs(source, filename, {
                        componentDir,
                        independentRoots: (0, independentUtils_1.getIndependentSubPackages)().map(({ root }) => root),
                        inputDir: process.env.UNI_INPUT_DIR,
                    });
                },
            },
            ...(copyOptions.targets || []),
        ],
    };
}
exports.normalizeCopyOptions = normalizeCopyOptions;
function isMiniProgramComponentCopyAsset(asset, componentDir) {
    const normalizedAsset = (0, uni_cli_shared_1.normalizePath)(asset);
    const normalizedComponentDir = (0, uni_cli_shared_1.normalizePath)(componentDir).replace(/^\/+|\/+$/g, '');
    return (normalizedAsset === normalizedComponentDir ||
        normalizedAsset === `uni_modules/*/${normalizedComponentDir}/**/*` ||
        normalizedAsset.endsWith(`/${normalizedComponentDir}`) ||
        normalizedAsset.endsWith(`/uni_modules/*/${normalizedComponentDir}/**/*`));
}
function transformIndependentMiniProgramComponentJs(source, filename, { componentDir, independentRoots, inputDir, }) {
    if (!inputDir || path_1.default.extname(filename) !== '.js') {
        return;
    }
    const relativeFilename = (0, uni_cli_shared_1.normalizePath)(path_1.default.relative(inputDir, filename));
    const independentRoot = findIndependentRoot(relativeFilename, independentRoots);
    if (!independentRoot ||
        !isIndependentMiniProgramComponentJs(relativeFilename, independentRoot, componentDir)) {
        return;
    }
    const vendorFilename = `${independentRoot}/common/vendor.js`;
    const vendorRequirePath = (0, uni_cli_shared_1.relativeFile)(relativeFilename, vendorFilename);
    const code = Buffer.isBuffer(source) ? source.toString() : source;
    if (hasVendorRequire(code, vendorRequirePath)) {
        return code;
    }
    // 独立分包原生组件注册前必须加载当前 root 的 runtime，确保 u-p 能找到同一份 props 缓存。
    return injectRequireCode(code, `require('${vendorRequirePath}');\n`);
}
exports.transformIndependentMiniProgramComponentJs = transformIndependentMiniProgramComponentJs;
function findIndependentRoot(filename, roots) {
    return roots
        .map((root) => (0, uni_cli_shared_1.normalizePath)(root).replace(/^\/+|\/+$/g, ''))
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)
        .find((root) => filename.startsWith(root + '/'));
}
function isIndependentMiniProgramComponentJs(filename, root, componentDir) {
    const filenameInRoot = filename.slice(root.length + 1);
    const normalizedComponentDir = (0, uni_cli_shared_1.normalizePath)(componentDir).replace(/^\/+|\/+$/g, '');
    return (filenameInRoot.startsWith(normalizedComponentDir + '/') ||
        new RegExp(`^uni_modules/[^/]+/${escapeRegExp(normalizedComponentDir)}/`).test(filenameInRoot));
}
function hasVendorRequire(code, vendorRequirePath) {
    const escapedPath = escapeRegExp(vendorRequirePath);
    return new RegExp(String.raw `\brequire\(\s*['"]${escapedPath}['"]\s*\)`).test(code);
}
function injectRequireCode(code, requireCode) {
    const strictDirectiveMatch = code.match(/^((?:\s*['"]use strict['"];?\s*)+)/);
    if (strictDirectiveMatch) {
        const index = strictDirectiveMatch[0].length;
        return code.slice(0, index) + requireCode + code.slice(index);
    }
    return requireCode + code;
}
function escapeRegExp(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
