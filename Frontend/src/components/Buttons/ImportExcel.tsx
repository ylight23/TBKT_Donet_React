import React, { useState, useRef, ChangeEvent } from 'react';
import { Button, ButtonProps } from '@mui/material';
import { Upload } from '@mui/icons-material';
import * as XLSX from 'xlsx';
import notify from '../../utils/notification';

interface ValidationResult {
    valid: boolean;
    error?: string;
}

interface ImportResult {
    success: boolean;
    message?: string;
    details?: object;
    errors?: string[];
}

interface ImportExcelProps {
    onImport: (data: any[]) => Promise<ImportResult>;
    onImportSuccess?: (result: ImportResult) => Promise<void> | void;
    validateRow?: (row: any) => ValidationResult;
    disabled?: boolean;
    buttonText?: string;
    buttonProps?: ButtonProps;
    maxRows?: number;
}

const ImportExcel: React.FC<ImportExcelProps> = ({
    onImport,
    onImportSuccess,
    validateRow,
    disabled = false,
    buttonText = 'Nhập Excel',
    buttonProps = {},
    maxRows = 3000,
}) => {
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = (): void => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsImporting(true);
            console.log('[ImportExcel] Starting import from file:', file.name);

            // Validate file type
            const validExtensions = ['.xlsx', '.xls'];
            const fileExtension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();

            if (!validExtensions.includes(fileExtension)) {
                notify.error('Vui lòng chọn file Excel (.xlsx hoặc .xls)');
                return;
            }

            // Read file
            const fileData = await file.arrayBuffer();
            const workbook = XLSX.read(fileData, { type: 'array' });

            // Get first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];

            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                defval: '',  // Default value for empty cells
                blankrows: false  // Skip blank rows
            });

            console.log('[ImportExcel] Parsed', jsonData.length, 'rows from sheet:', firstSheetName);

            // Validate data
            if (jsonData.length === 0) {
                notify.warn('File Excel không có dữ liệu');
                return;
            }

            if (jsonData.length > maxRows) {
                notify.error(`File có quá nhiều dòng. Tối đa ${maxRows} dòng.`);
                return;
            }

            // Validate rows if validator provided
            if (validateRow) {
                const validationErrors: string[] = [];

                jsonData.forEach((row, index) => {
                    const validation = validateRow(row);
                    if (!validation.valid) {
                        validationErrors.push(`Dòng ${index + 2}: ${validation.error}`);
                    }
                });

                if (validationErrors.length > 0) {
                    const errorMsg = validationErrors.slice(0, 3).join('\n');
                    notify.error(`Có ${validationErrors.length} lỗi validation:\n${errorMsg}`);
                    console.error('[ImportExcel] Validation errors:', validationErrors);
                    return;
                }
            }

            // Call import handler
            if (!onImport) {
                notify.error('Chưa định nghĩa hàm xử lý import');
                return;
            }

            console.log('[ImportExcel] Calling import handler with', jsonData.length, 'rows');
            const result = await onImport(jsonData);

            console.log('[ImportExcel] Import result:', result);

            // Handle result
            if (result?.success) {
                const successMsg = result.message || `Import thành công ${jsonData.length} bản ghi`;
                notify.success(successMsg);

                // Log details if available
                if (result.details) {
                    console.log('[ImportExcel] Import details:', result.details);
                }

                // Trigger success callback
                if (onImportSuccess) {
                    console.log('[ImportExcel] Calling success callback');
                    await onImportSuccess(result);
                }
            } else {
                const errorMsg = result?.message || 'Import thất bại';
                notify.error(errorMsg);

                if (result?.errors) {
                    console.error('[ImportExcel] Import errors:', result.errors);
                }
            }

        } catch (error) {
            console.error('[ImportExcel] Import exception:', error);
            notify.error('Lỗi khi import file Excel: ' + (error as Error).message);
        } finally {
            setIsImporting(false);

            // Reset file input to allow re-importing same file
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    return (
        <>
            <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                style={{ display: 'none' }}
                onChange={handleFileChange}
            />

            <Button
                variant="contained"
                color="primary"
                startIcon={<Upload />}
                onClick={handleImportClick}
                disabled={isImporting || disabled}
                {...buttonProps}
            >
                {buttonText}
            </Button>
        </>
    );
};

export default ImportExcel;
