import { type IndependentSubPackage } from '@dcloudio/uni-cli-shared';
export declare const INDEPENDENT_SUBPACKAGE_PLUGIN_NAME = "uni:mp-independent-subpackage";
export declare const INDEPENDENT_MAIN_PREFIX = "\0uni:mp-independent-main";
export declare const VUE_EXPORT_HELPER_ID = "\0plugin-vue:export-helper";
export declare const UNI_MP_RUNTIME_ID = "uni-mp-runtime";
export declare const INDEPENDENT_ROOT_QUERY = "uni_mp_independent_root";
export declare const INDEPENDENT_ROOT_PARAM = "root";
export interface UpdateIndependentSubPackagesResult {
    rootsChanged: boolean;
    initialRoots: string;
    currentRoots: string;
}
export declare function initIndependentSubPackages(packages: IndependentSubPackage[]): void;
export declare function updateIndependentSubPackages(packages: IndependentSubPackage[]): UpdateIndependentSubPackagesResult;
export { formatIndependentVirtualId, getIndependentRootByFilename, getIndependentRoots, getIndependentSubPackages, hasIndependentRoot, isAppPagesJson, isInIndependentRoot, normalizeIndependentRoot, parseIndependentMainRoot, parseIndependentRoot, parseIndependentVirtualRoot, withIndependentRoot, withoutIndependentRoot, } from '@dcloudio/uni-cli-shared';
