"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniIndependentSubpackagePlugin = void 0;
const path_1 = __importDefault(require("path"));
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const independentUtils_1 = require("./independentUtils");
const independentMain_1 = require("./independentMain");
const INDEPENDENT_RUNTIME_FLAG = '__UNI_MP_INDEPENDENT_RUNTIME__';
function uniIndependentSubpackagePlugin(options) {
    const inputDir = process.env.UNI_INPUT_DIR;
    const alias = options.vite?.alias || {};
    const styleExtname = options.style.extname;
    return {
        name: independentUtils_1.INDEPENDENT_SUBPACKAGE_PLUGIN_NAME,
        enforce: 'pre',
        async resolveId(id, importer) {
            const independentRoots = (0, independentUtils_1.getIndependentRoots)();
            const explicitRoot = (0, independentUtils_1.parseIndependentRoot)(id);
            if (explicitRoot && independentRoots.has(explicitRoot)) {
                const idWithoutRoot = (0, independentUtils_1.withoutIndependentRoot)(id);
                if (idWithoutRoot === independentUtils_1.VUE_EXPORT_HELPER_ID) {
                    return id;
                }
                const resolved = await this.resolve(idWithoutRoot, importer && (0, independentUtils_1.withoutIndependentRoot)(importer));
                if (resolved && !resolved.external) {
                    return {
                        ...resolved,
                        id: (0, independentUtils_1.withIndependentRoot)(resolved.id, explicitRoot),
                    };
                }
                const aliased = resolveIndependentAlias(idWithoutRoot, alias);
                if (aliased) {
                    return (0, independentUtils_1.withIndependentRoot)(aliased, explicitRoot);
                }
            }
            const root = (0, independentUtils_1.parseIndependentMainRoot)(id);
            if (root && independentRoots.has(root)) {
                return id;
            }
            const importerRoot = resolveImporterIndependentRoot(importer, inputDir);
            if (importer &&
                importerRoot &&
                independentRoots.has(importerRoot) &&
                shouldResolveIndependentDependency(id)) {
                const importerWithoutRoot = (0, independentUtils_1.withoutIndependentRoot)(importer);
                const resolved = await this.resolve(id, importerWithoutRoot, {
                    skipSelf: true,
                });
                if (resolved && !resolved.external) {
                    validateIndependentDependency({
                        root: importerRoot,
                        source: id,
                        importer: importerWithoutRoot,
                        resolvedId: resolved.id,
                        inputDir,
                    });
                    if (shouldPropagateIndependentRoot(id)) {
                        return {
                            ...resolved,
                            id: (0, independentUtils_1.withIndependentRoot)(resolved.id, importerRoot),
                        };
                    }
                }
            }
        },
        load(id) {
            const independentRoots = (0, independentUtils_1.getIndependentRoots)();
            const explicitRoot = (0, independentUtils_1.parseIndependentRoot)(id);
            if (explicitRoot &&
                independentRoots.has(explicitRoot) &&
                (0, independentUtils_1.withoutIndependentRoot)(id) === independentUtils_1.VUE_EXPORT_HELPER_ID) {
                return {
                    code: generateVueExportHelperCode(),
                    map: { mappings: '' },
                };
            }
            const root = (0, independentUtils_1.parseIndependentMainRoot)(id);
            if (root && independentRoots.has(root)) {
                return {
                    code: generateIndependentMainCode(root, inputDir),
                    map: { mappings: '' },
                };
            }
        },
        transform(code, id) {
            const root = (0, independentUtils_1.parseIndependentRoot)(id);
            if (root &&
                (0, independentUtils_1.getIndependentRoots)().has(root) &&
                isMiniProgramRuntimeId((0, independentUtils_1.withoutIndependentRoot)(id)) &&
                code.includes(INDEPENDENT_RUNTIME_FLAG)) {
                return {
                    code: code.replace(new RegExp(`\\b${INDEPENDENT_RUNTIME_FLAG}\\b`, 'g'), 'true'),
                    map: { mappings: '' },
                };
            }
        },
        generateBundle: {
            order: 'post',
            handler(_, bundle) {
                (0, independentUtils_1.getIndependentSubPackages)().forEach((pkg) => {
                    emitIndependentBootstrap((file) => this.emitFile(file), bundle, pkg.root);
                    injectIndependentBootstrap(bundle, pkg.root);
                    relocateIndependentStyleChunks(bundle, pkg.root);
                    validateIndependentStyleAssets(bundle, pkg.root, styleExtname);
                    validateIndependentJsReferences(bundle, pkg.root);
                });
            },
        },
    };
}
exports.uniIndependentSubpackagePlugin = uniIndependentSubpackagePlugin;
function emitIndependentBootstrap(emitFile, bundle, root) {
    const fileName = resolveIndependentBootstrapFilename(root);
    if (bundle[fileName]) {
        return;
    }
    emitFile({
        type: 'asset',
        fileName,
        source: "require('./main.js');\n",
    });
}
function injectIndependentBootstrap(bundle, root) {
    const bootstrapFilename = resolveIndependentBootstrapFilename(root);
    Object.keys(bundle).forEach((name) => {
        const file = bundle[name];
        if (file.type !== 'chunk' || !shouldInjectBootstrap(file, root)) {
            return;
        }
        const requireCode = `require('${(0, uni_cli_shared_1.relativeFile)(file.fileName, bootstrapFilename)}');\n`;
        if (!file.code.startsWith(requireCode)) {
            file.code = requireCode + file.code;
        }
    });
}
function shouldInjectBootstrap(chunk, root) {
    const fileName = (0, uni_cli_shared_1.normalizePath)(chunk.fileName);
    const normalizedRoot = (0, uni_cli_shared_1.normalizePath)(root).replace(/\/$/, '');
    return (fileName.endsWith('.js') &&
        fileName.startsWith(`${normalizedRoot}/`) &&
        !fileName.startsWith(`${normalizedRoot}/common/`));
}
function resolveIndependentBootstrapFilename(root) {
    return `${(0, uni_cli_shared_1.normalizePath)(root).replace(/\/$/, '')}/common/index.js`;
}
function relocateIndependentStyleChunks(bundle, root) {
    Object.keys(bundle).forEach((name) => {
        const file = bundle[name];
        if (!isOutputChunk(file) ||
            !file.fileName.endsWith('.js') ||
            !isInIndependentOutputRoot(file.fileName, root)) {
            return;
        }
        file.code = replaceStaticRequire(file.code, (source) => {
            const resolved = resolveLocalOutputFilename(file.fileName, source);
            if (!resolved ||
                isInIndependentOutputRoot(resolved, root) ||
                !isRelocatableStyleChunk(bundle[resolved], resolved)) {
                return source;
            }
            const targetFilename = resolveIndependentCommonChunkFilename(root, path_1.default.basename(resolved));
            if (!bundle[targetFilename]) {
                bundle[targetFilename] = {
                    ...bundle[resolved],
                    fileName: targetFilename,
                };
            }
            return (0, uni_cli_shared_1.relativeFile)(file.fileName, targetFilename);
        });
    });
}
function validateIndependentJsReferences(bundle, root) {
    Object.keys(bundle).forEach((name) => {
        const file = bundle[name];
        if (!isOutputChunk(file) ||
            !file.fileName.endsWith('.js') ||
            !isInIndependentOutputRoot(file.fileName, root)) {
            return;
        }
        replaceStaticRequire(file.code, (source) => {
            const resolved = resolveLocalOutputFilename(file.fileName, source);
            if (resolved && !isInIndependentOutputRoot(resolved, root)) {
                throw new Error(`独立分包 "${root}" 的 JS 不能引用 root 外产物：${file.fileName} -> ${source}（${resolved}）。请将依赖移动到 "${root}" 内。`);
            }
            return source;
        });
    });
}
function replaceStaticRequire(code, replacer) {
    return code.replace(/\brequire\(\s*(['"])([^'"]+)\1\s*\)/g, (match, quote, source) => {
        const nextSource = replacer(source);
        return nextSource === source
            ? match
            : `require(${quote}${nextSource}${quote})`;
    });
}
function resolveLocalOutputFilename(importer, source) {
    if (!source.startsWith('.')) {
        return;
    }
    return (0, uni_cli_shared_1.normalizePath)(path_1.default.join(path_1.default.dirname(importer), source));
}
function isRelocatableStyleChunk(file, filename) {
    return (isOutputChunk(file) &&
        /(?:^|\/)[^/]+\.vue_vue_type_style_.*\.js$/.test(filename));
}
function resolveIndependentCommonChunkFilename(root, filename) {
    return `${(0, independentUtils_1.normalizeIndependentRoot)(root)}/common/${(0, uni_cli_shared_1.normalizePath)(filename)}`;
}
function resolveIndependentAlias(id, alias) {
    if (Array.isArray(alias)) {
        for (const item of alias) {
            if (typeof item.find === 'string' && item.find === id) {
                return item.replacement;
            }
        }
        return;
    }
    return alias[id];
}
function validateIndependentStyleAssets(bundle, root, extname) {
    Object.keys(bundle).forEach((filename) => {
        const asset = bundle[filename];
        if (!isOutputAsset(asset) ||
            !filename.endsWith(extname) ||
            !isInIndependentOutputRoot(filename, root)) {
            return;
        }
        validateIndependentStyleReferences(root, (0, uni_cli_shared_1.normalizePath)(filename), asset.source.toString(), extname);
    });
}
function validateIndependentStyleReferences(root, filename, source, extname) {
    replaceStyleReferences(source, (reference) => {
        const resolved = resolveStyleReferenceFilename(filename, reference);
        if (!resolved) {
            return reference;
        }
        const appStyleFilename = resolveAppStyleFilename(extname);
        if (resolved.filename === appStyleFilename) {
            throw new Error(`独立分包 "${root}" 的样式不能引用主包 ${appStyleFilename}：${filename} -> ${reference}。请将公共样式移动到 "${root}" 内。`);
        }
        if (!isInIndependentOutputRoot(resolved.filename, root)) {
            throw new Error(`独立分包 "${root}" 的样式不能引用 root 外资源：${filename} -> ${reference}。请将该资源移动到 "${root}" 内。`);
        }
        return reference;
    });
}
function replaceStyleReferences(source, replacer) {
    return source
        .replace(/@import\s+(?:"([^"]+)"|'([^']+)'|(?!url\s*\()([^;\s]+))/gi, (match, doubleQuote, singleQuote, raw) => replaceStyleReference(match, doubleQuote || singleQuote || raw, replacer))
        .replace(/\burl\(\s*(?:"([^"]*)"|'([^']*)'|([^'")]*?))\s*\)/gi, (match, doubleQuote, singleQuote, raw) => replaceStyleReference(match, doubleQuote || singleQuote || raw, replacer));
}
function replaceStyleReference(match, reference, replacer) {
    const nextReference = replacer(reference.trim());
    return nextReference === reference.trim()
        ? match
        : match.replace(reference, nextReference);
}
function resolveStyleReferenceFilename(filename, reference) {
    if (isExternalStyleReference(reference)) {
        return;
    }
    const { pathname, suffix } = splitStyleReference(reference);
    if (!pathname) {
        return;
    }
    const resolvedFilename = pathname.startsWith('/')
        ? (0, uni_cli_shared_1.normalizePath)(pathname).replace(/^\/+/, '')
        : (0, uni_cli_shared_1.normalizePath)(path_1.default.join(path_1.default.dirname(filename), pathname));
    return {
        filename: resolvedFilename,
        suffix,
    };
}
function splitStyleReference(reference) {
    const match = reference.match(/^([^?#]*)([?#].*)?$/);
    return {
        pathname: match ? match[1] : reference,
        suffix: (match && match[2]) || '',
    };
}
function isExternalStyleReference(reference) {
    const normalized = reference.trim();
    return (!normalized ||
        normalized.startsWith('#') ||
        normalized.startsWith('//') ||
        normalized.startsWith('var(') ||
        /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(normalized));
}
function isInIndependentOutputRoot(filename, root) {
    const normalizedFilename = (0, uni_cli_shared_1.normalizePath)(filename);
    const normalizedRoot = (0, independentUtils_1.normalizeIndependentRoot)(root);
    return (normalizedFilename === normalizedRoot ||
        normalizedFilename.startsWith(`${normalizedRoot}/`));
}
function isOutputAsset(file) {
    return !!file && file.type === 'asset';
}
function isOutputChunk(file) {
    return !!file && file.type === 'chunk';
}
function resolveAppStyleFilename(extname) {
    return `app${extname}`;
}
function resolveImporterIndependentRoot(importer, inputDir) {
    if (!importer) {
        return;
    }
    return ((0, independentUtils_1.parseIndependentRoot)(importer) ||
        (0, independentUtils_1.getIndependentRootByFilename)((0, independentUtils_1.withoutIndependentRoot)(importer), inputDir));
}
function validateIndependentDependency({ root, source, importer, resolvedId, inputDir, }) {
    const normalizedInputDir = (0, uni_cli_shared_1.normalizePath)(inputDir);
    const importerFile = normalizeFileId(importer);
    if (!(0, independentUtils_1.isInIndependentRoot)(importerFile, normalizedInputDir, root)) {
        return;
    }
    const resolvedFile = normalizeFileId((0, independentUtils_1.withoutIndependentRoot)(resolvedId));
    if (!isProjectFile(resolvedFile, normalizedInputDir) ||
        isAllowedProjectDependency(resolvedFile, normalizedInputDir) ||
        (0, independentUtils_1.isInIndependentRoot)(resolvedFile, normalizedInputDir, root)) {
        return;
    }
    throw new Error(`独立分包 "${root}" 不能引用 root 外依赖：${(0, uni_cli_shared_1.normalizePath)(path_1.default.relative(normalizedInputDir, resolvedFile))}。来源：${(0, uni_cli_shared_1.normalizePath)(path_1.default.relative(normalizedInputDir, importerFile))} -> ${source}。请将该依赖移动到 "${root}" 内。`);
}
function isProjectFile(filename, inputDir) {
    return filename === inputDir || filename.startsWith(`${inputDir}/`);
}
function isAllowedProjectDependency(filename, inputDir) {
    // pages.json 是 app 级配置文件，允许独立分包读取；实际模块仍会追加 root query，避免产物落到主包 common。
    return (filename.includes('/node_modules/') || (0, independentUtils_1.isAppPagesJson)(filename, inputDir));
}
function normalizeFileId(id) {
    return (0, uni_cli_shared_1.normalizePath)(id).split('?')[0];
}
function shouldResolveIndependentDependency(id) {
    if ((0, independentUtils_1.parseIndependentRoot)(id)) {
        return false;
    }
    if (/^uni(?:Page|Component):\/\//.test(id)) {
        return false;
    }
    if (/^(?:plugin|dynamicLib|ext|data|https?):/.test(id)) {
        return false;
    }
    return true;
}
function isMiniProgramRuntimeId(id) {
    return (0, uni_cli_shared_1.normalizePath)(id).split('?')[0].endsWith('/uni.mp.esm.js');
}
function shouldPropagateIndependentRoot(id) {
    if ((0, independentUtils_1.parseIndependentRoot)(id)) {
        return false;
    }
    if (/^(?:plugin|dynamicLib|ext|data|https?):/.test(id)) {
        return false;
    }
    if (/[?&](?:url|raw)\b/.test(id)) {
        return false;
    }
    if (/\.(?:css|scss|sass|less|styl)(?:$|[?#&])/.test(id)) {
        return false;
    }
    return true;
}
function generateIndependentMainCode(root, inputDir) {
    const independentMainPath = (0, independentMain_1.resolveIndependentMainPath)(inputDir, root);
    let hasUniCloudSpace = false;
    if (process.env.UNI_CLOUD_PROVIDER) {
        const spaces = JSON.parse(process.env.UNI_CLOUD_PROVIDER);
        if (Array.isArray(spaces) && spaces.length) {
            hasUniCloudSpace = true;
        }
    }
    const imports = [
        `import { createIndependentSubpackageApp } from ${JSON.stringify((0, independentUtils_1.withIndependentRoot)(independentUtils_1.UNI_MP_RUNTIME_ID, root))}`,
        `import { createSSRApp } from ${JSON.stringify((0, independentUtils_1.withIndependentRoot)('vue', root))}`,
        `import ${JSON.stringify((0, independentUtils_1.withIndependentRoot)(uni_cli_shared_1.PAGES_JSON_JS, root))}`,
    ];
    if (hasUniCloudSpace) {
        imports.push(`import ${JSON.stringify((0, independentUtils_1.withIndependentRoot)('@dcloudio/uni-cloud', root))}`);
    }
    if (independentMainPath) {
        // 独立分包 main 仅用于配置当前 root 的 Vue app（如 app.use/provide）。
        // 不复用 app main 的 app.component 收集逻辑，避免多个独立分包全局组件互相污染。
        imports.push(`import { createApp as createIndependentApp } from ${JSON.stringify((0, independentUtils_1.withIndependentRoot)(independentMainPath, root))}`);
    }
    const setupCode = independentMainPath ? 'createIndependentApp(app)\n' : '';
    return `${imports.join('\n')}\n\nconst app = createSSRApp({})\n${setupCode}app.mount('#app', ${JSON.stringify(root)}, { independent: true, createApp: createIndependentSubpackageApp })
`;
}
function generateVueExportHelperCode() {
    return `export default (sfc, props) => {
  const target = sfc.__vccOpts || sfc;
  for (const [key, val] of props) {
    target[key] = val;
  }
  return target;
}
`;
}
