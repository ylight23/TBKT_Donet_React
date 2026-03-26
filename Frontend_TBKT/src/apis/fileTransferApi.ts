// @ts-nocheck
import { create } from "@bufbuild/protobuf";
import {
    CompleteUploadRequestSchema,
    CreateUploadSessionRequestSchema,
    DeleteFileRequestSchema,
    DownloadFileRequestSchema,
    FileKind,
    GetFileMetadataRequestSchema,
    UploadChunkRequestSchema,
} from "../grpc/generated/FileTransfer_pb";
import { fileTransferClient } from "../grpc/grpcClient";

export interface UploadFileOptions {
    category?: string;
    fileKind?: FileKind;
    chunkSize?: number;
    metadata?: Record<string, string>;
    fileName?: string;
    contentType?: string;
    onProgress?: (progress: {
        uploadId: string;
        fileId: string;
        uploadedChunks: number;
        uploadedBytes: number;
        totalChunks: number;
        totalBytes: number;
        completed: boolean;
    }) => void;
}

export interface DownloadFileOptions {
    onChunk?: (progress: {
        chunkIndex: number;
        receivedBytes: number;
        totalBytes: number;
        done: boolean;
        file?: any;
    }) => void;
}

function normalizeInt64(value: bigint | number | string | undefined): number {
    if (typeof value === "bigint") return Number(value);
    if (typeof value === "string") return Number(value);
    return value ?? 0;
}

function inferFileKind(fileName: string, contentType: string): FileKind {
    const ext = (fileName.split(".").pop() || "").toLowerCase();
    const mime = (contentType || "").toLowerCase();

    if (ext === "json" || mime.includes("json")) return FileKind.JSON;
    if (["png", "jpg", "jpeg", "gif", "bmp", "webp", "svg"].includes(ext) || mime.startsWith("image/")) return FileKind.IMAGE;
    if (["mp4", "webm", "mov", "avi", "mkv"].includes(ext) || mime.startsWith("video/")) return FileKind.VIDEO;
    if (ext === "pdf" || mime === "application/pdf") return FileKind.PDF;
    if (ext === "docx") return FileKind.DOCX;
    if (ext === "xlsx" || ext === "xls") return FileKind.XLSX;
    return FileKind.BINARY;
}

const fileTransferApi = {
    async createUploadSession(input: {
        fileName: string;
        originalFileName?: string;
        contentType?: string;
        sizeBytes: number;
        chunkSize: number;
        totalChunks: number;
        category?: string;
        fileKind?: FileKind;
        metadata?: Record<string, string>;
    }) {
        const request = create(CreateUploadSessionRequestSchema, {
            fileName: input.fileName,
            originalFileName: input.originalFileName ?? input.fileName,
            contentType: input.contentType ?? "application/octet-stream",
            sizeBytes: BigInt(input.sizeBytes),
            chunkSize: input.chunkSize,
            totalChunks: input.totalChunks,
            category: input.category ?? "",
            fileKind: input.fileKind ?? inferFileKind(input.fileName, input.contentType ?? ""),
            metadata: input.metadata ?? {},
        });

        return await fileTransferClient.createUploadSession(request);
    },

    async uploadChunk(input: {
        uploadId: string;
        chunkIndex: number;
        data: Uint8Array;
    }) {
        const request = create(UploadChunkRequestSchema, {
            uploadId: input.uploadId,
            chunkIndex: input.chunkIndex,
            data: input.data,
        });

        return await fileTransferClient.uploadChunk(request);
    },

    async completeUpload(uploadId: string) {
        const request = create(CompleteUploadRequestSchema, { uploadId });
        return await fileTransferClient.completeUpload(request);
    },

    async uploadFile(file: File | Blob, options: UploadFileOptions = {}) {
        const fileName = options.fileName ?? ("name" in file ? file.name : "upload.bin");
        const contentType = options.contentType ?? file.type ?? "application/octet-stream";
        const chunkSize = options.chunkSize ?? 256 * 1024;
        const totalBytes = file.size;
        const totalChunks = Math.max(1, Math.ceil(totalBytes / chunkSize));
        const fileKind = options.fileKind ?? inferFileKind(fileName, contentType);

        const session = await this.createUploadSession({
            fileName,
            originalFileName: fileName,
            contentType,
            sizeBytes: totalBytes,
            chunkSize,
            totalChunks,
            category: options.category,
            fileKind,
            metadata: options.metadata,
        });

        for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
            const start = chunkIndex * chunkSize;
            const end = Math.min(start + chunkSize, totalBytes);
            const chunk = file.slice(start, end);
            const data = new Uint8Array(await chunk.arrayBuffer());
            const response = await this.uploadChunk({
                uploadId: session.uploadId,
                chunkIndex,
                data,
            });

            options.onProgress?.({
                uploadId: response.uploadId,
                fileId: response.fileId,
                uploadedChunks: response.uploadedChunks,
                uploadedBytes: normalizeInt64(response.uploadedBytes),
                totalChunks,
                totalBytes,
                completed: response.completed,
            });
        }

        return await this.completeUpload(session.uploadId);
    },

    async uploadJsonContent(
        fileName: string,
        jsonContent: string | Record<string, unknown>,
        options: Omit<UploadFileOptions, "fileName" | "contentType" | "fileKind"> = {},
    ) {
        const content = typeof jsonContent === "string"
            ? jsonContent
            : JSON.stringify(jsonContent, null, 2);
        const blob = new Blob([content], { type: "application/json" });

        return await this.uploadFile(blob, {
            ...options,
            fileName,
            contentType: "application/json",
            fileKind: FileKind.JSON,
        });
    },

    async getFileMetadata(id: string) {
        const request = create(GetFileMetadataRequestSchema, { id });
        return await fileTransferClient.getFileMetadata(request);
    },

    async downloadFileStream(id: string, options: DownloadFileOptions = {}) {
        const request = create(DownloadFileRequestSchema, { id });
        const chunks: Uint8Array[] = [];
        let file: any = null;
        let receivedBytes = 0;

        for await (const event of fileTransferClient.downloadFileStream(request)) {
            if (event.file) {
                file = event.file;
            }

            if (event.data?.length) {
                chunks.push(event.data);
                receivedBytes += event.data.length;
            }

            options.onChunk?.({
                chunkIndex: event.chunkIndex,
                receivedBytes,
                totalBytes: file ? normalizeInt64(file.sizeBytes) : 0,
                done: event.done,
                file,
            });
        }

        const contentType = file?.contentType || "application/octet-stream";
        const blob = new Blob(chunks, { type: contentType });
        return { file, blob };
    },

    async saveDownloadedFile(id: string, options: DownloadFileOptions = {}) {
        const { file, blob } = await this.downloadFileStream(id, options);
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = file?.originalFileName || file?.fileName || "download.bin";
        link.click();
        URL.revokeObjectURL(url);
        return { file, blob };
    },

    async deleteFile(id: string) {
        const request = create(DeleteFileRequestSchema, { id });
        return await fileTransferClient.deleteFile(request);
    },
};

export default fileTransferApi;
export { FileKind };
