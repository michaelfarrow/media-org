"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = __importDefault(require("../src/index"));
const mm = __importStar(require("music-metadata"));
const fs_1 = __importDefault(require("fs"));
const assert_1 = __importDefault(require("assert"));
const path_1 = __importDefault(require("path"));
const overrides_1 = require("./overrides");
const out = path_1.default.join(__dirname, 'test.out.m4b');
const input = path_1.default.join(__dirname, 'test.m4b');
describe('write-aac-metadata', () => {
    it('Changing metadata, output to a new file', async () => {
        await removeIfExsits(out);
        await (0, index_1.default)(input, overrides_1.baseOverrides, out);
        const origTags = (await mm.parseFile(input)).common;
        const tags = (await mm.parseFile(out)).common;
        checkMetadata(overrides_1.baseOverrides, origTags, tags, input, out);
        await removeIfExsits(out);
    });
    it('Multiline metadata, output to a new file', async () => {
        await removeIfExsits(out);
        await (0, index_1.default)(input, overrides_1.multiLineOverrides, out);
        const origTags = (await mm.parseFile(input)).common;
        const tags = (await mm.parseFile(out)).common;
        checkMetadata(overrides_1.multiLineOverrides, origTags, tags, input, out);
        await removeIfExsits(out);
    });
    it("Don't delete unchanged metadata, output to a new file", async () => {
        await removeIfExsits(out);
        await (0, index_1.default)(input, overrides_1.singleOverride, out);
        const origTags = (await mm.parseFile(input)).common;
        const tags = (await mm.parseFile(out)).common;
        checkMetadata(overrides_1.singleOverride, origTags, tags, input, out);
        await removeIfExsits(out);
    });
    it('Update photo, output to a new file', async () => {
        await removeIfExsits(out);
        await (0, index_1.default)(input, overrides_1.pictureOverride, out);
        const origTags = (await mm.parseFile(input)).common;
        const tags = (await mm.parseFile(out)).common;
        checkMetadata(overrides_1.pictureOverride, origTags, tags, input, out);
        await removeIfExsits(out);
    });
    it('Changing metadata, output to same file', async () => {
        await removeIfExsits(out);
        await (0, index_1.default)(input, {}, out);
        await (0, index_1.default)(out, overrides_1.baseOverrides, out);
        const origTags = (await mm.parseFile(input)).common;
        const tags = (await mm.parseFile(out)).common;
        checkMetadata(overrides_1.baseOverrides, origTags, tags, input, out);
        await removeIfExsits(out);
    });
    it('Changing metadata, output to same file, no output parameter', async () => {
        await removeIfExsits(out);
        await (0, index_1.default)(input, {}, out);
        await (0, index_1.default)(out, overrides_1.baseOverrides);
        const origTags = (await mm.parseFile(input)).common;
        const tags = (await mm.parseFile(out)).common;
        checkMetadata(overrides_1.baseOverrides, origTags, tags, input, out);
        await removeIfExsits(out);
    });
    it('Multiline metadata, output to same file', async () => {
        await removeIfExsits(out);
        await (0, index_1.default)(input, {}, out);
        await (0, index_1.default)(out, overrides_1.multiLineOverrides, out);
        const origTags = (await mm.parseFile(input)).common;
        const tags = (await mm.parseFile(out)).common;
        checkMetadata(overrides_1.multiLineOverrides, origTags, tags, input, out);
        await removeIfExsits(out);
    });
    it("Don't delete unchanged metadata, output to same file", async () => {
        await removeIfExsits(out);
        await (0, index_1.default)(input, {}, out);
        await (0, index_1.default)(out, overrides_1.singleOverride, out);
        const origTags = (await mm.parseFile(input)).common;
        const tags = (await mm.parseFile(out)).common;
        checkMetadata(overrides_1.singleOverride, origTags, tags, input, out);
        await removeIfExsits(out);
    });
    it('Update photo, output to same file', async () => {
        await removeIfExsits(out);
        await (0, index_1.default)(input, {}, out);
        await (0, index_1.default)(out, overrides_1.pictureOverride, out);
        const origTags = (await mm.parseFile(input)).common;
        const tags = (await mm.parseFile(out)).common;
        checkMetadata(overrides_1.pictureOverride, origTags, tags, input, out);
        await removeIfExsits(out);
    });
    it('Debug mode (for code coverage)', async () => {
        await removeIfExsits(out);
        await (0, index_1.default)(input, {}, out);
        await removeIfExsits('stdout.log');
        const stdout = fs_1.default.createWriteStream('stdout.log');
        const stdoutWrite = process.stdout.write;
        process.stdout.write = stdout.write.bind(stdout);
        await (0, index_1.default)(out, {}, undefined, { debug: true });
        process.stdout.write = stdoutWrite;
        await removeIfExsits(out);
        await removeIfExsits('stdout.log');
    });
    it('Errors', async () => {
        await removeIfExsits(out);
        await assert_1.default.rejects((0, index_1.default)(out, {}));
        await assert_1.default.rejects((0, index_1.default)(overrides_1.pictureOverride.coverPicturePath, {}, out));
        await assert_1.default.rejects((0, index_1.default)(input, {}, out));
        await removeIfExsits(out);
    });
});
function checkMetadata(overrides, originalMetadata, tags, origFile, newFile) {
    var _a, _b, _c, _d;
    const origStats = fs_1.default.statSync(origFile);
    const newStats = fs_1.default.statSync(newFile);
    console.log(tags);
    assert_1.default.strictEqual(tags.album, coalesceUndefined(overrides.album, originalMetadata.album));
    assert_1.default.strictEqual(tags.artist, coalesceUndefined(overrides.artist, originalMetadata.artist));
    assert_1.default.strictEqual(tags.albumartist, coalesceUndefined(overrides.albumArtist, originalMetadata.albumartist));
    assert_1.default.strictEqual(tags.grouping, coalesceUndefined(overrides.grouping, originalMetadata.grouping));
    assert_1.default.strictEqual(arrayTag(tags.comment), coalesceUndefined(overrides.comment, arrayTag(originalMetadata.comment)));
    assert_1.default.strictEqual(arrayTag(tags.genre), coalesceUndefined(overrides.genre, arrayTag(originalMetadata.genre)));
    assert_1.default.strictEqual(tags.title, coalesceUndefined(overrides.title, originalMetadata.title));
    assert_1.default.strictEqual(tags.track.no, coalesceUndefined(overrides.track, originalMetadata.track.no));
    assert_1.default.strictEqual(tags.year, coalesceUndefined(overrides.year, originalMetadata.year));
    assert_1.default.strictEqual(arrayTag(tags.composer), coalesceUndefined(overrides.composer, arrayTag(originalMetadata.composer)));
    assert_1.default.strictEqual(tags.copyright, coalesceUndefined(overrides.copyright, originalMetadata.copyright));
    assert_1.default.strictEqual((_b = (_a = arrayTag(tags.picture)) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.length, coalesceUndefined(overrides.coverPicturePath
        ? fs_1.default.statSync(overrides.coverPicturePath).size
        : undefined, (_d = (_c = arrayTag(originalMetadata.picture)) === null || _c === void 0 ? void 0 : _c.data) === null || _d === void 0 ? void 0 : _d.length));
    assert_1.default.strictEqual(arrayTag(tags.description), coalesceUndefined(overrides.description, arrayTag(originalMetadata.description)));
    assert_1.default.strictEqual(tags.longDescription, coalesceUndefined(overrides.synopsis, originalMetadata.longDescription));
    assert_1.default.strictEqual(Math.round(newStats.mtimeMs), Math.round(origStats.mtimeMs));
    if (process.platform !== 'linux') {
        assert_1.default.strictEqual(Math.round(newStats.birthtimeMs), Math.round(origStats.birthtimeMs));
    }
}
function coalesceUndefined(...params) {
    for (const item of params) {
        if (item !== undefined) {
            return item;
        }
    }
    return undefined;
}
function arrayTag(arr) {
    return arr ? arr[0] : undefined;
}
async function removeIfExsits(file) {
    if (fs_1.default.existsSync(file)) {
        await fs_1.default.promises.unlink(file);
    }
}
