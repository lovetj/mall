"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uniMainJsPlugin = void 0;
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const independentUtils_1 = require("./independentUtils");
const independentMain_1 = require("./independentMain");
const usingComponents_1 = require("./usingComponents");
function uniMainJsPlugin(options = {}) {
    const normalizeComponentName = options.normalizeComponentName || ((name) => name);
    return (0, uni_cli_shared_1.defineUniMainJsPlugin)((opts) => {
        return {
            name: 'uni:mp-main-js',
            enforce: 'pre',
            async transform(source, id) {
                const independentRoot = (0, independentUtils_1.parseIndependentRoot)(id);
                const filename = independentRoot ? (0, independentUtils_1.withoutIndependentRoot)(id) : id;
                const independentMainJs = (0, independentMain_1.isIndependentMainJs)(filename, independentRoot);
                if (independentMainJs) {
                    (0, independentMain_1.validateIndependentMainJs)((0, uni_cli_shared_1.parseProgram)(source, id, {
                        babelParserPlugins: options.babelParserPlugins,
                    }), filename);
                    return;
                }
                if (opts.filter(filename)) {
                    source =
                        !independentRoot && source.includes('createSSRApp')
                            ? createApp(source)
                            : createLegacyApp(source);
                    const inputDir = process.env.UNI_INPUT_DIR;
                    const globalComponentOptions = {
                        inputDir,
                        resolve: this.resolve,
                        normalizeComponentName,
                        root: independentRoot,
                    };
                    const { imports } = await (0, uni_cli_shared_1.updateMiniProgramGlobalComponents)(id, (0, uni_cli_shared_1.parseProgram)(source, id, {
                        babelParserPlugins: options.babelParserPlugins,
                    }), globalComponentOptions);
                    const { code, map } = await (0, uni_cli_shared_1.transformDynamicImports)(source, imports, {
                        id,
                        sourceMap: (0, uni_cli_shared_1.enableSourceMap)(),
                        dynamicImport: (name, value) => (0, usingComponents_1.dynamicImport)(name, value, {
                            root: independentRoot,
                            inferRoot: !independentRoot,
                            inputDir,
                        }),
                    });
                    if (independentRoot) {
                        return {
                            code,
                            map,
                        };
                    }
                    return {
                        code: `import '${independentUtils_1.VUE_EXPORT_HELPER_ID}';import '${independentUtils_1.UNI_MP_RUNTIME_ID}';import './${uni_cli_shared_1.PAGES_JSON_JS}';` +
                            code,
                        map,
                    };
                }
            },
        };
    });
}
exports.uniMainJsPlugin = uniMainJsPlugin;
function createApp(code) {
    // 此处换行防止用户代码最后一行是单行注释，导致应用无法启动
    return `${code};\ncreateApp().app.mount("#app");`;
}
function createLegacyApp(code) {
    return code;
}
