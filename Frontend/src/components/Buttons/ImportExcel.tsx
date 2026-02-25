import React, { useState, useRef, ChangeEvent } from 'react';
import Button from '@mui/material/Button';
import type { ButtonProps } from '@mui/material/Button';
import Upload from '@mui/icons-material/Upload';
import notify from '../../utils/notification';

interface ValidationResult { valid: boolean; error?: string; }
interface ImportResult { success: boolean; message?: string; details?: object; errors?: string[]; }
interface ImportExcelProps {
    onImport:          (data: any[]) => Promise<ImportResult>;
    onImportSuccess?:  (result: ImportResult) => Promise<void> | void;
    validateRow?:      (row: any) => ValidationResult;
    disabled?:         boolean;
    buttonText?:       string;
    buttonProps?:      ButtonProps;
    maxRows?:          number;
}

const ImportExcel: React.FC<ImportExcelProps> = ({
    onImport, onImportSuccess, validateRow,
    disabled = false, buttonText = 'Nhập Excel',
    buttonProps = {}, maxRows = 3000,
}) => {
    const [isImporting, setIsImporting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImportClick = (): void => { fileInputRef.current?.click(); };

    const handleFileChange = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            setIsImporting(true);

            const validExtensions = ['.xlsx', '.xls'];
            const fileExtension   = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
            if (!validExtensions.includes(fileExtension)) { notify.error('Vui lòng chọn file Excel (.xlsx hoặc .xls)'); return; }

            // ✅ Conditional load: chỉ load xlsx (~800KB) khi user chọn file
            if (typeof window === 'undefined') return;
            const XLSX = await import('xlsx');   // ← load on demand

            const fileData    = await file.arrayBuffer();
            const workbook    = XLSX.read(fileData, { type: 'array' });
            const worksheet   = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData    = XLSX.utils.sheet_to_json(worksheet, { defval: '', blankrows: false });

            if (jsonData.length === 0)       { notify.warn('File Excel không có dữ liệu'); return; }
            if (jsonData.length > maxRows)   { notify.error(`File có quá nhiều dòng. Tối đa ${maxRows} dòng.`); return; }

            if (validateRow) {
                const validationErrors: string[] = [];
                jsonData.forEach((row, index) => {
                    const validation = validateRow(row);
                    if (!validation.valid) validationErrors.push(`Dòng ${index + 2}: ${validation.error}`);
                });
                if (validationErrors.length > 0) {
                    notify.error(`Có ${validationErrors.length} lỗi:\n${validationErrors.slice(0, 3).join('\n')}`);
                    return;
                }
            }

            const result = await onImport(jsonData);

            if (result?.success) {
                notify.success(result.message || `Import thành công ${jsonData.length} bản ghi`);
                if (onImportSuccess) await onImportSuccess(result);
            } else {
                notify.error(result?.message || 'Import thất bại');
            }
        } catch (error) {
            notify.error('Lỗi khi import file Excel: ' + (error as Error).message);
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    return (
        <>
            <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={handleFileChange} />
            <Button variant="contained" color="primary" startIcon={<Upload />}
                onClick={handleImportClick} disabled={isImporting || disabled} {...buttonProps}>
                {buttonText}
            </Button>
        </>
    );
};

export default ImportExcel;
