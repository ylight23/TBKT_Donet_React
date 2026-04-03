import React, { useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  LinearProgress,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DownloadIcon from '@mui/icons-material/Download';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import MovieIcon from '@mui/icons-material/Movie';
import DataObjectIcon from '@mui/icons-material/DataObject';
import fileTransferApi, { FileKind } from '../../apis/fileTransferApi';

type UploadState = {
  stage: string;
  uploadedBytes: number;
  totalBytes: number;
  uploadedChunks: number;
  totalChunks: number;
  completed: boolean;
};

const fileKindOptions = [
  { value: FileKind.BINARY, label: 'Binary / bất kỳ' },
  { value: FileKind.JSON, label: 'JSON config' },
  { value: FileKind.IMAGE, label: 'Ảnh' },
  { value: FileKind.VIDEO, label: 'Video' },
  { value: FileKind.PDF, label: 'PDF' },
  { value: FileKind.DOCX, label: 'DOCX' },
  { value: FileKind.XLSX, label: 'XLSX' },
];

const formatBytes = (value: number): string => {
  if (!value) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = value;
  let idx = 0;
  while (size >= 1024 && idx < units.length - 1) {
    size /= 1024;
    idx++;
  }
  return `${size.toFixed(size >= 10 || idx === 0 ? 0 : 1)} ${units[idx]}`;
};

const FileTransferTest: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState('test');
  const [metadataText, setMetadataText] = useState('{\n  "module": "manual-test",\n  "note": "upload-file"\n}');
  const [fileKind, setFileKind] = useState<FileKind>(FileKind.BINARY);
  const [uploading, setUploading] = useState(false);
  const [uploadState, setUploadState] = useState<UploadState | null>(null);
  const [jsonUploading, setJsonUploading] = useState(false);
  const [jsonFileName, setJsonFileName] = useState('demo-config.json');
  const [jsonContent, setJsonContent] = useState('{\n  "title": "Demo config",\n  "enabled": true,\n  "items": [1, 2, 3]\n}');
  const [fileIdInput, setFileIdInput] = useState('');
  const [currentFile, setCurrentFile] = useState<any | null>(null);
  const [busy, setBusy] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadBytes, setDownloadBytes] = useState(0);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  const parsedMetadata = useMemo(() => {
    try {
      return metadataText.trim() ? JSON.parse(metadataText) : {};
    } catch {
      return null;
    }
  }, [metadataText]);

  const handleFileUpload = async () => {
    if (!selectedFile) {
      setMessage({ type: 'error', text: 'Chọn file trước khi upload.' });
      return;
    }
    if (parsedMetadata === null) {
      setMessage({ type: 'error', text: 'Metadata JSON không hợp lệ.' });
      return;
    }

    try {
      setUploading(true);
      setMessage({ type: 'info', text: 'Đang upload file theo chunk...' });
      setUploadState(null);
      const response = await fileTransferApi.uploadFile(selectedFile, {
        category,
        fileKind,
        metadata: Object.fromEntries(Object.entries(parsedMetadata).map(([key, value]) => [key, String(value)])),
        onProgress: (progress) => {
          setUploadState({
            stage: 'UPLOAD',
            uploadedBytes: progress.uploadedBytes,
            totalBytes: progress.totalBytes,
            uploadedChunks: progress.uploadedChunks,
            totalChunks: progress.totalChunks,
            completed: progress.completed,
          });
        },
      });

      setCurrentFile(response.file);
      setFileIdInput(response.file?.id ?? '');
      setMessage({ type: 'success', text: `Upload thành công: ${response.file?.id}` });
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error)?.message || 'Upload file thất bại.' });
    } finally {
      setUploading(false);
    }
  };

  const handleJsonUpload = async () => {
    try {
      JSON.parse(jsonContent);
    } catch {
      setMessage({ type: 'error', text: 'Nội dung JSON config không hợp lệ.' });
      return;
    }

    try {
      setJsonUploading(true);
      setMessage({ type: 'info', text: 'Đang upload JSON config...' });
      const response = await fileTransferApi.uploadJsonContent(jsonFileName, jsonContent, {
        category: category || 'json-config',
        metadata: { source: 'manual-json-test' },
      });
      setCurrentFile(response.file);
      setFileIdInput(response.file?.id ?? '');
      setMessage({ type: 'success', text: `Upload JSON thành công: ${response.file?.id}` });
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error)?.message || 'Upload JSON thất bại.' });
    } finally {
      setJsonUploading(false);
    }
  };

  const handleLoadMetadata = async () => {
    if (!fileIdInput.trim()) {
      setMessage({ type: 'error', text: 'Nhập fileId để tra metadata.' });
      return;
    }

    try {
      setBusy(true);
      const response = await fileTransferApi.getFileMetadata(fileIdInput.trim());
      setCurrentFile(response.file);
      setMessage({ type: 'success', text: 'Đã tải metadata file.' });
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error)?.message || 'Không tải được metadata.' });
    } finally {
      setBusy(false);
    }
  };

  const handleDownload = async () => {
    if (!fileIdInput.trim()) {
      setMessage({ type: 'error', text: 'Nhập fileId trước khi download.' });
      return;
    }

    try {
      setDownloading(true);
      setDownloadBytes(0);
      setMessage({ type: 'info', text: 'Đang download file qua gRPC stream...' });
      const result = await fileTransferApi.saveDownloadedFile(fileIdInput.trim(), {
        onChunk: ({ receivedBytes, file }) => {
          setDownloadBytes(receivedBytes);
          if (file) setCurrentFile(file);
        },
      });
      setCurrentFile(result.file);
      setMessage({ type: 'success', text: 'Download hoàn tất.' });
    } catch (error) {
      setMessage({ type: 'error', text: (error as Error)?.message || 'Download thất bại.' });
    } finally {
      setDownloading(false);
    }
  };

  const kindIcon = (() => {
    switch (currentFile?.fileKind) {
      case FileKind.JSON:
        return <DataObjectIcon fontSize="small" />;
      case FileKind.IMAGE:
        return <ImageIcon fontSize="small" />;
      case FileKind.VIDEO:
        return <MovieIcon fontSize="small" />;
      default:
        return <DescriptionIcon fontSize="small" />;
    }
  })();

  return (
    <Box p={3}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            File Transfer Test
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Màn test trực tiếp cho `FileTransferService`: upload chunk, download stream, metadata dùng chung cho file thật và JSON config.
          </Typography>
        </Box>

        {message ? <Alert severity={message.type}>{message.text}</Alert> : null}

        <Stack direction={{ xs: 'column', lg: 'row' }} spacing={3} alignItems="stretch">
          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Upload file thật</Typography>
                <Button component="label" variant="outlined" startIcon={<UploadFileIcon />}>
                  Chọn file
                  <input
                    hidden
                    type="file"
                    onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)}
                  />
                </Button>

                {selectedFile ? (
                  <Alert severity="info">
                    {selectedFile.name} · {formatBytes(selectedFile.size)} · {selectedFile.type || 'application/octet-stream'}
                  </Alert>
                ) : null}

                <TextField
                  label="Category"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  fullWidth
                  size="small"
                />
                <TextField
                  select
                  label="File kind"
                  value={fileKind}
                  onChange={(event) => setFileKind(Number(event.target.value) as FileKind)}
                  fullWidth
                  size="small"
                >
                  {fileKindOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Metadata JSON"
                  value={metadataText}
                  onChange={(event) => setMetadataText(event.target.value)}
                  multiline
                  minRows={6}
                  error={parsedMetadata === null}
                  helperText={parsedMetadata === null ? 'JSON không hợp lệ' : 'Sẽ lưu thành metadata string map'}
                  fullWidth
                />
                {uploadState ? (
                  <Box>
                    <LinearProgress
                      variant="determinate"
                      value={uploadState.totalBytes > 0 ? (uploadState.uploadedBytes / uploadState.totalBytes) * 100 : 0}
                    />
                    <Typography variant="caption" color="text.secondary">
                      {formatBytes(uploadState.uploadedBytes)} / {formatBytes(uploadState.totalBytes)} · chunk {uploadState.uploadedChunks}/{uploadState.totalChunks}
                    </Typography>
                  </Box>
                ) : null}
                <Button variant="contained" onClick={handleFileUpload} disabled={uploading || !selectedFile}>
                  {uploading ? 'Đang upload...' : 'Upload file'}
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card sx={{ flex: 1 }}>
            <CardContent>
              <Stack spacing={2}>
                <Typography variant="h6">Upload JSON config</Typography>
                <TextField
                  label="Tên file JSON"
                  value={jsonFileName}
                  onChange={(event) => setJsonFileName(event.target.value)}
                  fullWidth
                  size="small"
                />
                <TextField
                  label="JSON content"
                  value={jsonContent}
                  onChange={(event) => setJsonContent(event.target.value)}
                  multiline
                  minRows={10}
                  fullWidth
                />
                <Button variant="contained" color="secondary" onClick={handleJsonUpload} disabled={jsonUploading}>
                  {jsonUploading ? 'Đang upload JSON...' : 'Upload JSON config'}
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Stack>

        <Card>
          <CardContent>
            <Stack spacing={2}>
              <Typography variant="h6">Tra metadata và download stream</Typography>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                <TextField
                  label="File ID"
                  value={fileIdInput}
                  onChange={(event) => setFileIdInput(event.target.value)}
                  fullWidth
                  size="small"
                />
                <Button variant="outlined" onClick={handleLoadMetadata} disabled={busy}>
                  Tải metadata
                </Button>
                <Button variant="contained" startIcon={<DownloadIcon />} onClick={handleDownload} disabled={downloading}>
                  {downloading ? 'Đang download...' : 'Download file'}
                </Button>
              </Stack>

              {downloading && currentFile ? (
                <Box>
                  <LinearProgress
                    variant="determinate"
                    value={Number(currentFile.sizeBytes) > 0 ? (downloadBytes / Number(currentFile.sizeBytes)) * 100 : 0}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {formatBytes(downloadBytes)} / {formatBytes(Number(currentFile.sizeBytes ?? 0))}
                  </Typography>
                </Box>
              ) : null}

              {currentFile ? (
                <>
                  <Divider />
                  <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
                    <Chip icon={kindIcon} label={currentFile.fileName || 'unknown'} />
                    <Chip label={currentFile.contentType || 'application/octet-stream'} variant="outlined" />
                    <Chip label={currentFile.category || 'no-category'} variant="outlined" />
                    <Chip label={currentFile.completed ? 'Completed' : 'Pending'} color={currentFile.completed ? 'success' : 'warning'} />
                  </Stack>
                  <TextField label="Metadata" value={JSON.stringify(currentFile.metadata ?? {}, null, 2)} multiline minRows={6} fullWidth InputProps={{ readOnly: true }} />
                  <TextField
                    label="Thông tin file"
                    value={[
                      `ID: ${currentFile.id ?? ''}`,
                      `Original: ${currentFile.originalFileName ?? ''}`,
                      `Extension: ${currentFile.extension ?? ''}`,
                      `Size: ${formatBytes(Number(currentFile.sizeBytes ?? 0))}`,
                      `SHA256: ${currentFile.sha256 ?? ''}`,
                      `Path: ${currentFile.relativePath ?? ''}`,
                    ].join('\n')}
                    multiline
                    minRows={6}
                    fullWidth
                    InputProps={{ readOnly: true }}
                  />
                </>
              ) : null}
            </Stack>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
};

export default FileTransferTest;
