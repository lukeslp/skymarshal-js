"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDraftWithId = isDraftWithId;
exports.validateDraftWithId = validateDraftWithId;
exports.isDraft = isDraft;
exports.validateDraft = validateDraft;
exports.isDraftPost = isDraftPost;
exports.validateDraftPost = validateDraftPost;
exports.isDraftView = isDraftView;
exports.validateDraftView = validateDraftView;
exports.isDraftEmbedLocalRef = isDraftEmbedLocalRef;
exports.validateDraftEmbedLocalRef = validateDraftEmbedLocalRef;
exports.isDraftEmbedCaption = isDraftEmbedCaption;
exports.validateDraftEmbedCaption = validateDraftEmbedCaption;
exports.isDraftEmbedImage = isDraftEmbedImage;
exports.validateDraftEmbedImage = validateDraftEmbedImage;
exports.isDraftEmbedVideo = isDraftEmbedVideo;
exports.validateDraftEmbedVideo = validateDraftEmbedVideo;
exports.isDraftEmbedExternal = isDraftEmbedExternal;
exports.validateDraftEmbedExternal = validateDraftEmbedExternal;
exports.isDraftEmbedRecord = isDraftEmbedRecord;
exports.validateDraftEmbedRecord = validateDraftEmbedRecord;
const lexicons_1 = require("../../../../lexicons");
const util_1 = require("../../../../util");
const is$typed = util_1.is$typed, validate = lexicons_1.validate;
const id = 'app.bsky.draft.defs';
const hashDraftWithId = 'draftWithId';
function isDraftWithId(v) {
    return is$typed(v, id, hashDraftWithId);
}
function validateDraftWithId(v) {
    return validate(v, id, hashDraftWithId);
}
const hashDraft = 'draft';
function isDraft(v) {
    return is$typed(v, id, hashDraft);
}
function validateDraft(v) {
    return validate(v, id, hashDraft);
}
const hashDraftPost = 'draftPost';
function isDraftPost(v) {
    return is$typed(v, id, hashDraftPost);
}
function validateDraftPost(v) {
    return validate(v, id, hashDraftPost);
}
const hashDraftView = 'draftView';
function isDraftView(v) {
    return is$typed(v, id, hashDraftView);
}
function validateDraftView(v) {
    return validate(v, id, hashDraftView);
}
const hashDraftEmbedLocalRef = 'draftEmbedLocalRef';
function isDraftEmbedLocalRef(v) {
    return is$typed(v, id, hashDraftEmbedLocalRef);
}
function validateDraftEmbedLocalRef(v) {
    return validate(v, id, hashDraftEmbedLocalRef);
}
const hashDraftEmbedCaption = 'draftEmbedCaption';
function isDraftEmbedCaption(v) {
    return is$typed(v, id, hashDraftEmbedCaption);
}
function validateDraftEmbedCaption(v) {
    return validate(v, id, hashDraftEmbedCaption);
}
const hashDraftEmbedImage = 'draftEmbedImage';
function isDraftEmbedImage(v) {
    return is$typed(v, id, hashDraftEmbedImage);
}
function validateDraftEmbedImage(v) {
    return validate(v, id, hashDraftEmbedImage);
}
const hashDraftEmbedVideo = 'draftEmbedVideo';
function isDraftEmbedVideo(v) {
    return is$typed(v, id, hashDraftEmbedVideo);
}
function validateDraftEmbedVideo(v) {
    return validate(v, id, hashDraftEmbedVideo);
}
const hashDraftEmbedExternal = 'draftEmbedExternal';
function isDraftEmbedExternal(v) {
    return is$typed(v, id, hashDraftEmbedExternal);
}
function validateDraftEmbedExternal(v) {
    return validate(v, id, hashDraftEmbedExternal);
}
const hashDraftEmbedRecord = 'draftEmbedRecord';
function isDraftEmbedRecord(v) {
    return is$typed(v, id, hashDraftEmbedRecord);
}
function validateDraftEmbedRecord(v) {
    return validate(v, id, hashDraftEmbedRecord);
}
//# sourceMappingURL=defs.js.map