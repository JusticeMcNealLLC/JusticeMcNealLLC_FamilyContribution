'use strict';
/** Shared checks for Phase 7 ESM migration (globalThis + export bridges). */

function hasGlobalBridge(js, globalName) {
    const n = globalName.startsWith('window.') ? globalName.slice(7) : globalName;
    return js.includes(`window.${n}`) || js.includes(`globalThis.${n}`);
}

function indexConstantsOk(indexJs) {
    return indexJs.includes('portalEventsConstants')
        && (indexJs.includes('PortalEvents.constants = portalEventsConstants')
            || indexJs.includes('window.PortalEvents.constants'));
}

function listShellEsmOk(listJs) {
    return listJs.includes('export const portalEventsListApi')
        && hasGlobalBridge(listJs, 'evtLoadEvents');
}

function detailOrchestratorEsmOk(detailJs) {
    return detailJs.includes('export const detailOrchestratorApi')
        && hasGlobalBridge(detailJs, 'evtOpenDetail');
}

function manageSheetEsmOk(sheetJs) {
    return sheetJs.includes('export const eventsManageApi')
        && hasGlobalBridge(sheetJs, 'EventsManage');
}

function manageModuleEsmOk(js, globalName, exportPrefix) {
    return js.includes(`export const ${exportPrefix}`)
        && hasGlobalBridge(js, globalName);
}

module.exports = {
    hasGlobalBridge,
    indexConstantsOk,
    listShellEsmOk,
    detailOrchestratorEsmOk,
    manageSheetEsmOk,
    manageModuleEsmOk,
};
