"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const ffmpeg_static_1 = __importDefault(require("ffmpeg-static"));
const DefaultOptions_1 = __importDefault(require("./DefaultOptions"));
const uuid_1 = require("uuid");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const utimes_1 = require("utimes");
exports.default = async (inputFilePath, metadata, outputFilePath, options) => {
    const opt = { ...DefaultOptions_1.default, ...options };
    const args = ['-i'];
    const coverPicturePath = metadata.coverPicturePath
        ? metadata.coverPicturePath
        : '';
    let ffmpegFileOutputPath = outputFilePath !== null && outputFilePath !== void 0 ? outputFilePath : '';
    if (!fs_1.default.existsSync(inputFilePath)) {
        throw new Error(`${inputFilePath}: file does not exist`);
    }
    if (!outputFilePath) {
        outputFilePath = inputFilePath;
        ffmpegFileOutputPath = inputFilePath;
    }
    if (fs_1.default.existsSync(outputFilePath)) {
        if (path_1.default.normalize(inputFilePath).toLowerCase() ===
            path_1.default.normalize(outputFilePath).toLowerCase()) {
            const parsed = path_1.default.parse(outputFilePath);
            ffmpegFileOutputPath = path_1.default.join(parsed.dir, `${parsed.name}-${(0, uuid_1.v4)()}${parsed.ext}`);
        }
        else {
            throw new Error(`${outputFilePath}: file already exists`);
        }
    }
    if (opt.debug) {
        console.debug('filePath:', inputFilePath);
        console.debug('outputFilePath:', outputFilePath);
        if (ffmpegFileOutputPath !== outputFilePath) {
            console.debug('ffmpegFileOutputPath', ffmpegFileOutputPath);
        }
        console.debug('metadata:', metadata);
        console.debug('Applied Options:', opt);
    }
    args.push(`"${inputFilePath.replace(/"/g, '\\"')}"`);
    if (coverPicturePath) {
        args.push('-i', `"${coverPicturePath}"`);
    }
    if (coverPicturePath) {
        args.push('-map', '0:0');
        args.push('-map', '1');
    }
    args.push('-c', 'copy');
    if (coverPicturePath) {
        args.push('-disposition:v:0', 'attached_pic');
    }
    addMetaData(args, 'album', metadata.album);
    addMetaData(args, 'artist', metadata.artist);
    addMetaData(args, 'album_artist', metadata.albumArtist);
    addMetaData(args, 'grouping', metadata.grouping);
    addMetaData(args, 'composer', metadata.composer);
    addMetaData(args, 'date', metadata.year);
    addMetaData(args, 'track', metadata.track);
    addMetaData(args, 'disc', metadata.disc);
    addMetaData(args, 'comment', metadata.comment);
    addMetaData(args, 'genre', metadata.genre);
    addMetaData(args, 'copyright', metadata.copyright);
    addMetaData(args, 'description', metadata.description);
    addMetaData(args, 'synopsis', metadata.synopsis);
    addMetaData(args, 'title', metadata.title);
    args.push(`"${ffmpegFileOutputPath.replace(/"/g, '\\"')}"`);
    if (opt.debug) {
        console.debug(`Running command ${ffmpeg_static_1.default} ${args.join(' ')}`);
    }
    const ffmpeg = (0, child_process_1.spawn)(ffmpeg_static_1.default !== null && ffmpeg_static_1.default !== void 0 ? ffmpeg_static_1.default : '', args, {
        windowsVerbatimArguments: true,
        stdio: opt.pipeStdio ? ['pipe', process.stdout, process.stderr] : undefined,
        detached: false,
        shell: process.platform !== 'win32',
    });
    await onExit(ffmpeg);
    if (opt.debug) {
        console.debug(`Created file ${ffmpegFileOutputPath}`);
    }
    const inputFileStats = fs_1.default.statSync(inputFilePath);
    const btime = Math.round(inputFileStats.birthtimeMs);
    const atime = Math.round(inputFileStats.atimeMs);
    const mtime = Math.round(inputFileStats.mtimeMs);
    if (opt.debug) {
        console.debug(`Setting ${ffmpegFileOutputPath} creation date: ${new Date(btime)} (${btime}), accessed date: ${new Date(atime)} (${atime}), modified date: ${new Date(atime)} (${atime}) so it matches with the original file`);
    }
    await (0, utimes_1.utimes)(ffmpegFileOutputPath, { btime, atime, mtime });
    if (ffmpegFileOutputPath !== outputFilePath) {
        if (opt.debug) {
            console.debug(`Deleting ${outputFilePath}`);
        }
        fs_1.default.unlinkSync(outputFilePath);
        if (opt.debug) {
            console.debug(`Renaming ${ffmpegFileOutputPath} to ${outputFilePath}`);
        }
        fs_1.default.renameSync(ffmpegFileOutputPath, outputFilePath);
    }
};
function addMetaData(args, key, value) {
    if (value !== undefined) {
        let arg = value;
        if (process.platform !== 'win32') {
            arg = `'${arg.toString().replace(/'/g, "'\\''")}'`;
        }
        else {
            arg = `"${arg.toString().replace(/"/g, '\\"')}"`;
        }
        args.push('-metadata', `${key}=${arg}`);
    }
}
function onExit(childProcess) {
    return new Promise((resolve, reject) => {
        childProcess.once('exit', (code) => {
            if (code === 0) {
                resolve(undefined);
            }
            else {
                reject(new Error('Exit with error code: ' + code));
            }
        });
        childProcess.once('error', (err) => {
            reject(err);
        });
    });
}
