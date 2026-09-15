"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withoutIndependentRoot = exports.withIndependentRoot = exports.parseIndependentVirtualRoot = exports.parseIndependentRoot = exports.parseIndependentMainRoot = exports.normalizeIndependentRoot = exports.isInIndependentRoot = exports.isAppPagesJson = exports.hasIndependentRoot = exports.getIndependentSubPackages = exports.getIndependentRoots = exports.getIndependentRootByFilename = exports.formatIndependentVirtualId = exports.updateIndependentSubPackages = exports.initIndependentSubPackages = exports.INDEPENDENT_ROOT_PARAM = exports.INDEPENDENT_ROOT_QUERY = exports.UNI_MP_RUNTIME_ID = exports.VUE_EXPORT_HELPER_ID = exports.INDEPENDENT_MAIN_PREFIX = exports.INDEPENDENT_SUBPACKAGE_PLUGIN_NAME = void 0;
const uni_cli_shared_1 = require("@dcloudio/uni-cli-shared");
exports.INDEPENDENT_SUBPACKAGE_PLUGIN_NAME = 'uni:mp-independent-subpackage';
exports.INDEPENDENT_MAIN_PREFIX = uni_cli_shared_1.MP_INDEPENDENT_MAIN_PREFIX;
exports.VUE_EXPORT_HELPER_ID = '\0plugin-vue:export-helper';
exports.UNI_MP_RUNTIME_ID = 'uni-mp-runtime';
exports.INDEPENDENT_ROOT_QUERY = uni_cli_shared_1.MP_INDEPENDENT_ROOT_QUERY;
exports.INDEPENDENT_ROOT_PARAM = uni_cli_shared_1.MP_INDEPENDENT_VIRTUAL_ROOT_QUERY;
let initialIndependentRootsSignature;
function initIndependentSubPackages(packages) {
    (0, uni_cli_shared_1.setIndependentSubPackages)(packages);
    initialIndependentRootsSignature = (0, uni_cli_shared_1.stringifyIndependentRoots)(packages);
}
exports.initIndependentSubPackages = initIndependentSubPackages;
function updateIndependentSubPackages(packages) {
    const currentRoots = (0, uni_cli_shared_1.stringifyIndependentRoots)(packages);
    if (initialIndependentRootsSignature === undefined) {
        initialIndependentRootsSignature = currentRoots;
    }
    const rootsChanged = currentRoots !== initialIndependentRootsSignature;
    if (!rootsChanged) {
        (0, uni_cli_shared_1.setIndependentSubPackages)(packages);
    }
    return {
        rootsChanged,
        initialRoots: initialIndependentRootsSignature,
        currentRoots,
    };
}
exports.updateIndependentSubPackages = updateIndependentSubPackages;
var uni_cli_shared_2 = require("@dcloudio/uni-cli-shared");
Object.defineProperty(exports, "formatIndependentVirtualId", { enumerable: true, get: function () { return uni_cli_shared_2.formatIndependentVirtualId; } });
Object.defineProperty(exports, "getIndependentRootByFilename", { enumerable: true, get: function () { return uni_cli_shared_2.getIndependentRootByFilename; } });
Object.defineProperty(exports, "getIndependentRoots", { enumerable: true, get: function () { return uni_cli_shared_2.getIndependentRoots; } });
Object.defineProperty(exports, "getIndependentSubPackages", { enumerable: true, get: function () { return uni_cli_shared_2.getIndependentSubPackages; } });
Object.defineProperty(exports, "hasIndependentRoot", { enumerable: true, get: function () { return uni_cli_shared_2.hasIndependentRoot; } });
Object.defineProperty(exports, "isAppPagesJson", { enumerable: true, get: function () { return uni_cli_shared_2.isAppPagesJson; } });
Object.defineProperty(exports, "isInIndependentRoot", { enumerable: true, get: function () { return uni_cli_shared_2.isInIndependentRoot; } });
Object.defineProperty(exports, "normalizeIndependentRoot", { enumerable: true, get: function () { return uni_cli_shared_2.normalizeIndependentRoot; } });
Object.defineProperty(exports, "parseIndependentMainRoot", { enumerable: true, get: function () { return uni_cli_shared_2.parseIndependentMainRoot; } });
Object.defineProperty(exports, "parseIndependentRoot", { enumerable: true, get: function () { return uni_cli_shared_2.parseIndependentRoot; } });
Object.defineProperty(exports, "parseIndependentVirtualRoot", { enumerable: true, get: function () { return uni_cli_shared_2.parseIndependentVirtualRoot; } });
Object.defineProperty(exports, "withIndependentRoot", { enumerable: true, get: function () { return uni_cli_shared_2.withIndependentRoot; } });
Object.defineProperty(exports, "withoutIndependentRoot", { enumerable: true, get: function () { return uni_cli_shared_2.withoutIndependentRoot; } });
