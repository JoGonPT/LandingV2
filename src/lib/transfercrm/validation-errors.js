"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatTransferCrmValidationMessages = formatTransferCrmValidationMessages;
exports.firstTransferCrmValidationMessage = firstTransferCrmValidationMessage;
function formatTransferCrmValidationMessages(errors) {
    if (!errors || Object.keys(errors).length === 0) {
        return "";
    }
    const lines = [];
    for (const [field, messages] of Object.entries(errors)) {
        for (const message of messages) {
            lines.push(`${field}: ${message}`);
        }
    }
    return lines.join("\n");
}
function firstTransferCrmValidationMessage(errors) {
    if (!errors)
        return undefined;
    for (const messages of Object.values(errors)) {
        if (messages?.length)
            return messages[0];
    }
    return undefined;
}
//# sourceMappingURL=validation-errors.js.map