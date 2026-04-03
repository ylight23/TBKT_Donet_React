import React, { useState } from 'react';
import Button       from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import type { ButtonProps } from '@mui/material/Button';
import Download from '@mui/icons-material/Download';
import notify from '../../utils/notification';



type ColumnMapping = Record<string, string | ((item: any) => any)>;

interface ExportExcelProps {
    data?:          any[];
    columnMapping?: ColumnMapping;
    fileName?:      string;
    sheetName?:     string;
    disabled?:      boolean;
    buttonText?:    string;
    buttonProps?:   ButtonProps;
}

const ExportExcel: React.FC<ExportExcelProps> = ({
    data = [],
    columnMapping = {},
    fileName  = 'Export',
    sheetName = 'Data',
    disabled  = false,
    buttonText  = 'Xuất Excel',
    buttonProps = {},
}) => {
    const [isExporting, setIsExporting] = useState(false);

    const handleExport = async (): Promise<void> => {
        try {
            setIsExporting(true);

            if (!data || data.length === 0) { notify.warn('Không có dữ liệu để xuất'); return; }
            if (!columnMapping || Object.keys(columnMapping).length === 0) { notify.error('Chưa định nghĩa cột để xuất'); return; }

            // ✅ Conditional load: chỉ load xlsx (~800KB) khi user click Export
            if (typeof window === 'undefined') return;
            const XLSX = await import('xlsx');   // ← load on demand

            // Pre-compute nested key paths một lần (tránh split lặp lại per row)
            const columnEntries = Object.entries(columnMapping).map(([excelCol, dataKey]) => ({
                excelCol,
                dataKey,
                nestedKeys: typeof dataKey === 'string' && dataKey.includes('.')
                    ? dataKey.split('.')
                    : null,
            }));

            const exportData = data.map((item, index) => {
                const row: Record<string, any> = { 'STT': index + 1 };
                columnEntries.forEach(({ excelCol, dataKey, nestedKeys }) => {
                    let value: any;
                    if (nestedKeys) {
                        value = nestedKeys.reduce((obj: any, key) => obj?.[key], item);
                    } else if (typeof dataKey === 'function') {
                        value = dataKey(item);
                    } else {
                        value = item[dataKey as string];
                    }
                    if (typeof value === 'boolean')                    row[excelCol] = value ? 'Có' : 'Không';
                    else if (value === null || value === undefined)     row[excelCol] = '';
                    else if (value instanceof Date)                     row[excelCol] = value.toLocaleDateString('vi-VN');
                    else                                                row[excelCol] = value;
                });
                return row;
            });

            const ws = XLSX.utils.json_to_sheet(exportData);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, sheetName);

            const colWidths: { wch: number }[] = [{ wch: 5 }];
            Object.keys(columnMapping).forEach(header => {
                // ✅ Rule: loop thay vì Math.max(...array) — tránh spread overhead + array allocation
                let maxLength = header.length;
                const sampleRows = exportData.slice(0, 100);
                for (let i = 0; i < sampleRows.length; i++) {
                    const len = String(sampleRows[i][header] || '').length;
                    if (len > maxLength) maxLength = len;
                }
                colWidths.push({ wch: Math.min(Math.max(maxLength + 2, 10), 50) });
            });
            ws['!cols'] = colWidths;

            const timestamp    = new Date().toISOString().split('T')[0];
            const fullFileName = `${fileName}_${timestamp}.xlsx`;
            XLSX.writeFile(wb, fullFileName);

            notify.success(`Đã xuất ${data.length} bản ghi ra file ${fullFileName}`);
        } catch (error) {
            notify.error('Lỗi khi xuất file Excel: ' + (error as Error).message);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <Button
            variant="contained" color="success"
            startIcon={isExporting ? <CircularProgress size={16} /> : <Download />}
            onClick={handleExport}
            disabled={isExporting || disabled || !data || data.length === 0}
            {...buttonProps}
        >
            {buttonText}
        </Button>
    );
};

export default ExportExcel;
