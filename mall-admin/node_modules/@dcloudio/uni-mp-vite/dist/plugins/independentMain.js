"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateIndependentMainJs = exports.isIndependentMainJs = exports.resolveIndependentMainPath = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
const estree_walker_1 = require("estree-walker");
function resolveIndependentMainPath(inputDir, root) {
    if (!inputDir) {
        return;
    }
    return resolveIndependentMainCandidates(inputDir, root).find((filename) => fs_1.default.existsSync(filename));
}
exports.resolveIndependentMainPath = resolveIndependentMainPath;
function resolveIndependentMainCandidates(inputDir, root) {
    const rootDir = path_1.default.resolve(inputDir, root);
    const filenames = ['main.ts', 'main.js'];
    if (process.env.UNI_APP_X === 'true') {
        filenames.unshift((0, uni_cli_shared_1.resolveMainUtsName)());
    }
    return filenames.map((filename) => (0, uni_cli_shared_1.normalizePath)(path_1.default.resolve(rootDir, filename)));
}
function isIndependentMainJs(filename, root) {
    if (!root || !process.env.UNI_INPUT_DIR) {
        return false;
    }
    const normalizedFilename = (0, uni_cli_shared_1.normalizePath)(filename);
    const mainPath = (0, uni_cli_shared_1.normalizePath)(path_1.default.resolve(process.env.UNI_INPUT_DIR, root, 'main'));
    return (normalizedFilename === mainPath + '.js' ||
        normalizedFilename === mainPath + '.ts' ||
        normalizedFilename === mainPath + '.uts');
}
exports.isIndependentMainJs = isIndependentMainJs;
function validateIndependentMainJs(ast, filename) {
    const appNames = findCreateAppParamNames(ast);
    if (!appNames.size) {
        return;
    }
    ;
    estree_walker_1.walk(ast, {
        enter(node) {
            if (!(0, uni_cli_shared_1.isCallExpression)(node)) {
                return;
            }
            const { callee } = node;
            if ((0, uni_cli_shared_1.isMemberExpression)(callee) &&
                callee.object &&
                (0, uni_cli_shared_1.isIdentifier)(callee.object) &&
                callee.property &&
                (0, uni_cli_shared_1.isIdentifier)(callee.property) &&
                appNames.has(callee.object.name) &&
                callee.property.name === 'component') {
                throw new Error(`独立分包 main 暂不支持 app.component 注册全局组件：${filename}。请在独立分包页面或组件内局部引用组件。`);
            }
        },
    });
}
exports.validateIndependentMainJs = validateIndependentMainJs;
function findCreateAppParamNames(ast) {
    const appNames = new Set();
    estree_walker_1.walk(ast, {
        enter(node) {
            if (node.type === 'FunctionDeclaration' &&
                node.id &&
                (0, uni_cli_shared_1.isIdentifier)(node.id) &&
                node.id.name === 'createApp') {
                addFirstParamName(appNames, node);
                return;
            }
            if (node.type === 'VariableDeclarator' &&
                node.id &&
                (0, uni_cli_shared_1.isIdentifier)(node.id) &&
                node.id.name === 'createApp' &&
                isFunctionNode(node.init)) {
                addFirstParamName(appNames, node.init);
            }
        },
    });
    return appNames;
}
function addFirstParamName(appNames, node) {
    const [appParam] = node.params || [];
    if (appParam && (0, uni_cli_shared_1.isIdentifier)(appParam)) {
        appNames.add(appParam.name);
    }
}
function isFunctionNode(node) {
    return (node &&
        (node.type === 'FunctionExpression' ||
            node.type === 'ArrowFunctionExpression'));
}
